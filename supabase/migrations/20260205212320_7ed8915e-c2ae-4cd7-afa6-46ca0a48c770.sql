-- Fix team_members table to allow invitations without existing user
-- Make user_id nullable for pending invitations
ALTER TABLE team_members ALTER COLUMN user_id DROP NOT NULL;

-- Add pending_email column for tracking invited users before they register
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS pending_email TEXT;

-- Add invitation_status for tracking invitation state
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'active';

-- Create index on pending_email for faster lookups during registration
CREATE INDEX IF NOT EXISTS idx_team_members_pending_email ON team_members(pending_email) WHERE pending_email IS NOT NULL;

-- Create function to auto-link team member when user registers
CREATE OR REPLACE FUNCTION public.link_team_member_on_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update any pending team member invitations for this email
  UPDATE public.team_members
  SET 
    user_id = NEW.id,
    pending_email = NULL,
    invitation_status = 'active',
    is_active = true,
    joined_at = now()
  WHERE pending_email = LOWER(NEW.email)
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run on user registration (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_link_team_member ON auth.users;
CREATE TRIGGER on_auth_user_created_link_team_member
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_team_member_on_registration();

-- Update RLS policies to handle nullable user_id
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
CREATE POLICY "Users can view team members"
  ON team_members
  FOR SELECT
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Admins can insert team members" ON team_members;
CREATE POLICY "Admins can insert team members"
  ON team_members
  FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id() 
    AND user_has_role('admin'::team_role)
  );

DROP POLICY IF EXISTS "Admins can update team members" ON team_members;
CREATE POLICY "Admins can update team members"
  ON team_members
  FOR UPDATE
  USING (
    organization_id = get_user_organization_id() 
    AND user_has_role('admin'::team_role)
  );

DROP POLICY IF EXISTS "Admins can delete team members" ON team_members;
CREATE POLICY "Admins can delete team members"
  ON team_members
  FOR DELETE
  USING (
    organization_id = get_user_organization_id() 
    AND user_has_role('admin'::team_role)
  );