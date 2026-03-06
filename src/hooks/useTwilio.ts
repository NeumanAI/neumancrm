import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useTwilio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query: Twilio integration status
  const { data: twilioIntegration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['twilio-integration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('provider', 'twilio')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isConfigured = !!(twilioIntegration?.metadata as Record<string, unknown>)?.api_key_configured;
  const whatsappNumber = (twilioIntegration?.metadata as Record<string, string>)?.whatsapp_number || '';

  // Query: campaigns
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['broadcast-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcast_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Query: templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation: configure Twilio credentials
  const configureTwilio = useMutation({
    mutationFn: async (config: { account_sid: string; auth_token: string; whatsapp_number: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('save-integration-secret', {
        body: { provider: 'twilio', api_key: JSON.stringify(config) },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twilio-integration'] });
      toast.success('Credenciales de Twilio guardadas');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Mutation: send individual message
  const sendMessage = useMutation({
    mutationFn: async ({ to, message, contact_id }: { to: string; message: string; contact_id?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('twilio-send-message', {
        body: { to, message, contact_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Mensaje enviado'),
    onError: (err: Error) => toast.error(err.message),
  });

  // Mutation: create campaign
  const createCampaign = useMutation({
    mutationFn: async (campaign: {
      name: string;
      message_template: string;
      target_type: string;
      target_filters?: Record<string, unknown>;
      contact_ids: string[];
      phone_numbers: Record<string, string>; // contact_id -> phone
    }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('No autenticado');

      const { data: orgId } = await supabase.rpc('get_user_organization_id');
      if (!orgId) throw new Error('Sin organización');

      // Create campaign
      const { data: newCampaign, error: campError } = await supabase
        .from('broadcast_campaigns')
        .insert([{
          organization_id: orgId,
          created_by: currentUser.id,
          name: campaign.name,
          message_template: campaign.message_template,
          target_type: campaign.target_type,
          target_filters: (campaign.target_filters || {}) as Record<string, unknown> as any,
          total_recipients: campaign.contact_ids.length,
        }])
        .select()
        .single();

      if (campError) throw campError;

      // Create individual messages
      const messages = campaign.contact_ids.map(cid => ({
        campaign_id: newCampaign.id,
        contact_id: cid,
        phone_number: campaign.phone_numbers[cid],
      }));

      const { error: msgError } = await supabase
        .from('broadcast_messages')
        .insert(messages);

      if (msgError) throw msgError;
      return newCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Campaña creada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Mutation: launch campaign
  const launchCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('twilio-broadcast', {
        body: { campaign_id: campaignId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Campaña lanzada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Mutation: delete campaign
  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      // Delete associated messages first
      const { error: msgError } = await supabase
        .from('broadcast_messages')
        .delete()
        .eq('campaign_id', campaignId);
      if (msgError) throw msgError;

      const { error } = await supabase
        .from('broadcast_campaigns')
        .delete()
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
      toast.success('Campaña eliminada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Query: notification rules
  const { data: notificationRules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ['whatsapp-notification-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_notification_rules')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mutation: toggle notification rule
  const toggleNotificationRule = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { data: orgId } = await supabase.rpc('get_user_organization_id');
      if (!orgId) throw new Error('Sin organización');

      const { error } = await supabase
        .from('whatsapp_notification_rules')
        .upsert(
          { organization_id: orgId, rule_id: ruleId, is_active: isActive, updated_at: new Date().toISOString() },
          { onConflict: 'organization_id,rule_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-notification-rules'] });
      toast.success('Regla actualizada');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return {
    twilioIntegration,
    isConfigured,
    whatsappNumber,
    isLoadingIntegration,
    campaigns,
    isLoadingCampaigns,
    templates,
    isLoadingTemplates,
    notificationRules,
    isLoadingRules,
    configureTwilio,
    sendMessage,
    createCampaign,
    launchCampaign,
    deleteCampaign,
    toggleNotificationRule,
  };
}
