-- Allow super admins to insert team members into any organization
CREATE POLICY "Super admins can insert team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- Allow super admins to update team members in any organization
CREATE POLICY "Super admins can update team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (is_super_admin());

-- Allow super admins to view all team members
CREATE POLICY "Super admins can view all team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (is_super_admin());