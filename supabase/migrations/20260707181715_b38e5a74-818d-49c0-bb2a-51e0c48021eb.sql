
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  success boolean NOT NULL,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_login_attempts TO authenticated;
GRANT ALL ON public.admin_login_attempts TO service_role;
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read login attempts" ON public.admin_login_attempts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX admin_login_attempts_email_idx ON public.admin_login_attempts (email, created_at DESC);
CREATE INDEX admin_login_attempts_created_idx ON public.admin_login_attempts (created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_actions_log TO authenticated;
GRANT ALL ON public.admin_actions_log TO service_role;
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read admin actions" ON public.admin_actions_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX admin_actions_log_created_idx ON public.admin_actions_log (created_at DESC);
CREATE INDEX admin_actions_log_actor_idx ON public.admin_actions_log (actor_id, created_at DESC);
