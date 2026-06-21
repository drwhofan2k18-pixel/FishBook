import { supabase } from './supabase';
import NetInfo from '@react-native-community/netinfo';
import { captureError } from './crash-reporting';
import { colors } from './theme';

export interface HeatmapCell {
  grid_lat: number;
  grid_lng: number;
  catch_count: number;
  user_count: number;
  top_species: string[];
  avg_weight_kg: number | null;
  avg_rating: number;
}

export interface HeatmapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface HeatmapResponse {
  cells: HeatmapCell[];
  total: number;
}

export async function fetchCommunityHeatmap(
  bounds: HeatmapBounds,
  species?: string,
): Promise<HeatmapCell[]> {
  const online = await NetInfo.fetch();
  if (!online.isConnected) return [];

  try {
    const params = new URLSearchParams({
      minLat: bounds.minLat.toFixed(4),
      maxLat: bounds.maxLat.toFixed(4),
      minLng: bounds.minLng.toFixed(4),
      maxLng: bounds.maxLng.toFixed(4),
    });

    if (species) params.set('species', species);

    const { data, error } = await supabase.functions.invoke('community-heatmap', {
      method: 'GET',
      body: Object.fromEntries(params.entries()) as Record<string, string>,
    });

    if (error) {
      captureError(error, { context: 'community-heatmap' });
      return [];
    }

    return (data?.cells ?? []) as HeatmapCell[];
  } catch {
    return [];
  }
}

export function getHeatColor(rating: number): string {
  if (rating >= 0.8) return colors.danger;
  if (rating >= 0.6) return colors.warning;
  if (rating >= 0.4) return 'colors.gold';
  if (rating >= 0.2) return colors.success;
  return colors.textSecondary;
}

export function getHeatOpacity(rating: number): number {
  return 0.3 + rating * 0.5;
}

export function getCellRadius(zoomLevel: number): number {
  const base = 400;
  return base / Math.pow(2, zoomLevel - 10);
}
