import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Integration } from '@/types/integrations';

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

  const getIntegration = (provider: 'gmail' | 'whatsapp') => {
    return integrations.find(i => i.provider === provider) || null;
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

  return {
    integrations,
    isLoading,
    error,
    getIntegration,
    enableIntegration,
    disableIntegration,
    updateIntegrationStatus,
  };
}
