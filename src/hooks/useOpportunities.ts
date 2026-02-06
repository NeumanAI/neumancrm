import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Opportunity, Pipeline, Stage } from '@/types/crm';
import { toast } from 'sonner';

export function usePipeline() {
  const queryClient = useQueryClient();

  const { data: pipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('is_default', true)
        .single();
      
      if (error) throw error;
      return data as Pipeline;
    },
  });

  const { data: stages, isLoading: stagesLoading } = useQuery({
    queryKey: ['stages', pipeline?.id],
    enabled: !!pipeline?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('pipeline_id', pipeline!.id)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as Stage[];
    },
  });

  const createPipeline = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Create pipeline
      const { data: newPipeline, error: pipelineError } = await supabase
        .from('pipelines')
        .insert({ user_id: user.id, name: 'Pipeline de Ventas', is_default: true })
        .select()
        .single();
      
      if (pipelineError) throw pipelineError;

      // Create default stages
      const defaultStages = [
        { name: 'Lead', position: 0, color: '#94A3B8', probability: 10 },
        { name: 'Calificado', position: 1, color: '#3B82F6', probability: 25 },
        { name: 'Reunión', position: 2, color: '#8B5CF6', probability: 40 },
        { name: 'Propuesta', position: 3, color: '#F59E0B', probability: 60 },
        { name: 'Negociación', position: 4, color: '#EC4899', probability: 80 },
        { name: 'Ganado', position: 5, color: '#10B981', probability: 100, is_closed_won: true },
        { name: 'Perdido', position: 6, color: '#EF4444', probability: 0, is_closed_lost: true },
      ];

      const { error: stagesError } = await supabase
        .from('stages')
        .insert(defaultStages.map(s => ({ ...s, pipeline_id: newPipeline.id })));
      
      if (stagesError) throw stagesError;

      return newPipeline;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['stages'] });
    },
  });

  return {
    pipeline,
    stages: stages || [],
    isLoading: pipelineLoading || stagesLoading,
    createPipeline,
  };
}

interface UseOpportunitiesOptions {
  limit?: number;
  status?: 'open' | 'won' | 'lost';
  enabled?: boolean;
}

export function useOpportunities(options: UseOpportunitiesOptions = {}) {
  const { limit, status, enabled = true } = options;
  const queryClient = useQueryClient();

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['opportunities', { limit, status }],
    queryFn: async () => {
      let query = supabase
        .from('opportunities')
        .select('*, companies(id, name), contacts(id, first_name, last_name), stages(id, name, color)')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const createOpportunity = useMutation({
    mutationFn: async (newOpp: Omit<Partial<Opportunity>, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const insertData = { 
        ...newOpp, 
        user_id: user.id,
        title: newOpp.title || ''
      };

      const { data, error } = await supabase
        .from('opportunities')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Oportunidad creada');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const updateOpportunity = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Opportunity> & { id: string }) => {
      const { data, error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const deleteOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Oportunidad eliminada');
    },
  });

  return {
    opportunities: opportunities || [],
    isLoading,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
  };
}
