import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TIER_CONFIG: Record<string, { maxActive: number; intervalSec: number; dailyCap: number }> = {
  free:    { maxActive: 1,  intervalSec: 300, dailyCap: 200 },
  pro:     { maxActive: 3,  intervalSec: 60,  dailyCap: 2000 },
  premium: { maxActive: 10, intervalSec: 20,  dailyCap: 20000 },
};

// Simple in-memory price cache per invocation
const priceCache = new Map<string, { price: number; at: number }>();

async function fetchMarketPrice(coin: string, supabase: any): Promise<number> {
  const cached = priceCache.get(coin);
  if (cached && Date.now() - cached.at < 15000) return cached.price;
  const { data, error } = await supabase.functions.invoke('coincap-proxy', {
    body: { path: `/v3/assets/${coin.toLowerCase()}` },
  });
  if (error) throw error;
  const price = Number(data?.data?.priceUsd);
  if (!price || Number.isNaN(price)) throw new Error('Bad price');
  priceCache.set(coin, { price, at: Date.now() });
  return price;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Fetch active bots joined with subscription tier
    const { data: bots, error } = await supabase
      .from('bots')
      .select('*, subscriptions:user_id(plan)')
      .eq('status', 'active')
      .limit(500);

    if (error) throw error;

    // Fallback: get tiers separately (subscriptions FK trick above may not work)
    const userIds = [...new Set((bots ?? []).map((b: any) => b.user_id))];
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, plan, status')
      .in('user_id', userIds);
    const tierMap = new Map<string, string>();
    for (const s of subs ?? []) tierMap.set(s.user_id, s.status === 'active' ? s.plan : 'free');

    let processed = 0;
    for (const bot of bots ?? []) {
      const tier = tierMap.get(bot.user_id) ?? 'free';
      const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.free;

      // Interval throttle
      if (bot.last_run_at) {
        const age = (Date.now() - new Date(bot.last_run_at).getTime()) / 1000;
        if (age < cfg.intervalSec) continue;
      }

      // Daily volume reset check
      let dailyVolume = Number(bot.daily_volume) || 0;
      const resetAt = new Date(bot.daily_volume_reset_at).getTime();
      if (Date.now() - resetAt > 24 * 3600 * 1000) dailyVolume = 0;

      if (dailyVolume >= cfg.dailyCap) {
        await supabase.from('bots').update({
          status: 'paused', pause_reason: 'Daily volume cap reached', last_run_at: new Date().toISOString(),
        }).eq('id', bot.id);
        await supabase.from('bot_runs').insert({ bot_id: bot.id, action: 'paused', note: 'daily_cap' });
        await supabase.from('notifications').insert({
          user_id: bot.user_id, type: 'bot_daily_cap_hit',
          title: `Bot "${bot.name}" paused`, body: 'Daily volume cap reached.', link: `/bots/${bot.id}`,
        });
        continue;
      }

      // Dispute-based auto-pause (2 disputes in 24h on this user's offers)
      const { count: recentDisputes } = await supabase
        .from('disputes').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .in('trade_id',
          (await supabase.from('trades').select('id').eq('seller_id', bot.user_id)).data?.map((t: any) => t.id) ?? ['00000000-0000-0000-0000-000000000000']
        );
      if ((recentDisputes ?? 0) >= 2) {
        await supabase.from('bots').update({
          status: 'paused', pause_reason: 'Auto-paused: 2+ disputes in 24h', last_run_at: new Date().toISOString(),
        }).eq('id', bot.id);
        await supabase.from('bot_runs').insert({ bot_id: bot.id, action: 'paused', note: 'disputes' });
        await supabase.from('notifications').insert({
          user_id: bot.user_id, type: 'bot_paused',
          title: `Bot "${bot.name}" paused`, body: 'Auto-paused after recent disputes.', link: `/bots/${bot.id}`,
        });
        continue;
      }

      // Fetch price
      let market: number;
      try {
        market = await fetchMarketPrice(bot.coin, supabase);
      } catch (e) {
        const errs = (bot.consecutive_errors ?? 0) + 1;
        const patch: any = { consecutive_errors: errs, last_error: String((e as Error).message).slice(0, 200), last_run_at: new Date().toISOString() };
        if (errs >= 3) { patch.status = 'paused'; patch.pause_reason = 'Price feed unavailable'; }
        await supabase.from('bots').update(patch).eq('id', bot.id);
        await supabase.from('bot_runs').insert({ bot_id: bot.id, action: 'skipped', note: 'price_fetch_failed' });
        continue;
      }

      const sign = bot.side === 'sell' ? 1 : -1;
      const newPrice = market * (1 + (sign * Number(bot.margin_pct)) / 100);

      // Safety: >20% off market
      const drift = Math.abs(newPrice - market) / market;
      if (drift > 0.2) {
        await supabase.from('bots').update({
          status: 'paused', pause_reason: 'Margin drift >20% from market', last_run_at: new Date().toISOString(),
        }).eq('id', bot.id);
        await supabase.from('bot_runs').insert({ bot_id: bot.id, market_price: market, new_price: newPrice, action: 'paused', note: 'drift_safety' });
        continue;
      }

      // Upsert linked offer
      let offerId = bot.offer_id;
      if (offerId) {
        await supabase.from('offers').update({
          price: newPrice, available_amount: bot.available_amount, min_trade: bot.min_amount,
          max_trade: bot.max_amount, payment_methods: bot.payment_methods, terms: bot.terms,
          country: bot.country, status: 'active',
        }).eq('id', offerId);
      } else {
        const { data: newOffer } = await supabase.from('offers').insert({
          user_id: bot.user_id, type: bot.side, coin: bot.coin, fiat_currency: bot.fiat_currency,
          price: newPrice, available_amount: bot.available_amount, min_trade: bot.min_amount,
          max_trade: bot.max_amount, payment_methods: bot.payment_methods, terms: bot.terms,
          country: bot.country, status: 'active', is_bot: true, bot_id: bot.id,
        }).select('id').single();
        offerId = newOffer?.id;
      }

      await supabase.from('bots').update({
        offer_id: offerId, last_run_at: new Date().toISOString(), last_market_price: market,
        consecutive_errors: 0, last_error: null, daily_volume: dailyVolume,
        daily_volume_reset_at: Date.now() - resetAt > 24 * 3600 * 1000 ? new Date().toISOString() : bot.daily_volume_reset_at,
      }).eq('id', bot.id);

      await supabase.from('bot_runs').insert({
        bot_id: bot.id, market_price: market, new_price: newPrice, action: offerId ? 'updated' : 'created',
      });

      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('bot-tick error', e);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
