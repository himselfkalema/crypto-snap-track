-- Require a verified (email-confirmed) auth user before inserting offers/trades/bots.
-- Admins bypass so support/testing flows keep working.
CREATE OR REPLACE FUNCTION public.require_verified_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_confirmed timestamptz;
BEGIN
  -- Service role / no auth context: allow (edge functions handle their own checks)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT email_confirmed_at INTO v_confirmed
  FROM auth.users
  WHERE id = auth.uid();

  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Email not verified. Confirm your email address before continuing.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Only triggers should call this, not clients.
REVOKE EXECUTE ON FUNCTION public.require_verified_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS offers_require_verified_email ON public.offers;
CREATE TRIGGER offers_require_verified_email
  BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email();

DROP TRIGGER IF EXISTS trades_require_verified_email ON public.trades;
CREATE TRIGGER trades_require_verified_email
  BEFORE INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email();

DROP TRIGGER IF EXISTS bots_require_verified_email ON public.bots;
CREATE TRIGGER bots_require_verified_email
  BEFORE INSERT ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.require_verified_email();
