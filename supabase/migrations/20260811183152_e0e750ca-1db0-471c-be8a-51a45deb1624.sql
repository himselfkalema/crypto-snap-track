
REVOKE EXECUTE ON FUNCTION public.bots_enforce_plan_limit() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.offers_guard_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.offers_guard_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_guard_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.require_verified_email() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trades_escrow_on_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trades_escrow_on_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trades_guard_update() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trades_validate_insert() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_move(uuid, text, numeric, numeric, text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_platform_fee_pct() FROM anon;
