// Step-up-protected admin action: suspend or unsuspend a user.
// Enforces (in order): valid session → admin role → AAL2 (MFA present) →
// fresh TOTP challenge within STEP_UP_MAX_AGE seconds. Writes an audit row.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STEP_UP_MAX_AGE = 5 * 60; // seconds

const Body = z.object({
  target_user_id: z.string().uuid(),
  suspend: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: jsonHeaders });
  }

  const authz = req.headers.get('Authorization') ?? '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const asUser = createClient(url, anon, { global: { headers: { Authorization: authz } } });
  const { data: userRes, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userRes?.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders });
  }
  const actorId = userRes.user.id;

  const svcClient = createClient(url, svc);
  const { data: roleRow } = await svcClient
    .from('user_roles').select('role').eq('user_id', actorId).eq('role', 'admin').maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'access_denied' }), { status: 403, headers: jsonHeaders });
  }

  const payload = decodeJwt(token) as
    | { aal?: string; amr?: Array<{ method?: string; timestamp?: number }> } | null;
  if (payload?.aal !== 'aal2') {
    return new Response(JSON.stringify({ error: 'mfa_required' }), { status: 401, headers: jsonHeaders });
  }
  const totp = (payload?.amr ?? []).filter((a) => a?.method === 'totp' && a?.timestamp);
  const mfaTimestamp = totp.length ? Math.max(...totp.map((a) => Number(a.timestamp))) : 0;
  const mfaAge = mfaTimestamp ? Math.floor(Date.now() / 1000) - mfaTimestamp : Number.MAX_SAFE_INTEGER;
  if (mfaAge > STEP_UP_MAX_AGE) {
    return new Response(JSON.stringify({ error: 'step_up_required', max_age: STEP_UP_MAX_AGE }), {
      status: 401, headers: jsonHeaders,
    });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }), {
      status: 400, headers: jsonHeaders,
    });
  }
  const { target_user_id, suspend, reason } = parsed.data;
  if (target_user_id === actorId) {
    return new Response(JSON.stringify({ error: 'cannot_target_self' }), { status: 400, headers: jsonHeaders });
  }

  const { error: updErr } = await svcClient
    .from('profiles').update({ suspended: suspend }).eq('id', target_user_id);
  if (updErr) {
    return new Response(JSON.stringify({ error: 'update_failed', details: updErr.message }), {
      status: 500, headers: jsonHeaders,
    });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent')?.slice(0, 300) ?? null;
  await svcClient.from('admin_actions_log').insert({
    actor_id: actorId,
    action: suspend ? 'suspend_user' : 'unsuspend_user',
    target_type: 'user',
    target_id: target_user_id,
    metadata: { reason: reason ?? null, mfa_age_seconds: mfaAge },
    ip_address: ip,
    user_agent: ua,
  });

  return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
});
