INSERT INTO public.user_roles (user_id, role)
VALUES ('f2b8f44f-c883-4038-969f-e89e38a04f5e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;