import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createHmac, timingSafeEqual } from 'node:crypto';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET');
  if (!secret) return new Response('Not configured', { status: 500 });

  const sigHeader = req.headers.get('X-Signature') ?? '';
  const rawBody = await req.text();

  // Verify HMAC SHA-256
  const hmac = createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  try {
    if (!timingSafeEqual(Buffer.from(digest), Buffer.from(sigHeader))) {
      return new Response('Invalid signature', { status: 401 });
    }
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return new Response('Bad JSON', { status: 400 }); }

  const eventName = event?.meta?.event_name as string | undefined;
  const custom = event?.meta?.custom_data ?? event?.data?.attributes?.first_subscription_item?.custom_data;
  const userId = custom?.user_id;
  const plan = custom?.plan;

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    if (eventName === 'order_created' && userId) {
      const attrs = event.data.attributes;
      await supa.from('payments').insert({
        user_id: userId,
        amount: Number(attrs.total_usd ?? attrs.total) / 100,
        currency: 'USD',
        lemon_order_id: String(event.data.id),
        status: attrs.status === 'paid' ? 'paid' : 'pending',
        metadata: { event_name: eventName },
      });
    }

    if (eventName?.startsWith('subscription_') && userId) {
      const attrs = event.data.attributes;
      const subStatus = attrs.status; // active, cancelled, expired, past_due
      const renewsAt = attrs.renews_at ?? null;
      const customerId = attrs.customer_id ? String(attrs.customer_id) : null;
      const subId = String(event.data.id);

      const normalizedStatus = ['active', 'on_trial'].includes(subStatus) ? 'active'
        : subStatus === 'cancelled' ? 'cancelled'
        : subStatus === 'expired' ? 'expired'
        : 'past_due';
      const newPlan = ['cancelled', 'expired'].includes(subStatus) ? 'free' : (plan ?? 'pro');

      await supa.from('subscriptions').upsert({
        user_id: userId,
        plan: newPlan,
        status: normalizedStatus,
        lemon_subscription_id: subId,
        lemon_customer_id: customerId,
        current_period_end: renewsAt,
      }, { onConflict: 'user_id' });

      await supa.from('notifications').insert({
        user_id: userId,
        type: 'subscription',
        title: `Subscription ${normalizedStatus}`,
        body: `Your ${newPlan} plan is now ${normalizedStatus}.`,
        link: '/settings',
      });
    }
  } catch (e) {
    console.error('Webhook handler error:', e);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
});
