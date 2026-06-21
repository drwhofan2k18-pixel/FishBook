import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const RATE_LIMIT = 20;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const clientIp = getClientIp(req);

    const allowed = await checkRateLimit(supabaseUrl, serviceKey, clientIp, 'fishing-chatbot', RATE_LIMIT);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { message, systemPrompt, context } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (message.length > 1000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 1000 chars)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!OPENAI_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt ?? 'You are FishBook AI, an expert fishing assistant. Be concise and practical.' },
          { role: 'user', content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiResp.ok) {
      const err = await openaiResp.text();
      console.error('OpenAI error:', openaiResp.status, err);
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await openaiResp.json();
    const response = data.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';

    return new Response(JSON.stringify({ response }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('fishing-chatbot error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
