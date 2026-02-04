import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Integration, IntegrationProvider, ManyChatConfig, WebchatConfig, ManyChatChannel } from '@/types/integrations';

export function useIntegrations() {
  const queryClient = useQueryClient();

  const { data: integrations = [], isLoading, error } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('provider');
      
      if (error) throw error;
      return data as Integration[];
    },
  });

  const getIntegration = (provider: IntegrationProvider) => {
    return integrations.find(i => i.provider === provider) || null;
  };

  const getManyChatConfig = (): ManyChatConfig | null => {
    const integration = getIntegration('manychat');
    if (!integration?.metadata) return null;
    return integration.metadata as ManyChatConfig;
  };

  const getWebchatConfig = (): WebchatConfig | null => {
    const integration = getIntegration('webchat');
    if (!integration?.metadata) return null;
    return integration.metadata as WebchatConfig;
  };

  const enableIntegration = useMutation({
    mutationFn: async ({ provider, metadata }: { provider: string; metadata?: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const { error } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          provider,
          is_active: true,
          sync_status: 'idle',
          metadata: metadata || {},
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const disableIntegration = useMutation({
    mutationFn: async (provider: string) => {
      const { error } = await supabase
        .from('integrations')
        .update({ is_active: false })
        .eq('provider', provider);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const updateIntegrationStatus = useMutation({
    mutationFn: async ({ provider, status, errorMessage }: { provider: string; status: string; errorMessage?: string }) => {
      const { error } = await supabase
        .from('integrations')
        .update({ 
          sync_status: status,
          error_message: errorMessage || null,
          last_synced_at: status === 'idle' ? new Date().toISOString() : undefined
        })
        .eq('provider', provider);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const updateIntegrationMetadata = useMutation({
    mutationFn: async ({ provider, metadata }: { provider: string; metadata: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      // Get existing integration to merge metadata
      const existing = getIntegration(provider as IntegrationProvider);
      const mergedMetadata = {
        ...(existing?.metadata || {}),
        ...metadata
      };

      const { error } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          provider,
          is_active: existing?.is_active ?? true,
          sync_status: existing?.sync_status ?? 'idle',
          metadata: mergedMetadata,
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // ManyChat specific mutations
  const saveManyChatApiKey = useMutation({
    mutationFn: async (apiKey: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('save-integration-secret', {
        body: { provider: 'manychat', api_key: apiKey },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const testManyChatConnection = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No autenticado');

      const { data, error } = await supabase.functions.invoke('test-manychat-connection', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const updateManyChatChannels = useMutation({
    mutationFn: async (channels: ManyChatChannel[]) => {
      const config = getManyChatConfig();
      await updateIntegrationMetadata.mutateAsync({
        provider: 'manychat',
        metadata: {
          ...config,
          channels_enabled: channels
        }
      });
    },
  });

  // Webchat specific mutations
  const updateWebchatConfig = useMutation({
    mutationFn: async (config: Partial<WebchatConfig>) => {
      const existing = getWebchatConfig();
      await updateIntegrationMetadata.mutateAsync({
        provider: 'webchat',
        metadata: {
          widget_enabled: config.widget_enabled ?? existing?.widget_enabled ?? false,
          n8n_webhook_url: config.n8n_webhook_url ?? existing?.n8n_webhook_url,
          widget_config: {
            ...(existing?.widget_config || {
              position: 'bottom-right',
              primary_color: '#3B82F6',
              welcome_message: '¡Hola! ¿En qué podemos ayudarte?'
            }),
            ...config.widget_config
          }
        }
      });
    },
  });

  return {
    integrations,
    isLoading,
    error,
    getIntegration,
    getManyChatConfig,
    getWebchatConfig,
    enableIntegration,
    disableIntegration,
    updateIntegrationStatus,
    updateIntegrationMetadata,
    // ManyChat
    saveManyChatApiKey,
    testManyChatConnection,
    updateManyChatChannels,
    // Webchat
    updateWebchatConfig,
  };
}
