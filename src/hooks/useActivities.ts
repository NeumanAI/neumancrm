import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from '@/types/crm';
import { toast } from 'sonner';

export function useActivities() {
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, contacts(id, first_name, last_name), companies(id, name), opportunities(id, title)')
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as Activity[];
    },
  });

  const createActivity = useMutation({
    mutationFn: async (newActivity: Omit<Partial<Activity>, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const insertData = { 
        ...newActivity, 
        user_id: user.id,
        type: newActivity.type || 'task',
        title: newActivity.title || ''
      };

      const { data, error } = await supabase
        .from('activities')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Tarea creada');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Activity> & { id: string }) => {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { data, error } = await supabase
        .from('activities')
        .update({ 
          completed, 
          completed_at: completed ? new Date().toISOString() : null 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success(data.completed ? 'Tarea completada' : 'Tarea reabierta');
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast.success('Tarea eliminada');
    },
  });

  return {
    activities: activities || [],
    isLoading,
    createActivity,
    updateActivity,
    toggleComplete,
    deleteActivity,
  };
}
