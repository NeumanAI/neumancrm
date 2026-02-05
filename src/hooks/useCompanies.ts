import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/crm';
import { toast } from 'sonner';

export function useCompanies() {
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Company[];
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const createCompany = useMutation({
    mutationFn: async (newCompany: Omit<Partial<Company>, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const insertData = { 
        ...newCompany, 
        user_id: user.id,
        name: newCompany.name || ''
      };

      const { data, error } = await supabase
        .from('companies')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa creada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear la empresa: ' + error.message);
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Empresa eliminada');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });

  return {
    companies: companies || [],
    isLoading,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}
