import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Company } from '@/types/crm';
import { toast } from 'sonner';

interface UseCompaniesOptions {
  limit?: number;
  countOnly?: boolean;
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const { limit, countOnly = false } = options;
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', { limit, countOnly }],
    queryFn: async () => {
      // If only count is needed, use head request
      if (countOnly) {
        const { count, error } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        // Return empty array but we'll use count
        return { data: [] as Company[], count: count || 0 };
      }

      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { data: data as Company[], count: data.length };
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
    companies: companies?.data || [],
    companiesCount: companies?.count || 0,
    isLoading,
    createCompany,
    updateCompany,
    deleteCompany,
  };
}
