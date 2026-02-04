-- Add branding columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#8B5CF6',
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Create organization_domains table for future multi-domain support
CREATE TABLE IF NOT EXISTS public.organization_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on organization_domains
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;

-- RLS: Super admins can manage all domains
CREATE POLICY "Super admins can manage all domains"
ON public.organization_domains
FOR ALL
USING (is_super_admin());

-- RLS: Org admins can view their own domains (read-only)
CREATE POLICY "Org admins can view their domains"
ON public.organization_domains
FOR SELECT
USING (organization_id = get_user_organization_id());

-- Create index for fast domain lookups
CREATE INDEX IF NOT EXISTS idx_organization_domains_domain ON public.organization_domains(domain);
CREATE INDEX IF NOT EXISTS idx_organizations_custom_domain ON public.organizations(custom_domain) WHERE custom_domain IS NOT NULL;

-- Create a function to get organization by domain (for public access without auth)
CREATE OR REPLACE FUNCTION public.get_organization_by_domain(domain_name TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  secondary_color TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check organization_domains table
  SELECT o.id, o.name, o.logo_url, o.favicon_url, o.primary_color, o.secondary_color
  FROM public.organizations o
  INNER JOIN public.organization_domains od ON o.id = od.organization_id
  WHERE od.domain = domain_name AND od.is_verified = true
  UNION ALL
  -- Then check custom_domain field
  SELECT o.id, o.name, o.logo_url, o.favicon_url, o.primary_color, o.secondary_color
  FROM public.organizations o
  WHERE o.custom_domain = domain_name
  LIMIT 1;
$$;