import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EstimateRequest {
  speciesId: number;
  lengthCm: number;
}

interface EstimateResponse {
  weightKg: number;
  minWeightKg: number;
  maxWeightKg: number;
  lengthCm: number;
  method: 'estimated_species';
}

const RATE_LIMIT = 30;
const RATE_WINDOW = 60;

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
    const body = (await req.json()) as EstimateRequest;
    const { speciesId, lengthCm } = body;

    if (!Number.isFinite(speciesId) || speciesId <= 0 || !Number.isInteger(speciesId)) {
      return new Response(JSON.stringify({ error: 'speciesId must be a positive integer' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!Number.isFinite(lengthCm) || lengthCm <= 0 || lengthCm > 500) {
      return new Response(JSON.stringify({ error: 'lengthCm must be between 0 and 500' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const clientIp = getClientIp(req);

    const allowed = await checkRateLimit(supabaseUrl, serviceKey, clientIp, 'estimate-weight', RATE_LIMIT);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('id, common_name, lw_a, lw_b')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return new Response(JSON.stringify({ error: 'Species not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!species.lw_a || !species.lw_b) {
      return new Response(JSON.stringify({ error: 'Length-weight data not available for this species' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const a = species.lw_a;
    const b = species.lw_b;
    const weightKg = a * Math.pow(lengthCm, b);
    const minWeightKg = a * 0.85 * Math.pow(lengthCm, b);
    const maxWeightKg = a * 1.15 * Math.pow(lengthCm, b);

    const response: EstimateResponse = {
      weightKg: Math.round(weightKg * 1000) / 1000,
      minWeightKg: Math.round(minWeightKg * 1000) / 1000,
      maxWeightKg: Math.round(maxWeightKg * 1000) / 1000,
      lengthCm,
      method: 'estimated_species',
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('estimate-weight error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
