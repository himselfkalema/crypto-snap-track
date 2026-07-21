
-- ============ wallet_balances ============
CREATE TABLE public.wallet_balances (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin TEXT NOT NULL,
  available NUMERIC(30,8) NOT NULL DEFAULT 0,
  escrow NUMERIC(30,8) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, coin),
  CONSTRAINT wallet_balances_nonneg CHECK (available >= 0 AND escrow >= 0)
);

GRANT SELECT ON public.wallet_balances TO authenticated;
GRANT ALL ON public.wallet_balances TO service_role;

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own balances"
  ON public.wallet_balances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- No direct INSERT/UPDATE/DELETE policies: only SECURITY DEFINER functions mutate balances.

-- ============ wallet_ledger ============
CREATE TABLE public.wallet_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin TEXT NOT NULL,
  delta_available NUMERIC(30,8) NOT NULL DEFAULT 0,
  delta_escrow NUMERIC(30,8) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  ref_trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX wallet_ledger_user_created_idx ON public.wallet_ledger (user_id, created_at DESC);
CREATE INDEX wallet_ledger_ref_trade_idx ON public.wallet_ledger (ref_trade_id);

GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ledger"
  ON public.wallet_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Core wallet move: SECURITY DEFINER, atomic ============
CREATE OR REPLACE FUNCTION public.wallet_move(
  _user_id UUID,
  _coin TEXT,
  _delta_available NUMERIC,
  _delta_escrow NUMERIC,
  _reason TEXT,
  _ref_trade_id UUID DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_available NUMERIC;
  new_escrow NUMERIC;
BEGIN
  INSERT INTO public.wallet_balances (user_id, coin, available, escrow)
  VALUES (_user_id, _coin, 0, 0)
  ON CONFLICT (user_id, coin) DO NOTHING;

  UPDATE public.wallet_balances
     SET available = available + _delta_available,
         escrow    = escrow    + _delta_escrow,
         updated_at = now()
   WHERE user_id = _user_id AND coin = _coin
   RETURNING available, escrow INTO new_available, new_escrow;

  IF new_available < 0 OR new_escrow < 0 THEN
    RAISE EXCEPTION 'Insufficient % balance (available=%, escrow=%)', _coin, new_available, new_escrow
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.wallet_ledger (user_id, coin, delta_available, delta_escrow, reason, ref_trade_id)
  VALUES (_user_id, _coin, _delta_available, _delta_escrow, _reason, _ref_trade_id);
END; $$;

REVOKE ALL ON FUNCTION public.wallet_move(UUID, TEXT, NUMERIC, NUMERIC, TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- ============ Admin credit (deposits placeholder / testing) ============
CREATE OR REPLACE FUNCTION public.admin_credit_wallet(
  _user_id UUID,
  _coin TEXT,
  _amount NUMERIC,
  _reason TEXT DEFAULT 'admin_credit'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = 'check_violation';
  END IF;
  PERFORM public.wallet_move(_user_id, _coin, _amount, 0, _reason, NULL);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_credit_wallet(UUID, TEXT, NUMERIC, TEXT) TO authenticated;

-- ============ Trade escrow triggers ============

-- On trade creation: pull seller's crypto from available -> escrow.
CREATE OR REPLACE FUNCTION public.trades_escrow_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.wallet_move(
    NEW.seller_id, NEW.coin,
    -NEW.crypto_amount, NEW.crypto_amount,
    'trade_escrow_lock', NEW.id
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trades_escrow_on_insert
AFTER INSERT ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.trades_escrow_on_insert();

-- On status change: release / refund.
CREATE OR REPLACE FUNCTION public.trades_escrow_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'completed' THEN
    -- Seller escrow -> Buyer available
    PERFORM public.wallet_move(NEW.seller_id, NEW.coin, 0, -NEW.crypto_amount, 'trade_release_seller', NEW.id);
    PERFORM public.wallet_move(NEW.buyer_id,  NEW.coin, NEW.crypto_amount, 0, 'trade_release_buyer',  NEW.id);

  ELSIF NEW.status = 'cancelled' AND OLD.status IN ('pending','payment_sent') THEN
    -- Refund seller escrow -> available
    PERFORM public.wallet_move(NEW.seller_id, NEW.coin, NEW.crypto_amount, -NEW.crypto_amount, 'trade_refund_seller', NEW.id);
  END IF;
  -- 'disputed' leaves funds in escrow; admin resolves manually.

  RETURN NEW;
END; $$;

CREATE TRIGGER trades_escrow_on_update
AFTER UPDATE OF status ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.trades_escrow_on_update();
