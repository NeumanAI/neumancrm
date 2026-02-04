-- Add policy for Super Admins to create organizations (both direct and whitelabel)
CREATE POLICY "Super admins can create organizations" 
ON public.organizations 
FOR INSERT 
WITH CHECK (is_super_admin());