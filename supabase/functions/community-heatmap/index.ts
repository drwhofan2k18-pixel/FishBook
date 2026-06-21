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
const RATE_LIMIT = 30;
const RATE_WINDOW = 60;

function clampLat(v: number): number {
  return Math.max(-90, Math.min(90, v));
}

function clampLng(v: number): number {
  return Math.max(-180, Math.min(180, v));
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '0.0.0.0';
}

async function checkRateLimit(
  supabaseUrl: string,
  serviceKey: string,
  ip: string,
  endpoint: string,
  maxRequests: number,
): Promise<boolean> {
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_ip: ip,
        p_endpoint: endpoint,
        p_max_requests: maxRequests,
        p_window_seconds: RATE_WINDOW,
      }),
    });
    const result = await resp.json();
    return result === true;
  } catch {
    return true;
  }
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const rawMinLat = parseFloat(url.searchParams.get('minLat') ?? '-90');
    const rawMaxLat = parseFloat(url.searchParams.get('maxLat') ?? '90');
    const rawMinLng = parseFloat(url.searchParams.get('minLng') ?? '-180');
    const rawMaxLng = parseFloat(url.searchParams.get('maxLng') ?? '180');
    const species = url.searchParams.get('species') ?? undefined;

    if ([rawMinLat, rawMaxLat, rawMinLng, rawMaxLng].some(v => !Number.isFinite(v))) {
      return new Response(JSON.stringify({ error: 'Invalid coordinate values' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const minLat = clampLat(rawMinLat);
    const maxLat = clampLat(rawMaxLat);
    const minLng = clampLng(rawMinLng);
    const maxLng = clampLng(rawMaxLng);

    if (species && species.length > 100) {
      return new Response(JSON.stringify({ error: 'Species filter too long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const clientIp = getClientIp(req);

    const allowed = await checkRateLimit(supabaseUrl, serviceKey, clientIp, 'community-heatmap', RATE_LIMIT);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');

    const { data: catches, error } = await supabase
      .from('catches')
      .select(`
        latitude,
        longitude,
        weight_kg,
        rating,
        species:species_id (common_name)
      `)
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLng)
      .lte('longitude', maxLng)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(5000);

    if (error) {
      console.error('Heatmap query error:', error);
      return new Response(JSON.stringify({ error: 'Database query failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const grid = new Map<string, {
      lat: number;
      lng: number;
      catches: number;
      users: Set<string>;
      species: Map<string, number>;
      weights: number[];
      ratings: number[];
    }>();

    for (const c of catches ?? []) {
      const gridLat = Math.round(c.latitude / GRID_PRECISION) * GRID_PRECISION;
      const gridLng = Math.round(c.longitude / GRID_PRECISION) * GRID_PRECISION;
      const key = `${gridLat},${gridLng}`;

      if (!grid.has(key)) {
        grid.set(key, {
          lat: gridLat,
          lng: gridLng,
          catches: 0,
          users: new Set(),
          species: new Map(),
          weights: [],
          ratings: [],
        });
      }

      const cell = grid.get(key)!;
      cell.catches++;
      if (c.weight_kg) cell.weights.push(c.weight_kg);
      if (c.rating) cell.ratings.push(c.rating);

      const speciesName = (c.species as any)?.common_name ?? 'Unknown';
      cell.species.set(speciesName, (cell.species.get(speciesName) ?? 0) + 1);
    }

    const cells: HeatmapCell[] = [];
    for (const cell of grid.values()) {
      if (cell.catches < MIN_CATCHES) continue;

      const topSpecies = [...cell.species.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      cells.push({
        grid_lat: Math.round(cell.lat * 10000) / 10000,
        grid_lng: Math.round(cell.lng * 10000) / 10000,
        catch_count: cell.catches,
        user_count: cell.users.size,
        top_species: topSpecies,
        avg_weight_kg: cell.weights.length > 0
          ? Math.round((cell.weights.reduce((s, w) => s + w, 0) / cell.weights.length) * 100) / 100
          : null,
        avg_rating: cell.ratings.length > 0
          ? Math.round((cell.ratings.reduce((s, r) => s + r, 0) / cell.ratings.length) * 10) / 10
          : 0,
      });
    }

    return new Response(JSON.stringify({ cells, total_catches: catches?.length ?? 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('community-heatmap error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
