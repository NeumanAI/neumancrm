
-- Fix: Replace the overly permissive usage_events INSERT policy with a proper one
-- Events are inserted by the service via edge functions (which run as authenticated users)
DROP POLICY IF EXISTS "Service role can insert events" ON public.usage_events;

-- Allow authenticated users to insert events for their own organization
CREATE POLICY "Org members can insert events" ON public.usage_events
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id() OR is_super_admin());
