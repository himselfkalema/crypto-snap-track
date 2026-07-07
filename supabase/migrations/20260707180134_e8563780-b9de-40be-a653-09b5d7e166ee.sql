
-- 1) offers.featured protection
CREATE OR REPLACE FUNCTION public.offers_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.featured IS DISTINCT FROM OLD.featured
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.featured := OLD.featured;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_offers_guard_update ON public.offers;
CREATE TRIGGER trg_offers_guard_update
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.offers_guard_update();

-- Guard featured on INSERT too
CREATE OR REPLACE FUNCTION public.offers_guard_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.featured = true
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.featured := false;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_offers_guard_insert ON public.offers;
CREATE TRIGGER trg_offers_guard_insert
BEFORE INSERT ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.offers_guard_insert();

-- 2) profiles protected fields
CREATE OR REPLACE FUNCTION public.profiles_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.verified           := OLD.verified;
    NEW.suspended          := OLD.suspended;
    NEW.reputation_score   := OLD.reputation_score;
    NEW.total_trades       := OLD.total_trades;
    NEW.successful_trades  := OLD.successful_trades;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_guard_update ON public.profiles;
CREATE TRIGGER trg_profiles_guard_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_guard_update();

-- 3) bots plan-tier enforcement
CREATE OR REPLACE FUNCTION public.bots_enforce_plan_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_plan text;
  v_status text;
  v_max int;
  v_count int;
BEGIN
  -- Only enforce when the row will be "active"
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'active' THEN
    RETURN NEW; -- already counted; not adding a new active
  END IF;

  SELECT plan::text, status INTO v_plan, v_status
  FROM public.subscriptions WHERE user_id = NEW.user_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_status IS DISTINCT FROM 'active' THEN v_plan := 'free'; END IF;
  v_max := CASE COALESCE(v_plan, 'free')
             WHEN 'premium' THEN 10
             WHEN 'pro'     THEN 3
             ELSE 1
           END;

  SELECT count(*) INTO v_count
  FROM public.bots
  WHERE user_id = NEW.user_id
    AND status = 'active'
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Plan limit reached: % plan allows at most % active bots', COALESCE(v_plan,'free'), v_max
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bots_enforce_plan_limit ON public.bots;
CREATE TRIGGER trg_bots_enforce_plan_limit
BEFORE INSERT OR UPDATE OF status, user_id ON public.bots
FOR EACH ROW EXECUTE FUNCTION public.bots_enforce_plan_limit();

-- 4) trades insert validation
CREATE OR REPLACE FUNCTION public.trades_validate_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.offers%ROWTYPE;
  expected_buyer uuid;
  expected_seller uuid;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = NEW.offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF o.status <> 'active' THEN
    RAISE EXCEPTION 'Offer is not active' USING ERRCODE = 'check_violation';
  END IF;

  -- Derive buyer/seller from offer type
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

  -- Recompute crypto_amount from validated price to prevent tampering
  IF o.price > 0 THEN
    NEW.crypto_amount := round((NEW.fiat_amount / o.price)::numeric, 8);
  END IF;

  IF NEW.payment_method IS NOT NULL
     AND array_length(o.payment_methods, 1) IS NOT NULL
     AND NOT (NEW.payment_method = ANY (o.payment_methods)) THEN
    RAISE EXCEPTION 'Payment method not accepted by offer' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_trades_validate_insert ON public.trades;
CREATE TRIGGER trg_trades_validate_insert
BEFORE INSERT ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.trades_validate_insert();
