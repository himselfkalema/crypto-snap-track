// DISABLED: This endpoint previously credited wallets without payment verification.
// Use the mobile-money flow instead, which credits the wallet only after a verified
// provider callback. See supabase/functions/mobile-money/index.ts.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: 'This endpoint has been disabled. Please use the mobile money top-up flow.',
    }),
    { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
