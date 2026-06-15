// Supabase Edge Function: estimate-weight
// Calculates fish weight from length using FishBase formula: W = a * L^b

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

serve(async (req: Request) => {
  try {
    const { speciesId, lengthCm } = (await req.json()) as EstimateRequest;

    if (!speciesId || !lengthCm) {
      return new Response(
        JSON.stringify({ error: 'speciesId and lengthCm are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (lengthCm <= 0) {
      return new Response(
        JSON.stringify({ error: 'lengthCm must be positive' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Get species length-weight parameters
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: species, error: speciesError } = await supabase
      .from('species')
      .select('lw_a, lw_b, family')
      .eq('id', speciesId)
      .single();

    if (speciesError || !species) {
      return new Response(
        JSON.stringify({ error: 'Species not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      );
    }

    let a = species.lw_a;
    let b = species.lw_b;

    // Fallback if species lacks parameters: use family default or generic
    if (a == null || b == null) {
      // Attempt to get family average
      const { data: familyAvg } = await supabase
        .from('species')
        .select('lw_a, lw_b')
        .eq('family', species.family)
        .not('lw_a', 'is', null)
        .not('lw_b', 'is', null)
        .limit(10);

      if (familyAvg && familyAvg.length > 0) {
        const sumA = familyAvg.reduce((acc, s) => acc + (s.lw_a ?? 0), 0);
        const sumB = familyAvg.reduce((acc, s) => acc + (s.lw_b ?? 0), 0);
        a = sumA / familyAvg.length;
        b = sumB / familyAvg.length;
      } else {
        // Generic default for fish
        a = 0.00001;
        b = 3.00;
      }
    }

    // Calculate W = a * L^b
    const weightKg = a * Math.pow(lengthCm, b);

    const response: EstimateResponse = {
      weightKg: Math.round(weightKg * 100) / 100,
      minWeightKg: Math.round(weightKg * 0.8 * 100) / 100,
      maxWeightKg: Math.round(weightKg * 1.2 * 100) / 100,
      lengthCm,
      method: 'estimated_species',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('estimate-weight error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
