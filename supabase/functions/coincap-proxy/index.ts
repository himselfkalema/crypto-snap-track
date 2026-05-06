// CoinCap proxy - keeps API key server-side
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '250', 10), 2000);
    const apiKey = Deno.env.get('COINCAP_API_KEY');

    const upstream = await fetch(
      `https://api.coincap.io/v2/assets?limit=${limit}`,
      apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined
    );

    if (!upstream.ok) {
      console.error('CoinCap upstream error', upstream.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch market data' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (e) {
    console.error('coincap-proxy error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
