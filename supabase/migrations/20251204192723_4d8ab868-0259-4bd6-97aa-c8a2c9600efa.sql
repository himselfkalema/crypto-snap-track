INSERT INTO public.user_roles (user_id, role)
VALUES ('a93720f1-f895-43c0-9c7c-0970fdcf7e0e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;