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

      // Get org id
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('organization_id')
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .single();

      if (!teamMember) throw new Error('Sin organización');

      // Create campaign
      const { data: newCampaign, error: campError } = await supabase
        .from('broadcast_campaigns')
        .insert([{
          organization_id: teamMember.organization_id,
          created_by: currentUser.id,
          name: campaign.name,
          message_template: campaign.message_template,
          target_type: campaign.target_type,
          target_filters: campaign.target_filters || {},
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

  return {
    twilioIntegration,
    isConfigured,
    whatsappNumber,
    isLoadingIntegration,
    campaigns,
    isLoadingCampaigns,
    templates,
    isLoadingTemplates,
    configureTwilio,
    sendMessage,
    createCampaign,
    launchCampaign,
  };
}
