
-- 1. Table to track user's active organization for RLS
CREATE TABLE public.user_active_organization (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_active_organization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own active org"
  ON public.user_active_organization FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can upsert own active org"
  ON public.user_active_organization FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own active org"
  ON public.user_active_organization FOR UPDATE
  USING (user_id = auth.uid());

-- 2. Update get_user_organization_id() to use active org table
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT uao.organization_id
     FROM public.user_active_organization uao
     INNER JOIN public.team_members tm ON tm.user_id = uao.user_id AND tm.organization_id = uao.organization_id AND tm.is_active = true
     WHERE uao.user_id = auth.uid()),
    (SELECT tm2.organization_id
     FROM public.team_members tm2
     WHERE tm2.user_id = auth.uid() AND tm2.is_active = true
     LIMIT 1)
  )
$function$;

-- 3. Create 2 new organizations
INSERT INTO public.organizations (name, slug, is_approved, industry_vertical, plan, organization_type)
VALUES
  ('StarterCRM Dev', 'startercrm-dev', true, 'general', 'starter', 'direct'),
  ('Openmedic Dev', 'openmedic-dev', true, 'health', 'starter', 'direct');

-- 4. Rename existing org
UPDATE public.organizations SET name = 'BitanAI Dev' WHERE id = '5179d17c-7107-46ea-ba1a-88a029bf74d9';

-- 5. Create team_members for the new orgs
INSERT INTO public.team_members (user_id, organization_id, role, email, full_name, is_active)
SELECT 'e595967d-a0cc-4cf2-ba94-32aa81d3eee0', o.id, 'admin', 'jogedu@gmail.com', 'jogedu', true
FROM public.organizations o WHERE o.slug IN ('startercrm-dev', 'openmedic-dev');

-- 6. Seed the active org to the current one
INSERT INTO public.user_active_organization (user_id, organization_id)
VALUES ('e595967d-a0cc-4cf2-ba94-32aa81d3eee0', '5179d17c-7107-46ea-ba1a-88a029bf74d9');
