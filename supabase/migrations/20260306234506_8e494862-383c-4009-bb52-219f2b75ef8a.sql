
CREATE TABLE public.whatsapp_notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_id)
);

ALTER TABLE public.whatsapp_notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view rules"
  ON public.whatsapp_notification_rules
  FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert rules"
  ON public.whatsapp_notification_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = get_user_organization_id() AND (user_has_role('admin'::team_role) OR user_has_role('manager'::team_role)));

CREATE POLICY "Admins can update rules"
  ON public.whatsapp_notification_rules
  FOR UPDATE
  TO authenticated
  USING (organization_id = get_user_organization_id() AND (user_has_role('admin'::team_role) OR user_has_role('manager'::team_role)));
