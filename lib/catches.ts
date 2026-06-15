import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface CatchRecord {
  id: string;
  user_id: string;
  species_id: number | null;
  ai_species_id: number | null;
  ai_confidence: number | null;
  user_confirmed_species_id: number | null;
  final_species_id: number | null;
  weight_kg: number | null;
  weight_method: string | null;
  length_cm: number | null;
  length_type: string | null;
  photo_url: string;
  photo_thumbnail_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  water_body: string | null;
  caught_at: string;
  weather_conditions: Record<string, unknown> | null;
  notes: string | null;
  is_released: boolean | null;
  created_at: string;
  // Joined fields
  species?: {
    common_name: string;
    scientific_name: string;
    family: string;
    image_url: string | null;
  } | null;
}

export interface CatchesFilters {
  search?: string;
  speciesId?: number;
  habitat?: string;
  sortBy?: 'date' | 'weight' | 'species';
  sortOrder?: 'asc' | 'desc';
}

const PAGE_SIZE = 20;

function buildCatchQuery(filters: CatchesFilters) {
  let query = supabase
    .from('catches')
    .select(`
      *,
      species:final_species_id (
        common_name,
        scientific_name,
        family,
        image_url
      )
    `);

  // Search
  if (filters.search) {
    query = query.or(
      `location_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`,
    );
  }

  if (filters.speciesId) {
    query = query.eq('final_species_id', filters.speciesId);
  }

  if (filters.habitat) {
    query = query.contains('species.habitat', [filters.habitat]);
  }

  // Sorting
  switch (filters.sortBy ?? 'date') {
    case 'date':
      query = query.order('caught_at', { ascending: filters.sortOrder === 'asc' });
      break;
    case 'weight':
      query = query.order('weight_kg', { ascending: filters.sortOrder === 'asc', nullsFirst: false });
      break;
    case 'species':
      // Will sort client-side via species name
      query = query.order('caught_at', { ascending: false });
      break;
  }

  return query;
}

export function useCatches(filters: CatchesFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['catches', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const query = buildCatchQuery(filters).range(from, to);
      const { data, error, count } = await query;

      if (error) throw new Error(error.message);

      return {
        data: data as CatchRecord[],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        count,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 1000 * 30, // 30s
  });
}

export function useCatch(id: string) {
  return useQuery({
    queryKey: ['catch', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catches')
        .select(`
          *,
          species:final_species_id (
            common_name,
            scientific_name,
            family,
            image_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw new Error(error.message);
      return data as CatchRecord;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useUpdateCatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase
        .from('catches')
        .update(updates)
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
      queryClient.invalidateQueries({ queryKey: ['catch', variables.id] });
    },
  });
}

export function useDeleteCatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the catch to find photo URL
      const { data: catchData } = await supabase
        .from('catches')
        .select('photo_url')
        .eq('id', id)
        .single();

      // Delete from storage if photo exists
      if (catchData?.photo_url) {
        const path = catchData.photo_url.split('/').slice(-3).join('/');
        await supabase.storage.from('catch-photos').remove([path]);
      }

      // Delete the record
      const { error } = await supabase.from('catches').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
    },
  });
}

export async function searchSpeciesByName(query: string) {
  const { data, error } = await supabase
    .from('species')
    .select('id, common_name, scientific_name, family')
    .or(`common_name.ilike.%${query}%,scientific_name.ilike.%${query}%`)
    .limit(30);

  if (error) throw new Error(error.message);
  return data ?? [];
}

import { isOnline } from './sync-engine';
import { insertCatchOffline, updateCatchOffline, deleteCatchOffline, enqueueSync } from './offline-db';

export function useSaveCatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (catchData: {
      user_id: string;
      species_id: number;
      ai_species_id?: number;
      ai_confidence?: number | null;
      photo_url: string;
      weight_kg?: number | null;
      weight_method?: string;
      length_cm?: number | null;
      length_type?: string;
      latitude?: number | null;
      longitude?: number | null;
      location_name?: string | null;
      water_body?: string | null;
      caught_at: string;
      notes?: string | null;
      is_released?: boolean | null;
    }) => {
      const online = await isOnline();

      if (online) {
        const { data, error } = await supabase.from('catches').insert(catchData).select('id').single();
        if (error) throw new Error(error.message);
        return data;
      }

      const localId = crypto.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
      insertCatchOffline({
        id: localId,
        user_id: catchData.user_id,
        species_id: catchData.species_id,
        weight_kg: catchData.weight_kg ?? null,
        length_cm: catchData.length_cm ?? null,
        photo_uri_local: null,
        photo_url: catchData.photo_url,
        latitude: catchData.latitude ?? null,
        longitude: catchData.longitude ?? null,
        location_name: catchData.location_name ?? null,
        water_body: catchData.water_body ?? null,
        caught_at: catchData.caught_at,
        notes: catchData.notes ?? null,
        is_released: catchData.is_released ?? null,
      });

      enqueueSync('create', 'catches', localId, catchData);
      return { id: localId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catches'] });
    },
  });
}
