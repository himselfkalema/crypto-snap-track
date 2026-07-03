
-- Extend offers
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS bot_id uuid,
  ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- Bots table
CREATE TABLE public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  coin text NOT NULL,
  side offer_type NOT NULL,
  fiat_currency text NOT NULL DEFAULT 'USD',
  payment_methods text[] NOT NULL DEFAULT '{}',
  country text,
  margin_pct numeric NOT NULL DEFAULT 0,
  min_amount numeric NOT NULL,
  max_amount numeric NOT NULL,
  available_amount numeric NOT NULL,
  terms text,
  auto_reply text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','stopped')),
  pause_reason text,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  daily_volume numeric NOT NULL DEFAULT 0,
  daily_volume_reset_at timestamptz NOT NULL DEFAULT now(),
  consecutive_errors int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_market_price numeric,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.offers
  ADD CONSTRAINT offers_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bots(id) ON DELETE SET NULL;

CREATE INDEX bots_user_idx ON public.bots(user_id);
CREATE INDEX bots_status_idx ON public.bots(status);
CREATE INDEX bots_last_run_idx ON public.bots(last_run_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT ALL ON public.bots TO service_role;

ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bots_owner_select" ON public.bots FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bots_owner_insert" ON public.bots FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bots_owner_update" ON public.bots FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bots_owner_delete" ON public.bots FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER bots_set_updated_at BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bot runs
CREATE TABLE public.bot_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  ran_at timestamptz NOT NULL DEFAULT now(),
  market_price numeric,
  new_price numeric,
  action text NOT NULL,
  note text
);

CREATE INDEX bot_runs_bot_idx ON public.bot_runs(bot_id, ran_at DESC);

GRANT SELECT ON public.bot_runs TO authenticated;
GRANT ALL ON public.bot_runs TO service_role;

ALTER TABLE public.bot_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bot_runs_owner_select" ON public.bot_runs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = bot_id AND (b.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bots;

-- Cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'bot-tick-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://vjngldemsxvkomoguhko.supabase.co/functions/v1/bot-tick',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbmdsZGVtc3h2a29tb2d1aGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MzQ5NjMsImV4cCI6MjA5NzMxMDk2M30.OJBZYRSG-9BiegsS3Ubh9IC3R9_YQcz_9lYvyLAjL2M"}'::jsonb,
    body:='{"source":"cron"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'bot-daily-reset',
  '0 0 * * *',
  $$ UPDATE public.bots SET daily_volume = 0, daily_volume_reset_at = now() WHERE daily_volume > 0; $$
);
