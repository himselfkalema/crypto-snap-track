-- Fix critical RLS policy vulnerabilities

-- 1. Restrict profiles table to owner-only access (currently publicly readable)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Protect newsletter subscriptions (currently no SELECT policy)
CREATE POLICY "Only admins can view newsletter subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Ensure deposits table has proper admin-only access for viewing all deposits
-- (Users can already view their own, this adds admin access)
-- Verify existing policies are sufficient - they already exist per schema