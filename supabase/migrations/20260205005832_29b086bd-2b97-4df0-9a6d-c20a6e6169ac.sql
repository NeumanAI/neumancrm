-- Create enum for project types
CREATE TYPE public.project_type AS ENUM (
  'project', 'real_estate', 'construction', 'business_unit', 
  'department', 'brand', 'product_line', 'location', 'other'
);

-- Create enum for project status
CREATE TYPE public.project_status AS ENUM (
  'active', 'inactive', 'completed', 'cancelled'
);

-- Create enum for contact project status
CREATE TYPE public.contact_project_status AS ENUM (
  'lead', 'qualified', 'customer', 'inactive'
);

-- Create enum for project member roles
CREATE TYPE public.project_member_role AS ENUM (
  'owner', 'admin', 'member', 'viewer'
);

-- 1. Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  type project_type NOT NULL DEFAULT 'project',
  status project_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  revenue_target NUMERIC,
  location TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create contact_projects junction table
CREATE TABLE public.contact_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status contact_project_status NOT NULL DEFAULT 'lead',
  interest_level INTEGER CHECK (interest_level >= 1 AND interest_level <= 5),
  source TEXT,
  notes TEXT,
  added_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_id, project_id)
);

-- 3. Create project_members table
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role project_member_role NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{"can_edit": true, "can_delete": false, "can_manage_members": false}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, team_member_id)
);

-- 4. Add project_id to opportunities
ALTER TABLE public.opportunities ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 5. Add project_id to companies
ALTER TABLE public.companies ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 6. Create indexes for performance
CREATE INDEX idx_projects_organization_id ON public.projects(organization_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_type ON public.projects(type);
CREATE INDEX idx_contact_projects_contact_id ON public.contact_projects(contact_id);
CREATE INDEX idx_contact_projects_project_id ON public.contact_projects(project_id);
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_team_member_id ON public.project_members(team_member_id);
CREATE INDEX idx_opportunities_project_id ON public.opportunities(project_id);
CREATE INDEX idx_companies_project_id ON public.companies(project_id);

-- 7. Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for projects
CREATE POLICY "Users can view org projects"
  ON public.projects FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins and managers can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id() 
    AND (user_has_role('admin') OR user_has_role('manager'))
  );

CREATE POLICY "Admins and managers can update projects"
  ON public.projects FOR UPDATE
  USING (
    organization_id = get_user_organization_id() 
    AND (user_has_role('admin') OR user_has_role('manager'))
  );

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (
    organization_id = get_user_organization_id() 
    AND user_has_role('admin')
  );

-- 9. RLS Policies for contact_projects
CREATE POLICY "Users can view contact projects in org"
  ON public.contact_projects FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can manage contact projects in org"
  ON public.contact_projects FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can update contact projects in org"
  ON public.contact_projects FOR UPDATE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can delete contact projects"
  ON public.contact_projects FOR DELETE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
    AND (user_has_role('admin') OR user_has_role('manager'))
  );

-- 10. RLS Policies for project_members
CREATE POLICY "Users can view project members in org"
  ON public.project_members FOR SELECT
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
  );

CREATE POLICY "Admins can manage project members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
    AND user_has_role('admin')
  );

CREATE POLICY "Admins can update project members"
  ON public.project_members FOR UPDATE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
    AND user_has_role('admin')
  );

CREATE POLICY "Admins can delete project members"
  ON public.project_members FOR DELETE
  USING (
    project_id IN (SELECT id FROM public.projects WHERE organization_id = get_user_organization_id())
    AND user_has_role('admin')
  );

-- 11. Create trigger for updated_at on projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Create trigger for updated_at on contact_projects
CREATE TRIGGER update_contact_projects_updated_at
  BEFORE UPDATE ON public.contact_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Enable realtime for projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;