
-- 1) Hide moderation flag `suspended` from public profile reads
REVOKE SELECT (suspended) ON public.profiles FROM anon, authenticated;

-- 2) Lock down trade updates: prevent participants from mutating immutable/sensitive columns
CREATE OR REPLACE FUNCTION public.trades_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can do anything
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Block changes to immutable columns
  IF NEW.id           IS DISTINCT FROM OLD.id           THEN RAISE EXCEPTION 'trades.id is immutable'; END IF;
  IF NEW.offer_id     IS DISTINCT FROM OLD.offer_id     THEN RAISE EXCEPTION 'trades.offer_id is immutable'; END IF;
  IF NEW.buyer_id     IS DISTINCT FROM OLD.buyer_id     THEN RAISE EXCEPTION 'trades.buyer_id is immutable'; END IF;
  IF NEW.seller_id    IS DISTINCT FROM OLD.seller_id    THEN RAISE EXCEPTION 'trades.seller_id is immutable'; END IF;
  IF NEW.coin         IS DISTINCT FROM OLD.coin         THEN RAISE EXCEPTION 'trades.coin is immutable'; END IF;
  IF NEW.crypto_amount IS DISTINCT FROM OLD.crypto_amount THEN RAISE EXCEPTION 'trades.crypto_amount is immutable'; END IF;
  IF NEW.fiat_amount  IS DISTINCT FROM OLD.fiat_amount  THEN RAISE EXCEPTION 'trades.fiat_amount is immutable'; END IF;
  IF NEW.fiat_currency IS DISTINCT FROM OLD.fiat_currency THEN RAISE EXCEPTION 'trades.fiat_currency is immutable'; END IF;
  IF NEW.price        IS DISTINCT FROM OLD.price        THEN RAISE EXCEPTION 'trades.price is immutable'; END IF;
  IF NEW.payment_method IS DISTINCT FROM OLD.payment_method THEN RAISE EXCEPTION 'trades.payment_method is immutable'; END IF;
  IF NEW.created_at   IS DISTINCT FROM OLD.created_at   THEN RAISE EXCEPTION 'trades.created_at is immutable'; END IF;
  IF NEW.expires_at   IS DISTINCT FROM OLD.expires_at   THEN RAISE EXCEPTION 'trades.expires_at is immutable'; END IF;

  -- Only allow forward status transitions; sellers release, buyers/sellers cancel/dispute
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
$$;

DROP TRIGGER IF EXISTS trg_trades_guard_update ON public.trades;
CREATE TRIGGER trg_trades_guard_update
BEFORE UPDATE ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.trades_guard_update();

-- 3) Lock down Realtime broadcast/presence subscriptions.
-- The app uses postgres_changes only (governed by source-table RLS), so denying
-- broadcast/presence access on realtime.messages closes the open-channel risk
-- without affecting current functionality.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny broadcast and presence" ON realtime.messages;
CREATE POLICY "Deny broadcast and presence"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);
