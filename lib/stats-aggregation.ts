import { supabase } from './supabase';

export interface UserStats {
  totalCatches: number;
  uniqueSpecies: number;
  biggestFishKg: number | null;
  biggestFishSpecies: string | null;
  biggestFishId: string | null;
  totalWeightKg: number;
  freshwaterCount: number;
  saltwaterCount: number;
  releasedCount: number;
  biggestPhotoUrl: string | null;
}

export interface SpeciesCount {
  species_id: number;
  common_name: string;
  scientific_name: string;
  count: number;
  habitat: string;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const { data: catches, error } = await supabase
    .from('catches')
    .select(`
      id,
      weight_kg,
      is_released,
      photo_url,
      species:final_species_id (
        common_name,
        habitat
      )
    `)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  if (!catches || catches.length === 0) {
    return {
      totalCatches: 0,
      uniqueSpecies: 0,
      biggestFishKg: null,
      biggestFishSpecies: null,
      biggestFishId: null,
      totalWeightKg: 0,
      freshwaterCount: 0,
      saltwaterCount: 0,
      releasedCount: 0,
      biggestPhotoUrl: null,
    };
  }

  const speciesSet = new Set<string>();
  let biggestWeight = 0;
  let biggestSpecies = '';
  let biggestId = '';
  let biggestPhoto = '';
  let totalWeight = 0;
  let freshCount = 0;
  let saltCount = 0;
  let released = 0;

  for (const c of catches) {
    const species = c.species as unknown as { common_name: string; habitat: string[] } | null;
    const name = species?.common_name ?? 'Unknown';

    speciesSet.add(name);
    totalWeight += c.weight_kg ?? 0;

    if (c.is_released) released++;

    const habitats = species?.habitat ?? [];
    if (habitats.includes('freshwater')) freshCount++;
    if (habitats.includes('saltwater')) saltCount++;

    if ((c.weight_kg ?? 0) > biggestWeight) {
      biggestWeight = c.weight_kg ?? 0;
      biggestSpecies = name;
      biggestId = c.id;
      biggestPhoto = c.photo_url ?? '';
    }
  }

  return {
    totalCatches: catches.length,
    uniqueSpecies: speciesSet.size,
    biggestFishKg: biggestWeight > 0 ? biggestWeight : null,
    biggestFishSpecies: biggestSpecies || null,
    biggestFishId: biggestId || null,
    totalWeightKg: Math.round(totalWeight * 100) / 100,
    freshwaterCount: freshCount,
    saltwaterCount: saltCount,
    releasedCount: released,
    biggestPhotoUrl: biggestPhoto || null,
  };
}

export async function getSpeciesBreakdown(userId: string): Promise<SpeciesCount[]> {
  const { data, error } = await supabase
    .from('catches')
    .select(`
      final_species_id,
      species:final_species_id (
        common_name,
        scientific_name,
        habitat
      )
    `)
    .eq('user_id', userId)
    .not('final_species_id', 'is', null);

  if (error) throw new Error(error.message);

  const countMap = new Map<string, SpeciesCount>();

  for (const c of data ?? []) {
    const species = c.species as unknown as {
      common_name: string;
      scientific_name: string;
      habitat: string[];
    } | null;
    if (!species) continue;

    const key = species.common_name;
    const existing = countMap.get(key);
    const habitat = species.habitat?.includes('saltwater') ? 'saltwater' : 'freshwater';

    if (existing) {
      existing.count++;
    } else {
      countMap.set(key, {
        species_id: c.final_species_id,
        common_name: species.common_name,
        scientific_name: species.scientific_name,
        count: 1,
        habitat,
      });
    }
  }

  return Array.from(countMap.values()).sort((a, b) => b.count - a.count);
}

export async function getRecentCatches(userId: string, limit = 5) {
  const { data, error } = await supabase
    .from('catches')
    .select(`
      id,
      weight_kg,
      length_cm,
      photo_thumbnail_url,
      latitude,
      longitude,
      location_name,
      caught_at,
      is_released,
      species:final_species_id (
        common_name,
        scientific_name
      )
    `)
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateProfile(
  userId: string,
  updates: { display_name?: string; bio?: string; home_waters?: string; avatar_url?: string },
) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw new Error(error.message);
}
