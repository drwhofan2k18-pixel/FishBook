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

serve(async (req: Request) => {
  try {
    const { photoUrl } = (await req.json()) as IdentifyRequest;

    if (!photoUrl) {
      return new Response(JSON.stringify({ matches: [], error: 'photoUrl is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Download image from Supabase Storage
    const imageResponse = await fetch(photoUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ matches: [], error: 'Failed to download image from storage' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const imageBlob = await imageResponse.blob();
    const base64 = await blobToBase64(imageBlob);

    // Call iNaturalist CV API
    const inaturalistResponse = await fetch(INATURALIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        image: base64,
      }),
    });

    if (!inaturalistResponse.ok) {
      const errorText = await inaturalistResponse.text();
      console.error('iNaturalist API error:', inaturalistResponse.status, errorText);
      return new Response(
        JSON.stringify({
          matches: [],
          error: `iNaturalist API returned ${inaturalistResponse.status}`,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const inaturalistData = await inaturalistResponse.json();

    if (!inaturalistData?.results || !Array.isArray(inaturalistData.results)) {
      return new Response(
        JSON.stringify({ matches: [], error: 'Unexpected response from iNaturalist API' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Extract top results and map to local species
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const matches: MatchResult[] = [];

    for (const result of inaturalistData.results.slice(0, 5)) {
      const taxon = result.taxon;
      if (!taxon) continue;

      const scientificName = taxon.name;
      const commonName = taxon.preferred_common_name ?? taxon.name;

      // Try to match to local species table
      let speciesId: number | null = null;
      try {
        const { data: speciesData } = await supabase
          .from('species')
          .select('id')
          .eq('scientific_name', scientificName)
          .maybeSingle();

        if (speciesData) {
          speciesId = speciesData.id;
        }
      } catch {
        // Species matching is best-effort
      }

      matches.push({
        species_id: speciesId,
        common_name: commonName,
        scientific_name: scientificName,
        confidence: result.score ?? 0,
        iNaturalistTaxonId: taxon.id,
        image_url: taxon?.default_photo?.medium_url ?? '',
      });
    }

    const response: IdentifyResponse = {
      matches,
      error: null,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('identify-fish error:', message);
    return new Response(JSON.stringify({ matches: [], error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
