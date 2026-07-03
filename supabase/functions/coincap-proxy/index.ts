const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYMBOL_TO_ID: Record<string, string> = {
  btc: 'bitcoin', eth: 'ethereum', usdt: 'tether', usdc: 'usd-coin',
  sol: 'solana', bnb: 'binance-coin', xrp: 'xrp', doge: 'dogecoin',
  ada: 'cardano', matic: 'polygon', dot: 'polkadot', ltc: 'litecoin',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { path } = await req.json().catch(() => ({ path: '/v3/assets' }));
    // Normalize /v3/assets/<sym-or-id>
    let cleanPath: string = typeof path === 'string' ? path : '/v3/assets';
    const m = cleanPath.match(/^\/v3\/assets\/([a-z0-9-]+)$/i);
    if (m) {
      const key = m[1].toLowerCase();
      const id = SYMBOL_TO_ID[key] ?? key;
      cleanPath = `/v3/assets/${id}`;
    }
    const apiKey = Deno.env.get('COINCAP_API_KEY');
    const url = `https://rest.coincap.io${cleanPath}`;
    const res = await fetch(url, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15',
      },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'proxy_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
