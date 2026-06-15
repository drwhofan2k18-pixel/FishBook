import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface HeatmapCell {
  grid_lat: number;
  grid_lng: number;
  catch_count: number;
  user_count: number;
  top_species: string[];
  avg_weight_kg: number | null;
  avg_rating: number;
}

const GRID_PRECISION = 0.02;
const MIN_CATCHES = 3;
const MIN_USERS = 2;

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const minLat = parseFloat(url.searchParams.get('minLat') ?? '-90');
    const maxLat = parseFloat(url.searchParams.get('maxLat') ?? '90');
    const minLng = parseFloat(url.searchParams.get('minLng') ?? '-180');
    const maxLng = parseFloat(url.searchParams.get('maxLng') ?? '180');
    const species = url.searchParams.get('species') ?? null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('catches')
      .select('latitude, longitude, user_id, weight_kg, species:final_species_id (common_name)')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLng)
      .lte('longitude', maxLng)
      .limit(10000);

    if (species) {
      query = query.eq('species.common_name', species);
    }

    const { data: catches, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const gridMap = new Map<string, {
      lat: number;
      lng: number;
      userIds: Set<string>;
      weights: number[];
      species: Map<string, number>;
    }>();

    for (const c of catches ?? []) {
      const gridLat = Math.round(c.latitude / GRID_PRECISION) * GRID_PRECISION;
      const gridLng = Math.round(c.longitude / GRID_PRECISION) * GRID_PRECISION;
      const key = `${gridLat}_${gridLng}`;

      if (!gridMap.has(key)) {
        gridMap.set(key, {
          lat: gridLat,
          lng: gridLng,
          userIds: new Set(),
          weights: [],
          species: new Map(),
        });
      }

      const cell = gridMap.get(key)!;
      cell.userIds.add(c.user_id);
      if (c.weight_kg) cell.weights.push(c.weight_kg);

      const speciesName = (c.species as { common_name: string } | null)?.common_name;
      if (speciesName) {
        cell.species.set(speciesName, (cell.species.get(speciesName) ?? 0) + 1);
      }
    }

    const cells: HeatmapCell[] = [];

    for (const cell of gridMap.values()) {
      if (cell.userIds.size < MIN_USERS) continue;
      if (cell.userIds.size + cell.weights.length < MIN_CATCHES) continue;

      const topSpecies = Array.from(cell.species.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      const avgWeight = cell.weights.length > 0
        ? Math.round((cell.weights.reduce((a, b) => a + b, 0) / cell.weights.length) * 100) / 100
        : null;

      const totalCatches = cell.userIds.size + cell.weights.length;

      cells.push({
        grid_lat: cell.lat,
        grid_lng: cell.lng,
        catch_count: totalCatches,
        user_count: cell.userIds.size,
        top_species: topSpecies,
        avg_weight_kg: avgWeight,
        avg_rating: Math.min(totalCatches / 10, 1),
      });
    }

    return new Response(JSON.stringify({ cells, total: cells.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
