import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ImportJob, ImportSettings, EntityType } from '@/types/data-management';
import { useToast } from '@/hooks/use-toast';

export function useImportJobs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: importJobs = [], isLoading, error } = useQuery({
    queryKey: ['import-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as unknown as ImportJob[];
    },
    refetchInterval: 5000, // Poll every 5 seconds to catch updates
  });

  const createImportJob = useMutation({
    mutationFn: async ({
      filename,
      fileSize,
      entityType,
      columnMapping,
      importSettings,
      totalRows,
    }: {
      filename: string;
      fileSize: number;
      entityType: EntityType;
      columnMapping: Record<string, string>;
      importSettings: ImportSettings;
      totalRows: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const insertData = {
        user_id: user.id,
        filename,
        file_size: fileSize,
        entity_type: entityType,
        column_mapping: columnMapping,
        import_settings: importSettings,
        total_rows: totalRows,
        status: 'pending',
      };

      const { data, error } = await supabase
        .from('import_jobs')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ImportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear importación',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateImportJob = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<ImportJob>;
    }) => {
      const { data, error } = await supabase
        .from('import_jobs')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ImportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
    },
  });

  const cancelImportJob = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('import_jobs')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as ImportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
      toast({
        title: 'Importación cancelada',
        description: 'La importación ha sido cancelada.',
      });
    },
  });

  const retryImportJob = useMutation({
    mutationFn: async (id: string) => {
      // First get the job details
      const { data: job, error: fetchError } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!job) throw new Error('Job not found');

      // Reset the job status
      const { error: updateError } = await supabase
        .from('import_jobs')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          errors: [{ row: 0, field: 'system', error: 'Job marcado como fallido para reintento' }],
        })
        .eq('id', id);

      if (updateError) throw updateError;

      return job as unknown as ImportJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
      toast({
        title: 'Job marcado para reintento',
        description: 'Por favor sube el archivo nuevamente para reintentar la importación.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al reintentar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getImportJob = async (id: string): Promise<ImportJob | null> => {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as unknown as ImportJob;
  };

  return {
    importJobs,
    isLoading,
    error,
    createImportJob,
    updateImportJob,
    cancelImportJob,
    retryImportJob,
    getImportJob,
  };
}
