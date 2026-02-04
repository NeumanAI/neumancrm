import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPreferences } from '@/types/integrations';

const defaultPreferences: Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  task_reminders: true,
  deal_updates: true,
  new_contacts: true,
  email_sync: true,
  browser_notifications: false,
  email_notifications: false,
  reminder_hours: 24,
};

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as NotificationPreferences | null;
    },
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      if (preferences) {
        const { error } = await supabase
          .from('notification_preferences')
          .update(updates)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({ ...defaultPreferences, ...updates, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  return {
    preferences: preferences || { ...defaultPreferences } as NotificationPreferences,
    isLoading,
    error,
    updatePreferences,
  };
}
