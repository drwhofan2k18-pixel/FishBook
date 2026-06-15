import { supabase } from './supabase';
import type { IdentificationMatch } from './catch-store';
import { isOnline } from './sync-engine';
import { identifyFishOnDevice } from './ondevice-id';

export interface IdentifyFishResult {
  matches: IdentificationMatch[];
  error: string | null;
  isUsingOnDevice: boolean;
}

export async function identifyFish(photoUrl: string): Promise<IdentifyFishResult> {
  const online = await isOnline();

  if (!online) {
    const onDeviceResult = await identifyFishOnDevice(photoUrl);
    if (onDeviceResult.matches.length > 0) {
      return {
        matches: onDeviceResult.matches.map((m) => ({ ...m, confidence: m.confidence * 0.8 })),
        error: null,
        isUsingOnDevice: true,
      };
    }
    return { matches: [], error: 'No internet connection and on-device model unavailable', isUsingOnDevice: false };
  }

  try {
    const { data, error } = await supabase.functions.invoke('identify-fish', {
      body: { photoUrl },
    });

    if (error) {
      const onDeviceResult = await identifyFishOnDevice(photoUrl);
      if (onDeviceResult.matches.length > 0) {
        return {
          matches: onDeviceResult.matches.map((m) => ({ ...m, confidence: m.confidence * 0.8 })),
          error: null,
          isUsingOnDevice: true,
        };
      }
      return { matches: [], error: `Identification failed: ${error.message}`, isUsingOnDevice: false };
    }

    if (data?.error) {
      return { matches: [], error: data.error, isUsingOnDevice: false };
    }

    return {
      matches: data?.matches ?? [],
      error: null,
      isUsingOnDevice: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { matches: [], error: `Failed to identify fish: ${message}`, isUsingOnDevice: false };
  }
}

export interface WeightEstimateResult {
  weightKg: number;
  minWeightKg: number;
  maxWeightKg: number;
  lengthCm: number;
  method: 'estimated_species';
}

export async function estimateWeight(
  speciesId: number,
  lengthCm: number,
): Promise<WeightEstimateResult | { error: string }> {
  const online = await isOnline();

  if (!online) {
    const { searchSpeciesCache } = await import('./offline-db');
    const results = searchSpeciesCache('');
    const localSpecies = results.find((s: Record<string, unknown>) => s.id === speciesId);
    if (localSpecies?.lw_a && localSpecies?.lw_b) {
      const a = localSpecies.lw_a as number;
      const b = localSpecies.lw_b as number;
      const weightKg = a * Math.pow(lengthCm, b);
      return {
        weightKg: Math.round(weightKg * 100) / 100,
        minWeightKg: Math.round(weightKg * 0.8 * 100) / 100,
        maxWeightKg: Math.round(weightKg * 1.2 * 100) / 100,
        lengthCm,
        method: 'estimated_species',
      };
    }
    return { error: 'Species not found in local cache' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('estimate-weight', {
      body: { speciesId, lengthCm },
    });

    if (error) {
      return { error: `Weight estimation failed: ${error.message}` };
    }

    return data as WeightEstimateResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Failed to estimate weight: ${message}` };
  }
}
