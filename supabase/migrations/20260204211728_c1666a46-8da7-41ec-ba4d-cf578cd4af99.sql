-- =============================================
-- Sistema de Autorización de Empresas
-- =============================================

-- 1. Agregar campos de aprobación a organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- 2. Crear tabla super_admins
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en super_admins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- 3. Crear función is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins
    WHERE user_id = auth.uid()
  )
$$;

-- 4. Políticas RLS para super_admins (solo super-admins pueden ver/modificar)
CREATE POLICY "Super admins can view super_admins"
ON public.super_admins FOR SELECT
TO authenticated
USING (is_super_admin());

-- 5. Actualizar políticas de organizations para super-admins
-- Primero eliminar las políticas existentes
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;

-- Crear nuevas políticas que incluyen super-admin
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (
  id = get_user_organization_id() 
  OR is_super_admin()
);

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  (id = get_user_organization_id() AND user_has_role('admin'::team_role))
  OR is_super_admin()
);

-- 6. Modificar trigger para crear organizaciones con is_approved = false
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Crear organización automáticamente para nuevos usuarios (NO aprobada)
  INSERT INTO public.organizations (name, slug, is_approved)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Team',
    NEW.id::text,
    false  -- Pendiente de aprobación
  )
  RETURNING id INTO new_org_id;

  -- Agregar usuario como admin de su organización
  INSERT INTO public.team_members (user_id, organization_id, role, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    new_org_id,
    'admin',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$;

-- 7. Agregar super-admin inicial (jogedu@gmail.com)
-- Primero aprobar su organización actual
UPDATE public.organizations
SET is_approved = true, approved_at = now()
WHERE id = (
  SELECT organization_id 
  FROM public.team_members 
  WHERE email = 'jogedu@gmail.com' 
  LIMIT 1
);

-- Insertar como super-admin
INSERT INTO public.super_admins (user_id)
SELECT user_id 
FROM public.team_members 
WHERE email = 'jogedu@gmail.com'
ON CONFLICT (user_id) DO NOTHING;