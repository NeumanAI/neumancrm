import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Duplicate, DuplicateStatus, DuplicateEntityType } from '@/types/data-management';
import { useToast } from '@/hooks/use-toast';

export function useDuplicates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: duplicates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['duplicates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duplicates')
        .select('*')
        .eq('status', 'pending')
        .order('similarity_score', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as unknown as Duplicate[];
    },
  });

  const updateDuplicateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      mergedInto,
    }: {
      id: string;
      status: DuplicateStatus;
      mergedInto?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const updates: Record<string, unknown> = {
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      if (mergedInto) {
        updates.merged_into = mergedInto;
      }

      const { data, error } = await supabase
        .from('duplicates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Duplicate;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
      
      const messages: Record<DuplicateStatus, string> = {
        merged: 'Registros fusionados exitosamente',
        dismissed: 'Marcado como no duplicado',
        ignored: 'Duplicado ignorado',
        pending: '',
      };
      
      if (messages[variables.status]) {
        toast({
          title: messages[variables.status],
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar duplicado',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const scanForDuplicates = useMutation({
    mutationFn: async (entityType?: DuplicateEntityType) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Call the edge function to scan for duplicates
      const response = await supabase.functions.invoke('scan-duplicates', {
        body: { entity_type: entityType },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['duplicates'] });
      toast({
        title: 'Escaneo completado',
        description: `Se encontraron ${data?.count || 0} posibles duplicados.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al escanear duplicados',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getDuplicateWithEntities = async (duplicate: Duplicate) => {
    const table = duplicate.entity_type;
    
    const [entity1Result, entity2Result] = await Promise.all([
      supabase.from(table).select('*').eq('id', duplicate.entity_id_1).single(),
      supabase.from(table).select('*').eq('id', duplicate.entity_id_2).single(),
    ]);

    return {
      ...duplicate,
      entity_1: entity1Result.data,
      entity_2: entity2Result.data,
    };
  };

  return {
    duplicates,
    isLoading,
    error,
    refetch,
    updateDuplicateStatus,
    scanForDuplicates,
    getDuplicateWithEntities,
  };
}
