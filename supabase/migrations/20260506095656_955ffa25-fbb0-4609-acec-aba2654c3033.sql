
-- 1. audit_logs: only service_role can insert (block public inserts)
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 2. user_roles: explicit admin-only mutation policies (defense in depth)
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can insert user roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. wallet_transactions: ensure wallet_id belongs to caller
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can create their own transactions"
ON public.wallet_transactions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = wallet_id AND w.user_id = auth.uid()
  )
);

-- 4. withdraw_skips: remove user UPDATE/INSERT (server-only via SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can update their own withdraw skips" ON public.withdraw_skips;
DROP POLICY IF EXISTS "Users can insert their own withdraw skips" ON public.withdraw_skips;

-- 5. user_subscriptions: remove user INSERT (must go through verified payment flow)
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.user_subscriptions;
