import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExportJob, ExportFormat, ExportFilters } from '@/types/data-management';
import { useToast } from '@/hooks/use-toast';

export function useExportJobs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: exportJobs = [], isLoading, error } = useQuery({
    queryKey: ['export-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as unknown as ExportJob[];
    },
  });

  const createExportJob = useMutation({
    mutationFn: async ({
      entityTypes,
      format,
      filters,
    }: {
      entityTypes: string[];
      format: ExportFormat;
      filters?: ExportFilters;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const insertData = {
        user_id: user.id,
        entity_type: entityTypes.join(','),
        format,
        filters: filters || null,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('export_jobs')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ExportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear exportación',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateExportJob = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ExportJob>;
    }) => {
      const { data, error } = await supabase
        .from('export_jobs')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ExportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-jobs'] });
    },
  });

  const getExportJob = async (id: string): Promise<ExportJob | null> => {
    const { data, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as unknown as ExportJob;
  };

  return {
    exportJobs,
    isLoading,
    error,
    createExportJob,
    updateExportJob,
    getExportJob,
  };
}
