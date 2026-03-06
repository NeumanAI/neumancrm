CREATE POLICY "Org members can delete broadcast messages"
  ON public.broadcast_messages
  FOR DELETE
  TO authenticated
  USING (campaign_id IN (
    SELECT id FROM broadcast_campaigns
    WHERE organization_id = get_user_organization_id()
  ));