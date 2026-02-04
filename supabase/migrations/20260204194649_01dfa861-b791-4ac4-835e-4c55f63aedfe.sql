-- Crear organizaciones para usuarios existentes que no tienen una
INSERT INTO public.organizations (id, name, slug)
SELECT 
  gen_random_uuid(),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) || '''s Team',
  u.id::text
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.user_id = u.id
);

-- Agregar usuarios como admin de sus organizaciones
INSERT INTO public.team_members (user_id, organization_id, role, email, full_name, is_active)
SELECT 
  u.id,
  o.id,
  'admin',
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  true
FROM auth.users u
JOIN public.organizations o ON o.slug = u.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.user_id = u.id
);