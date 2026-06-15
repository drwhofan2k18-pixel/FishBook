import { supabase } from './supabase';

export interface CatchLocation {
  id: string;
  latitude: number;
  longitude: number;
  species_name: string | null;
  weight_kg: number | null;
  caught_at: string;
  water_body: string | null;
}

export interface SpotCluster {
  center_lat: number;
  center_lng: number;
  radius_km: number;
  catch_count: number;
  species: string[];
  avg_weight_kg: number | null;
  best_time: string | null;
  water_body: string | null;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getUserCatchLocations(userId: string): Promise<CatchLocation[]> {
  const { data, error } = await supabase
    .from('catches')
    .select(`
      id,
      latitude,
      longitude,
      weight_kg,
      caught_at,
      water_body,
      species:final_species_id (common_name)
    `)
    .eq('user_id', userId)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: c.id,
    latitude: c.latitude,
    longitude: c.longitude,
    weight_kg: c.weight_kg,
    caught_at: c.caught_at,
    water_body: c.water_body,
    species_name: (c.species as unknown as { common_name: string })?.common_name ?? null,
  }));
}

export function clusterCatchLocations(
  locations: CatchLocation[],
  clusterRadiusKm: number = 5,
): SpotCluster[] {
  if (locations.length === 0) return [];

  const assigned = new Set<string>();
  const clusters: SpotCluster[] = [];

  for (const loc of locations) {
    if (assigned.has(loc.id)) continue;

    const clusterCatches = locations.filter((other) => {
      if (assigned.has(other.id)) return false;
      return haversineDistance(loc.latitude, loc.longitude, other.latitude, other.longitude) <= clusterRadiusKm;
    });

    if (clusterCatches.length < 2) continue;

    for (const c of clusterCatches) assigned.add(c.id);

    const sumLat = clusterCatches.reduce((a, c) => a + c.latitude, 0);
    const sumLng = clusterCatches.reduce((a, c) => a + c.longitude, 0);
    const weights = clusterCatches.filter((c) => c.weight_kg != null).map((c) => c.weight_kg!);
    const speciesSet = new Set(clusterCatches.map((c) => c.species_name).filter(Boolean));

    const hours = clusterCatches.map((c) => new Date(c.caught_at).getHours());
    const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    const bestTime = `${avgHour.toString().padStart(2, '0')}:00`;

    clusters.push({
      center_lat: sumLat / clusterCatches.length,
      center_lng: sumLng / clusterCatches.length,
      radius_km: clusterRadiusKm,
      catch_count: clusterCatches.length,
      species: Array.from(speciesSet) as string[],
      avg_weight_kg: weights.length > 0
        ? Math.round((weights.reduce((a, b) => a + b, 0) / weights.length) * 100) / 100
        : null,
      best_time: bestTime,
      water_body: clusterCatches[0].water_body ?? null,
    });
  }

  return clusters.sort((a, b) => b.catch_count - a.catch_count);
}

export async function getRecommendedSpots(
  userId: string,
): Promise<SpotCluster[]> {
  const locations = await getUserCatchLocations(userId);
  return clusterCatchLocations(locations);
}
