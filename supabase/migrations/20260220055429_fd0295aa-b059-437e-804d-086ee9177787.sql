
-- ============================================================
-- NeumanCRM — Onboarding expandido
-- ============================================================

-- Expandir tabla onboarding_progress con campos nuevos
ALTER TABLE public.onboarding_progress
  ADD COLUMN IF NOT EXISTS whatsapp       TEXT,
  ADD COLUMN IF NOT EXISTS country        TEXT,
  ADD COLUMN IF NOT EXISTS country_code   TEXT,
  ADD COLUMN IF NOT EXISTS industry       TEXT,
  ADD COLUMN IF NOT EXISTS team_size      TEXT,
  ADD COLUMN IF NOT EXISTS first_goal     TEXT,
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS company_name   TEXT,
  ADD COLUMN IF NOT EXISTS registered_at  TIMESTAMPTZ DEFAULT now();

-- Actualizar total_steps a 6
UPDATE public.onboarding_progress SET total_steps = 6 WHERE total_steps = 5;

-- Expandir tabla organizations con campos del onboarding
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS industry     TEXT,
  ADD COLUMN IF NOT EXISTS country      TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS team_size    TEXT,
  ADD COLUMN IF NOT EXISTS first_goal   TEXT;

-- Expandir tabla team_members con WhatsApp y nombre
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS whatsapp      TEXT,
  ADD COLUMN IF NOT EXISTS display_name  TEXT;

-- Función SECURITY DEFINER para que el super admin vea registros con email
CREATE OR REPLACE FUNCTION public.get_admin_registrations()
RETURNS TABLE(
  user_id uuid,
  preferred_name text,
  whatsapp text,
  country text,
  company_name text,
  industry text,
  team_size text,
  first_goal text,
  completed boolean,
  started_at timestamptz,
  completed_at timestamptz,
  registered_at timestamptz,
  organization_id uuid,
  organization_name text,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    op.user_id,
    op.preferred_name,
    op.whatsapp,
    op.country,
    op.company_name,
    op.industry,
    op.team_size,
    op.first_goal,
    op.completed,
    op.started_at,
    op.completed_at,
    op.registered_at,
    o.id AS organization_id,
    o.name AS organization_name,
    tm.email
  FROM public.onboarding_progress op
  LEFT JOIN public.team_members tm ON tm.user_id = op.user_id AND tm.is_active = true
  LEFT JOIN public.organizations o ON o.id = tm.organization_id
  ORDER BY op.registered_at DESC;
END;
$$;
