-- Fix critical RLS policy vulnerabilities
-- Drop and recreate policies with correct security rules

-- 1. Fix profiles table - currently allows public access with USING (true)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Only allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Protect newsletter subscriptions - currently has no SELECT policy
DROP POLICY IF EXISTS "Only admins can view newsletter subscriptions" ON public.newsletter_subscriptions;

CREATE POLICY "Only admins can view newsletter subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));