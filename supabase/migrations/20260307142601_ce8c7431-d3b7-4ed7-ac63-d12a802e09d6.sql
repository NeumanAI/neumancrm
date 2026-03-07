
-- 1. Tabla client_portal_users
CREATE TABLE IF NOT EXISTS public.client_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_by UUID REFERENCES auth.users(id),
  block_reason TEXT,
  last_login_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id),
  UNIQUE(contact_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_cpu_user_id ON public.client_portal_users(user_id);
CREATE INDEX IF NOT EXISTS idx_cpu_contact_id ON public.client_portal_users(contact_id);
CREATE INDEX IF NOT EXISTS idx_cpu_org_id ON public.client_portal_users(organization_id);

ALTER TABLE public.client_portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_user_own" ON public.client_portal_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "team_manage_portal_users" ON public.client_portal_users
  FOR ALL USING (
    organization_id IN (SELECT organization_id FROM public.team_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- 2. verify_portal_email
CREATE OR REPLACE FUNCTION public.verify_portal_email(p_org_slug TEXT, p_email TEXT)
RETURNS TABLE (
  contact_id UUID,
  organization_id UUID,
  first_name TEXT,
  last_name TEXT,
  already_registered BOOLEAN,
  is_blocked BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    c.id AS contact_id,
    c.organization_id,
    c.first_name,
    c.last_name,
    EXISTS(
      SELECT 1 FROM client_portal_users cpu
      WHERE cpu.contact_id = c.id AND cpu.organization_id = c.organization_id
    ) AS already_registered,
    COALESCE((
      SELECT cpu.is_blocked FROM client_portal_users cpu
      WHERE cpu.contact_id = c.id AND cpu.organization_id = c.organization_id
      LIMIT 1
    ), false) AS is_blocked
  FROM contacts c
  JOIN organizations o ON o.id = c.organization_id
  WHERE o.slug = p_org_slug
    AND lower(c.email) = lower(p_email)
    AND (o.settings->>'portal_enabled')::boolean = true
  LIMIT 1;
$$;

-- 3. get_portal_session
CREATE OR REPLACE FUNCTION public.get_portal_session(p_user_id UUID)
RETURNS TABLE (
  contact_id UUID,
  organization_id UUID,
  org_slug TEXT,
  org_name TEXT,
  org_logo TEXT,
  org_primary_color TEXT,
  org_secondary_color TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_email TEXT,
  is_blocked BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cpu.contact_id,
    cpu.organization_id,
    o.slug AS org_slug,
    o.name AS org_name,
    o.logo_url AS org_logo,
    o.primary_color AS org_primary_color,
    o.secondary_color AS org_secondary_color,
    c.first_name AS contact_first_name,
    c.last_name AS contact_last_name,
    c.email AS contact_email,
    cpu.is_blocked
  FROM client_portal_users cpu
  JOIN organizations o ON o.id = cpu.organization_id
  JOIN contacts c ON c.id = cpu.contact_id
  WHERE cpu.user_id = p_user_id
  LIMIT 1;
$$;

-- 4. register_portal_user
CREATE OR REPLACE FUNCTION public.register_portal_user(p_user_id UUID, p_contact_id UUID, p_organization_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO client_portal_users (user_id, contact_id, organization_id)
  VALUES (p_user_id, p_contact_id, p_organization_id)
  ON CONFLICT (contact_id, organization_id)
  DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW();
$$;

-- 5. update_portal_last_login
CREATE OR REPLACE FUNCTION public.update_portal_last_login(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE client_portal_users
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE user_id = p_user_id;
$$;
