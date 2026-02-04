-- =====================================================
-- SISTEMA MULTI-TENANT: ORGANIZACIONES, EQUIPOS, ROLES
-- =====================================================

-- 1. Crear tipo ENUM para roles
CREATE TYPE public.team_role AS ENUM ('admin', 'manager', 'sales_rep', 'viewer');

-- 2. Tabla de organizaciones
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan TEXT NOT NULL DEFAULT 'starter',
  max_users INTEGER NOT NULL DEFAULT 3,
  settings JSONB DEFAULT '{"timezone": "America/Mexico_City", "currency": "MXN", "date_format": "DD/MM/YYYY"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de miembros del equipo (con roles separados - SEGURIDAD CRÍTICA)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role team_role NOT NULL DEFAULT 'sales_rep',
  full_name TEXT,
  avatar_url TEXT,
  email TEXT NOT NULL,
  quota_monthly NUMERIC DEFAULT 0,
  quota_quarterly NUMERIC DEFAULT 0,
  deals_closed_value NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  invited_by UUID,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 4. Tabla de activity feed
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabla de comentarios con @menciones
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Agregar columnas a tablas existentes
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.opportunities 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- =====================================================
-- FUNCIONES SECURITY DEFINER (EVITAR RECURSION RLS)
-- =====================================================

-- 7. Función para obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.team_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$;

-- 8. Función para verificar si usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.user_has_role(_role team_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = auth.uid()
      AND role = _role
      AND is_active = true
  )
$$;

-- 9. Función para verificar membresía en organización
CREATE OR REPLACE FUNCTION public.user_is_org_member(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND is_active = true
  )
$$;

-- 10. Función para obtener rol del usuario en su organización
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS team_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.team_members
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$;

-- =====================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS
-- =====================================================

-- Organizations: usuarios ven solo su organización
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
TO authenticated
USING (id = public.get_user_organization_id());

CREATE POLICY "Admins can update their organization"
ON public.organizations FOR UPDATE
TO authenticated
USING (id = public.get_user_organization_id() AND public.user_has_role('admin'));

-- Team Members: usuarios ven miembros de su organización
CREATE POLICY "Users can view team members"
ON public.team_members FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can insert team members"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id() AND public.user_has_role('admin'));

CREATE POLICY "Admins can update team members"
ON public.team_members FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.user_has_role('admin'));

CREATE POLICY "Admins can delete team members"
ON public.team_members FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND public.user_has_role('admin'));

-- Activity Feed: usuarios ven actividad de su organización
CREATE POLICY "Users can view org activity"
ON public.activity_feed FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert activity"
ON public.activity_feed FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

-- Comments: usuarios ven y crean comentarios en su organización
CREATE POLICY "Users can view org comments"
ON public.comments FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert comments"
ON public.comments FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update own comments"
ON public.comments FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
ON public.comments FOR DELETE
TO authenticated
USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- TRIGGER PARA AUTO-CREAR ORGANIZACIÓN AL REGISTRAR
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Crear organización automáticamente para nuevos usuarios
  INSERT INTO public.organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Team',
    NEW.id::text
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

-- Crear trigger en auth.users
CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_organization();

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;