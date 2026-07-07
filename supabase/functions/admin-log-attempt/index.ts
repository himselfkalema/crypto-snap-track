// Records admin login attempts. Called from the client during /admin login flow.
// Uses the service-role key so the audit row is always written, even when the
// caller has no session yet (failed password, unknown email, etc).
// Publicly reachable (verify_jwt = false) — validated via strict input schema,
// per-IP rate limiting on failure spam is handled at the DB layer via indexes.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  success: z.boolean(),
  reason: z.string().max(120).optional(),
  user_id: z.string().uuid().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent')?.slice(0, 300) ?? null;
  await supabase.from('admin_login_attempts').insert({
    email: parsed.data.email,
    user_id: parsed.data.user_id ?? null,
    success: parsed.data.success,
    reason: parsed.data.reason ?? null,
    ip_address: ip,
    user_agent: ua,
  });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
