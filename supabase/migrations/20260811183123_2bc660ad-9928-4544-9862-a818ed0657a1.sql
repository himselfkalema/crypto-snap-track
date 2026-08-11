
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_settings_read" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "platform_settings_admin_write" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_platform_settings_updated BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('platform_trade_fee_percentage', '1'::jsonb, 'Marketplace fee charged on each completed trade, as a percentage of the crypto amount.');

ALTER TABLE public.trades
  ADD COLUMN fee_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN fee_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE public.platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  coin text NOT NULL,
  amount numeric NOT NULL,
  fiat_currency text,
  fiat_value numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id)
);
GRANT SELECT ON public.platform_fees TO authenticated;
GRANT ALL ON public.platform_fees TO service_role;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_fees_admin_read" ON public.platform_fees FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_platform_fee_pct()
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT (value #>> '{}')::numeric FROM public.platform_settings WHERE key = 'platform_trade_fee_percentage'), 0)
$$;

-- Recompute fee server-side on trade insert
CREATE OR REPLACE FUNCTION public.trades_validate_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o public.offers%ROWTYPE;
  expected_buyer uuid;
  expected_seller uuid;
  v_fee_pct numeric;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = NEW.offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF o.status <> 'active' THEN
    RAISE EXCEPTION 'Offer is not active' USING ERRCODE = 'check_violation';
  END IF;

  IF o.type = 'sell' THEN
    expected_seller := o.user_id;
    expected_buyer  := auth.uid();
  ELSE
    expected_buyer  := o.user_id;
    expected_seller := auth.uid();
  END IF;

  IF expected_buyer IS NULL OR expected_seller IS NULL OR expected_buyer = expected_seller THEN
    RAISE EXCEPTION 'Invalid trade participants' USING ERRCODE = 'check_violation';
  END IF;

  NEW.buyer_id      := expected_buyer;
  NEW.seller_id     := expected_seller;
  NEW.coin          := o.coin;
  NEW.fiat_currency := o.fiat_currency;
  NEW.price         := o.price;

  IF NEW.fiat_amount < o.min_trade OR NEW.fiat_amount > o.max_trade THEN
    RAISE EXCEPTION 'Fiat amount outside offer limits (% - %)', o.min_trade, o.max_trade
      USING ERRCODE = 'check_violation';
  END IF;

  IF o.price > 0 THEN
    NEW.crypto_amount := round((NEW.fiat_amount / o.price)::numeric, 8);
  END IF;

  IF NEW.payment_method IS NOT NULL
     AND array_length(o.payment_methods, 1) IS NOT NULL
     AND NOT (NEW.payment_method = ANY (o.payment_methods)) THEN
    RAISE EXCEPTION 'Payment method not accepted by offer' USING ERRCODE = 'check_violation';
  END IF;

  v_fee_pct := public.get_platform_fee_pct();
  NEW.fee_percentage := v_fee_pct;
  NEW.fee_amount := round((NEW.crypto_amount * v_fee_pct / 100)::numeric, 8);

  RETURN NEW;
END; $function$;

-- Fee is deducted from the buyer's release and recorded
CREATE OR REPLACE FUNCTION public.trades_escrow_on_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'completed' THEN
    PERFORM public.wallet_move(NEW.seller_id, NEW.coin, 0, -NEW.crypto_amount, 'trade_release_seller', NEW.id);
    PERFORM public.wallet_move(NEW.buyer_id,  NEW.coin, NEW.crypto_amount - COALESCE(NEW.fee_amount, 0), 0, 'trade_release_buyer',  NEW.id);
    IF COALESCE(NEW.fee_amount, 0) > 0 THEN
      INSERT INTO public.platform_fees (trade_id, coin, amount, fiat_currency, fiat_value)
      VALUES (NEW.id, NEW.coin, NEW.fee_amount, NEW.fiat_currency, round((NEW.fee_amount * NEW.price)::numeric, 2))
      ON CONFLICT (trade_id) DO NOTHING;
    END IF;

  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('pending','payment_sent') THEN
    PERFORM public.wallet_move(NEW.seller_id, NEW.coin, NEW.crypto_amount, -NEW.crypto_amount, 'trade_refund_seller', NEW.id);
  END IF;

  RETURN NEW;
END; $function$;

-- Fee columns are server-set and immutable
CREATE OR REPLACE FUNCTION public.trades_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.id           IS DISTINCT FROM OLD.id           THEN RAISE EXCEPTION 'trades.id is immutable'; END IF;
  IF NEW.offer_id     IS DISTINCT FROM OLD.offer_id     THEN RAISE EXCEPTION 'trades.offer_id is immutable'; END IF;
  IF NEW.buyer_id     IS DISTINCT FROM OLD.buyer_id     THEN RAISE EXCEPTION 'trades.buyer_id is immutable'; END IF;
  IF NEW.seller_id    IS DISTINCT FROM OLD.seller_id    THEN RAISE EXCEPTION 'trades.seller_id is immutable'; END IF;
  IF NEW.coin         IS DISTINCT FROM OLD.coin         THEN RAISE EXCEPTION 'trades.coin is immutable'; END IF;
  IF NEW.crypto_amount IS DISTINCT FROM OLD.crypto_amount THEN RAISE EXCEPTION 'trades.crypto_amount is immutable'; END IF;
  IF NEW.fiat_amount  IS DISTINCT FROM OLD.fiat_amount  THEN RAISE EXCEPTION 'trades.fiat_amount is immutable'; END IF;
  IF NEW.fiat_currency IS DISTINCT FROM OLD.fiat_currency THEN RAISE EXCEPTION 'trades.fiat_currency is immutable'; END IF;
  IF NEW.price        IS DISTINCT FROM OLD.price        THEN RAISE EXCEPTION 'trades.price is immutable'; END IF;
  IF NEW.fee_percentage IS DISTINCT FROM OLD.fee_percentage THEN RAISE EXCEPTION 'trades.fee_percentage is immutable'; END IF;
  IF NEW.fee_amount   IS DISTINCT FROM OLD.fee_amount   THEN RAISE EXCEPTION 'trades.fee_amount is immutable'; END IF;
  IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN RAISE EXCEPTION 'trades.payment_method is immutable'; END IF;
  IF NEW.created_at   IS DISTINCT FROM OLD.created_at   THEN RAISE EXCEPTION 'trades.created_at is immutable'; END IF;
  IF NEW.expires_at   IS DISTINCT FROM OLD.expires_at   THEN RAISE EXCEPTION 'trades.expires_at is immutable'; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending' AND NEW.status = 'payment_sent' AND auth.uid() = OLD.buyer_id THEN
      NULL;
    ELSIF OLD.status = 'payment_sent' AND NEW.status = 'completed' AND auth.uid() = OLD.seller_id THEN
      NULL;
    ELSIF NEW.status = 'cancelled' AND OLD.status IN ('pending','payment_sent')
          AND auth.uid() IN (OLD.buyer_id, OLD.seller_id) THEN
      NULL;
    ELSIF NEW.status = 'disputed' AND OLD.status IN ('pending','payment_sent')
          AND auth.uid() IN (OLD.buyer_id, OLD.seller_id) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Invalid trade status transition % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Admin provisioning for both admin emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
BEGIN
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  IF base_username = '' THEN base_username := 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, final_username, COALESCE(NEW.raw_user_meta_data->>'display_name', final_username));

  IF lower(NEW.email) IN ('kalemaahmed198@gmail.com','favorpupi@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status) VALUES (NEW.id, 'free', 'active');
  RETURN NEW;
END; $function$;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) IN ('kalemaahmed198@gmail.com','favorpupi@gmail.com')
ON CONFLICT DO NOTHING;
