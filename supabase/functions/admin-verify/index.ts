// Server-side admin gate. The client calls this on every admin-portal page
// mount and periodically thereafter. It re-validates the caller's JWT against
// the Auth server, confirms the `admin` role via the DB (never trusts any
// client-side claim), and reports AAL (needs `aal2`) + MFA freshness so the UI
// can force TOTP challenge / step-up re-auth when required.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}
function decodeJwt(token: string): Record<string, unknown> | null {
  try { return JSON.parse(b64urlDecode(token.split('.')[1])); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  const authz = req.headers.get('Authorization') ?? '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders });
  }

  // Re-validate the token against the Auth server (never trust the JWT alone).
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const asUser = createClient(url, anon, { global: { headers: { Authorization: authz } } });
  const { data: userRes, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders });
  }
  const uid = userRes.user.id;

  const svcClient = createClient(url, svc);
  const { data: roleRow } = await svcClient
    .from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').maybeSingle();
  const isAdmin = !!roleRow;

  const payload = decodeJwt(token) as
    | { aal?: string; amr?: Array<{ method?: string; timestamp?: number }>; exp?: number } | null;
  const aal = payload?.aal ?? 'aal1';
  const totp = (payload?.amr ?? []).filter((a) => a?.method === 'totp' && a?.timestamp);
  const mfaTimestamp = totp.length ? Math.max(...totp.map((a) => Number(a.timestamp))) : 0;
  const mfaAgeSec = mfaTimestamp ? Math.floor(Date.now() / 1000) - mfaTimestamp : Number.MAX_SAFE_INTEGER;

  if (!isAdmin) {
    // Uniform denial — do not leak whether the account exists or is authenticated-but-not-admin.
    return new Response(JSON.stringify({ error: 'access_denied' }), { status: 403, headers: jsonHeaders });
  }
  return new Response(JSON.stringify({
    ok: true,
    is_admin: true,
    aal,
    mfa_age_seconds: mfaAgeSec,
    user_id: uid,
    email: userRes.user.email,
  }), { headers: jsonHeaders });
});
