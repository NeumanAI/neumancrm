import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RealEstateUnitType {
  id: string;
  project_id: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  area_m2: number | null;
  price: number | null;
  currency: string;
  total_count: number;
  available_count: number;
  floor_plan_url: string | null;
  features: string[];
  created_at: string;
  updated_at: string;
}

export function useRealEstateUnitTypes(projectId?: string) {
  const queryClient = useQueryClient();

  const { data: unitTypes = [], isLoading } = useQuery({
    queryKey: ['real_estate_unit_types', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('real_estate_unit_types')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at');
      if (error) throw error;
      return data as unknown as RealEstateUnitType[];
    },
    enabled: !!projectId,
  });

  const createUnitType = useMutation({
    mutationFn: async (input: Partial<RealEstateUnitType> & { project_id: string }) => {
      const { data, error } = await supabase
        .from('real_estate_unit_types')
        .insert(input as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_unit_types', projectId] });
      toast.success('Tipo de unidad creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateUnitType = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<RealEstateUnitType>) => {
      const { data, error } = await supabase
        .from('real_estate_unit_types')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_unit_types', projectId] });
      toast.success('Tipo de unidad actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteUnitType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('real_estate_unit_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_unit_types', projectId] });
      toast.success('Tipo de unidad eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { unitTypes, isLoading, createUnitType, updateUnitType, deleteUnitType };
}
