import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const PLAN_VARIANT_IDS: Record<string, string | undefined> = {
  pro: Deno.env.get('LEMON_PRO_VARIANT_ID') ?? undefined,
  premium: Deno.env.get('LEMON_PREMIUM_VARIANT_ID') ?? undefined,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LEMON_SQUEEZY_API_KEY');
    const storeId = Deno.env.get('LEMON_SQUEEZY_STORE_ID') ?? Deno.env.get('VITE_LEMON_SQUEEZY_STORE_ID');
    if (!apiKey || !storeId) {
      return new Response(JSON.stringify({ error: 'Lemon Squeezy not configured. Set LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, LEMON_PRO_VARIANT_ID, LEMON_PREMIUM_VARIANT_ID.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan } = await req.json();
    if (!['pro', 'premium'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const variantId = PLAN_VARIANT_IDS[plan];
    if (!variantId) {
      return new Response(JSON.stringify({ error: `Variant ID for ${plan} not configured` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Authenticate caller
    const authHeader = req.headers.get('Authorization') ?? '';
    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supa.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build checkout
    const origin = req.headers.get('origin') ?? '';
    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: user.email,
            custom: { user_id: user.id, plan },
          },
          product_options: {
            redirect_url: `${origin}/settings`,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    };
    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('Lemon Squeezy error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to create checkout' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const json = await res.json();
    const url = json?.data?.attributes?.url;
    return new Response(JSON.stringify({ url }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
