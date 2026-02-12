
CREATE OR REPLACE FUNCTION public.get_organization_by_slug(slug_name text)
RETURNS TABLE(id uuid, name text, logo_url text, favicon_url text, primary_color text, secondary_color text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.name, o.logo_url, o.favicon_url, o.primary_color, o.secondary_color
  FROM public.organizations o
  WHERE o.slug = slug_name
  LIMIT 1;
$$;
