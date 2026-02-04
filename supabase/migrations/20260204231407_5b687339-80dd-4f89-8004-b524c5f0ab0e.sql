-- Add parent_organization_id column for hierarchy
ALTER TABLE public.organizations 
ADD COLUMN parent_organization_id UUID REFERENCES public.organizations(id);

CREATE INDEX idx_organizations_parent ON public.organizations(parent_organization_id);

COMMENT ON COLUMN public.organizations.parent_organization_id IS 
  'ID del reseller padre. NULL = organización raíz (directo o reseller)';

-- Function to check if current user is a reseller admin
CREATE OR REPLACE FUNCTION public.is_reseller_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm
    INNER JOIN public.organizations o ON tm.organization_id = o.id
    WHERE tm.user_id = auth.uid()
      AND tm.role = 'admin'
      AND tm.is_active = true
      AND o.organization_type = 'whitelabel'
  )
$$;

-- Function to get the reseller organization ID of current user
CREATE OR REPLACE FUNCTION public.get_reseller_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.team_members tm
  INNER JOIN public.organizations o ON tm.organization_id = o.id
  WHERE tm.user_id = auth.uid()
    AND tm.role = 'admin'
    AND tm.is_active = true
    AND o.organization_type = 'whitelabel'
  LIMIT 1
$$;

-- RLS Policy: Resellers can view their sub-organizations
CREATE POLICY "Resellers can view their sub-organizations"
ON public.organizations
FOR SELECT
USING (
  parent_organization_id = get_reseller_organization_id()
  AND is_reseller_admin()
);

-- RLS Policy: Resellers can create sub-organizations
CREATE POLICY "Resellers can create sub-organizations"
ON public.organizations
FOR INSERT
WITH CHECK (
  parent_organization_id = get_reseller_organization_id()
  AND is_reseller_admin()
  AND organization_type = 'direct'
);

-- RLS Policy: Resellers can update their sub-organizations
CREATE POLICY "Resellers can update their sub-organizations"
ON public.organizations
FOR UPDATE
USING (
  parent_organization_id = get_reseller_organization_id()
  AND is_reseller_admin()
);