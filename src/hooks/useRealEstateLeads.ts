import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

export type RealEstateLeadStatus = 
  'new' | 'contacted' | 'interested' | 'visit_scheduled' | 'visited' | 'negotiating' | 'reserved' | 'closed_won' | 'closed_lost';

export const leadStatusLabels: Record<RealEstateLeadStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  interested: 'Interesado',
  visit_scheduled: 'Visita Agendada',
  visited: 'Visitó',
  negotiating: 'En Negociación',
  reserved: 'Reservado',
  closed_won: 'Cerrado Ganado',
  closed_lost: 'Cerrado Perdido',
};

export const leadStatusColors: Record<RealEstateLeadStatus, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  contacted: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  interested: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  visit_scheduled: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  visited: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  negotiating: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  reserved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  closed_won: 'bg-green-500/10 text-green-600 border-green-500/20',
  closed_lost: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export interface RealEstateLead {
  id: string;
  project_id: string;
  contact_id: string;
  unit_type_id: string | null;
  organization_id: string;
  assigned_to: string | null;
  status: RealEstateLeadStatus;
  budget: number | null;
  notes: string | null;
  source: string | null;
  last_contact_at: string | null;
  next_follow_up: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  contacts?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    whatsapp_number: string | null;
  };
  real_estate_unit_types?: {
    id: string;
    name: string;
  } | null;
}

export function useRealEstateLeads(projectId?: string) {
  const { organization } = useTeam();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['real_estate_leads', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('real_estate_leads')
        .select('*, contacts(id, first_name, last_name, email, phone, whatsapp_number), real_estate_unit_types(id, name)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RealEstateLead[];
    },
    enabled: !!projectId,
  });

  const addLead = useMutation({
    mutationFn: async (input: { project_id: string; contact_id: string; source?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('real_estate_leads')
        .insert({
          ...input,
          organization_id: organization!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_leads', projectId] });
      toast.success('Comprador agregado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RealEstateLeadStatus }) => {
      const { data, error } = await supabase
        .from('real_estate_leads')
        .update({ status } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_leads', projectId] });
      toast.success('Estado actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('real_estate_leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_leads', projectId] });
      toast.success('Comprador eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { leads, isLoading, addLead, updateLeadStatus, deleteLead };
}
