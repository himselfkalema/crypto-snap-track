-- Restrict reputation columns on profiles from anonymous readers.
-- Public listings still work (username, display_name, avatar, bio, country, verified),
-- but reputation_score / total_trades / successful_trades are only visible to authenticated users.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, country, verified, created_at, updated_at)
  ON public.profiles TO anon;
