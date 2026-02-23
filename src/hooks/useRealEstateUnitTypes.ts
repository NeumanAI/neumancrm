import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const PROPERTY_TYPE_OPTIONS = [
  { value: 'APTO', label: 'Apartamento' },
  { value: 'CASA', label: 'Casa' },
  { value: 'LOCAL COMERCIAL', label: 'Local Comercial' },
  { value: 'BURBUJA', label: 'Burbuja' },
  { value: 'CUARTO UTIL', label: 'Cuarto Útil' },
  { value: 'PARQUEADERO', label: 'Parqueadero' },
] as const;

export const COMMERCIAL_STATUS_OPTIONS = [
  { value: 'Disponible', label: 'Disponible' },
  { value: 'Separado', label: 'Separado' },
  { value: 'Vendido', label: 'Vendido' },
  { value: 'No Disponible', label: 'No Disponible' },
] as const;

export const COMMERCIAL_STATUS_COLORS: Record<string, string> = {
  Disponible: 'bg-green-500/10 text-green-600 border-green-500/20',
  Separado: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Vendido: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'No Disponible': 'bg-red-500/10 text-red-600 border-red-500/20',
};

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
  property_type: string | null;
  nomenclature: string | null;
  floor_number: number | null;
  typology: string | null;
  commercial_status: string;
  buyer_contact_id: string | null;
  separation_date: string | null;
  sale_date: string | null;
  separation_value: number | null;
  sale_balance: number | null;
  organization_id: string | null;
  buyer_contact?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
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
        .select('*, contacts!real_estate_unit_types_buyer_contact_id_fkey(id, first_name, last_name, email)')
        .eq('project_id', projectId!)
        .order('floor_number', { ascending: true, nullsFirst: false })
        .order('nomenclature', { ascending: true, nullsFirst: false })
        .order('created_at');
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        buyer_contact: d.contacts || null,
        contacts: undefined,
      })) as RealEstateUnitType[];
    },
    enabled: !!projectId,
  });

  const createUnitType = useMutation({
    mutationFn: async (input: Partial<RealEstateUnitType> & { project_id: string }) => {
      const { buyer_contact, ...rest } = input as any;
      const { data, error } = await supabase
        .from('real_estate_unit_types')
        .insert(rest as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_unit_types', projectId] });
      toast.success('Unidad creada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateUnitType = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<RealEstateUnitType>) => {
      const { buyer_contact, ...rest } = updates as any;
      const { data, error } = await supabase
        .from('real_estate_unit_types')
        .update(rest as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_unit_types', projectId] });
      toast.success('Unidad actualizada');
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
      toast.success('Unidad eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { unitTypes, isLoading, createUnitType, updateUnitType, deleteUnitType };
}
