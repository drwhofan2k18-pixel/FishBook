// Supabase Edge Function: identify-fish
// Calls iNaturalist Computer Vision API and maps results to local species database

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MatchResult {
  species_id: number | null;
  common_name: string;
  scientific_name: string;
  confidence: number;
  iNaturalistTaxonId: number;
  image_url: string;
}

interface IdentifyRequest {
  photoUrl: string;
}

interface IdentifyResponse {
  matches: MatchResult[];
  error: string | null;
}

const INATURALIST_API = 'https://api.inaturalist.org/v1/computervision/score_image';
const MAX_URL_LENGTH = 2048;
const ALLOWED_HOSTS = [
  'supabase.co',
  'tybkfzdkjvedashszsjc.supabase.co',
];
const RATE_LIMIT = 15;
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

function validatePhotoUrl(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== 'string') return 'photoUrl is required';
  if (urlStr.length > MAX_URL_LENGTH) return 'photoUrl too long';

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return 'Invalid URL format';
  }

  if (url.protocol !== 'https:') return 'Only HTTPS URLs allowed';
  const host = url.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOSTS.some(h => host === h || host.endsWith('.' + h));
  if (!isAllowed) return 'URL host not in allowlist';

  return null;
}

serve(async (req: Request) => {
  try {
    const body = await req.json() as IdentifyRequest;
    const { photoUrl } = body;

    const urlError = validatePhotoUrl(photoUrl);
    if (urlError) {
      return new Response(JSON.stringify({ error: urlError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const clientIp = getClientIp(req);

    const allowed = await checkRateLimit(supabaseUrl, serviceKey, clientIp, 'identify-fish', RATE_LIMIT);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const inatKey = Deno.env.get('INATURALIST_API_KEY') ?? '';
    if (!inatKey) {
      return new Response(JSON.stringify({ error: 'iNaturalist API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageResp = await fetch(photoUrl);
    if (!imageResp.ok) {
      return new Response(JSON.stringify({ error: 'Could not fetch image from URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const imageBuffer = await imageResp.arrayBuffer();

    if (imageBuffer.byteLength > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image exceeds 10MB limit' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer]), 'photo.jpg');
    formData.append('locale', 'en');

    const inatResp = await fetch(INATURALIST_API, {
      method: 'POST',
      headers: { 'Authorization': inatKey },
      body: formData,
    });

    if (!inatResp.ok) {
      const errorText = await inatResp.text();
      console.error(`iNaturalist API error: ${inatResp.status} - ${errorText}`);
      return new Response(JSON.stringify({ error: 'Fish identification service unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const inatData = await inatResp.json();
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '');

    const topResults = (inatData.results ?? []).slice(0, 5);
    const matches: MatchResult[] = [];

    for (const r of topResults) {
      const taxon = r.taxon;
      if (!taxon) continue;

      const scientificName = taxon.name ?? '';
      const commonName = taxon.preferred_common_name ?? taxon.name ?? 'Unknown';
      const confidence = r.combined_score ?? r.vision_score ?? 0;
      const taxonId = taxon.id;
      const imageUrl = taxon.default_photo?.medium_url ?? taxon.default_photo?.url ?? '';

      const { data: species } = await supabase
        .from('species')
        .select('id, common_name, scientific_name')
        .or(`scientific_name.eq.${scientificName},common_name.ilike.%${commonName}%`)
        .limit(1)
        .single();

      matches.push({
        species_id: species?.id ?? null,
        common_name: species?.common_name ?? commonName,
        scientific_name: species?.scientific_name ?? scientificName,
        confidence,
        iNaturalistTaxonId: taxonId,
        image_url: imageUrl,
      });
    }

    const response: IdentifyResponse = { matches, error: null };
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('identify-fish error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
