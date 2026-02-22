
-- =============================================
-- Fase 2A: Módulo Inmobiliario - Tablas y Feature Flag
-- =============================================

-- 1. Agregar enabled_modules a organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS enabled_modules JSONB DEFAULT '{}'::jsonb;

-- 2. Crear tabla real_estate_projects
CREATE TABLE public.real_estate_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  -- Ubicación
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  -- Cifras
  total_units INTEGER DEFAULT 0,
  sold_units INTEGER DEFAULT 0,
  reserved_units INTEGER DEFAULT 0,
  available_units INTEGER GENERATED ALWAYS AS (total_units - sold_units - reserved_units) STORED,
  price_from NUMERIC,
  price_to NUMERIC,
  currency TEXT DEFAULT 'MXN',
  -- Progreso
  construction_progress INTEGER DEFAULT 0,
  estimated_delivery DATE,
  -- Media
  cover_image_url TEXT,
  gallery_urls JSONB DEFAULT '[]'::jsonb,
  -- Extras
  amenities JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Crear tabla real_estate_unit_types
CREATE TABLE public.real_estate_unit_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.real_estate_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bedrooms INTEGER DEFAULT 0,
  bathrooms NUMERIC DEFAULT 0,
  area_m2 NUMERIC,
  price NUMERIC,
  currency TEXT DEFAULT 'MXN',
  total_count INTEGER DEFAULT 0,
  available_count INTEGER DEFAULT 0,
  floor_plan_url TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Crear tabla real_estate_leads
CREATE TYPE public.real_estate_lead_status AS ENUM (
  'new', 'contacted', 'interested', 'visit_scheduled', 'visited', 'negotiating', 'reserved', 'closed_won', 'closed_lost'
);

CREATE TABLE public.real_estate_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.real_estate_projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  unit_type_id UUID REFERENCES public.real_estate_unit_types(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_to UUID,
  status public.real_estate_lead_status NOT NULL DEFAULT 'new',
  budget NUMERIC,
  notes TEXT,
  source TEXT,
  last_contact_at TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, contact_id)
);

-- 5. Índices
CREATE INDEX idx_re_projects_org ON public.real_estate_projects(organization_id);
CREATE INDEX idx_re_projects_status ON public.real_estate_projects(status);
CREATE INDEX idx_re_unit_types_project ON public.real_estate_unit_types(project_id);
CREATE INDEX idx_re_leads_project ON public.real_estate_leads(project_id);
CREATE INDEX idx_re_leads_contact ON public.real_estate_leads(contact_id);
CREATE INDEX idx_re_leads_org ON public.real_estate_leads(organization_id);
CREATE INDEX idx_re_leads_status ON public.real_estate_leads(status);

-- 6. RLS
ALTER TABLE public.real_estate_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_unit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_leads ENABLE ROW LEVEL SECURITY;

-- RLS: real_estate_projects
CREATE POLICY "Users can view org real estate projects"
  ON public.real_estate_projects FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create org real estate projects"
  ON public.real_estate_projects FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update org real estate projects"
  ON public.real_estate_projects FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete org real estate projects"
  ON public.real_estate_projects FOR DELETE
  TO authenticated
  USING (organization_id = public.get_user_organization_id() AND (public.user_has_role('admin') OR public.user_has_role('manager')));

-- RLS: real_estate_unit_types (via project org)
CREATE POLICY "Users can view unit types"
  ON public.real_estate_unit_types FOR SELECT
  TO authenticated
  USING (project_id IN (
    SELECT id FROM public.real_estate_projects WHERE organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "Users can manage unit types"
  ON public.real_estate_unit_types FOR INSERT
  TO authenticated
  WITH CHECK (project_id IN (
    SELECT id FROM public.real_estate_projects WHERE organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "Users can update unit types"
  ON public.real_estate_unit_types FOR UPDATE
  TO authenticated
  USING (project_id IN (
    SELECT id FROM public.real_estate_projects WHERE organization_id = public.get_user_organization_id()
  ));

CREATE POLICY "Admins can delete unit types"
  ON public.real_estate_unit_types FOR DELETE
  TO authenticated
  USING (project_id IN (
    SELECT id FROM public.real_estate_projects WHERE organization_id = public.get_user_organization_id()
  ) AND (public.user_has_role('admin') OR public.user_has_role('manager')));

-- RLS: real_estate_leads
CREATE POLICY "Users can view org real estate leads"
  ON public.real_estate_leads FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create org real estate leads"
  ON public.real_estate_leads FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update org real estate leads"
  ON public.real_estate_leads FOR UPDATE
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete org real estate leads"
  ON public.real_estate_leads FOR DELETE
  TO authenticated
  USING (organization_id = public.get_user_organization_id() AND (public.user_has_role('admin') OR public.user_has_role('manager')));

-- 7. Triggers updated_at
CREATE TRIGGER update_re_projects_updated_at
  BEFORE UPDATE ON public.real_estate_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_re_unit_types_updated_at
  BEFORE UPDATE ON public.real_estate_unit_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_re_leads_updated_at
  BEFORE UPDATE ON public.real_estate_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
