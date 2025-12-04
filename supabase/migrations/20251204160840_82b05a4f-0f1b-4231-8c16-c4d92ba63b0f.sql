INSERT INTO public.user_roles (user_id, role)
VALUES ('596a3a71-369e-4bca-87cb-8f67f4d94e19', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;