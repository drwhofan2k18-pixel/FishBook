import { supabase } from './supabase';

interface ExportRow {
  catch_id: string;
  species: string;
  scientific_name: string;
  weight_kg: number | null;
  length_cm: number | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  water_body: string | null;
  caught_at: string;
  is_released: boolean | null;
  month: number;
  year: number;
  region: string;
}

interface AnonymizedDataset {
  metadata: {
    generated_at: string;
    total_catches: number;
    unique_users: number;
    date_range: { from: string; to: string };
    license: string;
    format_version: string;
  };
  catches: AnonymizedCatch[];
  species_summary: SpeciesSummary[];
}

interface AnonymizedCatch {
  species: string;
  scientific_name: string;
  weight_kg: number | null;
  length_cm: number | null;
  grid_lat: number;
  grid_lng: number;
  month: number;
  year: number;
  is_released: boolean;
  habitat: string;
}

interface SpeciesSummary {
  species: string;
  scientific_name: string;
  count: number;
  avg_weight_kg: number | null;
  avg_length_cm: number | null;
  max_weight_kg: number | null;
  grid_cells: number;
}

const GRID_PRECISION = 0.05;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_PRECISION) * GRID_PRECISION;
}

function getRegion(lat: number, lng: number): string {
  if (lat >= 24 && lat <= 50 && lng >= -130 && lng <= -60) return 'North America';
  if (lat >= -55 && lat <= 15 && lng >= -80 && lng <= -35) return 'South America';
  if (lat >= 35 && lat <= 72 && lng >= -25 && lng <= 45) return 'Europe';
  if (lat >= -35 && lat <= 38 && lng >= -20 && lng <= 55) return 'Africa';
  if (lat >= -10 && lat <= 55 && lng >= 60 && lng <= 150) return 'Asia';
  if (lat >= -50 && lat <= -10 && lng >= 110 && lng <= 180) return 'Oceania';
  return 'Other';
}

export async function exportAnonymizedData(): Promise<AnonymizedDataset> {
  const { data: catches, error } = await supabase
    .from('catches')
    .select(`
      id,
      weight_kg,
      length_cm,
      latitude,
      longitude,
      location_name,
      water_body,
      caught_at,
      is_released,
      user_id,
      species:final_species_id (
        common_name,
        scientific_name,
        habitat
      )
    `)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) throw new Error(error.message);

  const userIds = new Set<string>();
  const anonymizedCatches: AnonymizedCatch[] = [];
  const speciesMap = new Map<string, {
    scientific_name: string;
    weights: number[];
    lengths: number[];
    max_weight: number;
    grids: Set<string>;
  }>();

  for (const c of catches ?? []) {
    const species = c.species as unknown as { common_name: string; scientific_name: string; habitat: string[] } | null;
    const speciesName = species?.common_name ?? 'Unknown';
    const sciName = species?.scientific_name ?? '';
    const habitat = species?.habitat?.includes('saltwater') ? 'saltwater' : 'freshwater';

    userIds.add(c.user_id);

    const gridLat = snapToGrid(c.latitude);
    const gridLng = snapToGrid(c.longitude);
    const caughtDate = new Date(c.caught_at);

    anonymizedCatches.push({
      species: speciesName,
      scientific_name: sciName,
      weight_kg: c.weight_kg,
      length_cm: c.length_cm,
      grid_lat: gridLat,
      grid_lng: gridLng,
      month: caughtDate.getMonth() + 1,
      year: caughtDate.getFullYear(),
      is_released: c.is_released ?? false,
      habitat,
    });

    if (!speciesMap.has(speciesName)) {
      speciesMap.set(speciesName, {
        scientific_name: sciName,
        weights: [],
        lengths: [],
        max_weight: 0,
        grids: new Set(),
      });
    }

    const sp = speciesMap.get(speciesName)!;
    if (c.weight_kg) {
      sp.weights.push(c.weight_kg);
      if (c.weight_kg > sp.max_weight) sp.max_weight = c.weight_kg;
    }
    if (c.length_cm) sp.lengths.push(c.length_cm);
    sp.grids.add(`${gridLat}_${gridLng}`);
  }

  const speciesSummary: SpeciesSummary[] = [];
  for (const [name, sp] of speciesMap) {
    speciesSummary.push({
      species: name,
      scientific_name: sp.scientific_name,
      count: sp.weights.length + sp.lengths.length,
      avg_weight_kg: sp.weights.length > 0
        ? Math.round((sp.weights.reduce((a, b) => a + b, 0) / sp.weights.length) * 100) / 100
        : null,
      avg_length_cm: sp.lengths.length > 0
        ? Math.round((sp.lengths.reduce((a, b) => a + b, 0) / sp.lengths.length) * 100) / 100
        : null,
      max_weight_kg: sp.max_weight > 0 ? sp.max_weight : null,
      grid_cells: sp.grids.size,
    });
  }

  const dates = catches?.map(c => new Date(c.caught_at)) ?? [];

  return {
    metadata: {
      generated_at: new Date().toISOString(),
      total_catches: anonymizedCatches.length,
      unique_users: userIds.size,
      date_range: {
        from: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))).toISOString() : '',
        to: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString() : '',
      },
      license: 'CC-BY-4.0',
      format_version: '1.0.0',
    },
    catches: anonymizedCatches,
    species_summary: speciesSummary.sort((a, b) => (b.count) - (a.count)),
  };
}

export function exportToGBIF(data: AnonymizedDataset): object {
  return {
    type: 'OCCURRENCE',
    license: data.metadata.license,
    publisher: 'FishBook',
    datasetKey: 'fishbook-citizen-science',
    citation: {
      title: 'FishBook Citizen Science Catch Data',
      issued: data.metadata.generated_at,
    },
    records: data.catches.map((c) => ({
      scientificName: c.scientific_name,
      decimalLatitude: c.grid_lat,
      decimalLongitude: c.grid_lng,
      eventDate: `${c.year}-${String(c.month).padStart(2, '0')}`,
      basisOfRecord: 'HUMAN_OBSERVATION',
      occurrenceStatus: c.is_released ? 'RELEASED' : 'KEPT',
      preparations: c.weight_kg ? `weight_kg:${c.weight_kg}` : undefined,
    })),
  };
}
