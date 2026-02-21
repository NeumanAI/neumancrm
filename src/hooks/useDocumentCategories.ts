import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { CustomDocumentCategory, BASE_DOCUMENT_CATEGORIES } from '@/types/documents';
import { toast } from 'sonner';

export function useDocumentCategories() {
  const { user } = useAuth();
  const { organization } = useTeam();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const categoriesQuery = useQuery({
    queryKey: ['document-categories', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CustomDocumentCategory[];
    },
    enabled: !!orgId && !!user,
  });

  const allCategories = [
    ...BASE_DOCUMENT_CATEGORIES.map(c => ({ value: c.value, label: c.label, isCustom: false })),
    ...(categoriesQuery.data || []).map(c => ({ value: c.slug, label: c.name, isCustom: true })),
  ];

  const createCategory = useMutation({
    mutationFn: async (params: { name: string; slug: string; color: string; icon?: string }) => {
      if (!orgId) throw new Error('No org');
      const { data, error } = await supabase
        .from('document_categories')
        .insert({ organization_id: orgId, ...params })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-categories', orgId] });
      toast.success('Categoría creada');
    },
    onError: () => toast.error('Error al crear categoría'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...params }: { id: string; name?: string; color?: string; icon?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from('document_categories')
        .update(params)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-categories', orgId] });
      toast.success('Categoría actualizada');
    },
    onError: () => toast.error('Error al actualizar categoría'),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-categories', orgId] });
      toast.success('Categoría eliminada');
    },
    onError: () => toast.error('Error al eliminar categoría'),
  });

  return {
    customCategories: categoriesQuery.data || [],
    allCategories,
    isLoading: categoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
