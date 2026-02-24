import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CollectionAction {
  id: string;
  contract_id: string;
  organization_id: string;
  action_type: string;
  result: string | null;
  notes: string | null;
  promise_date: string | null;
  promise_amount: number | null;
  performed_by: string | null;
  performed_at: string;
  created_at: string;
}

export const ACTION_TYPE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  call: 'Llamada',
  visit: 'Visita',
  payment_agreement: 'Acuerdo de pago',
  nota: 'Nota',
};

export const ACTION_TYPE_ICONS: Record<string, string> = {
  whatsapp: '💬',
  email: '📧',
  call: '📞',
  visit: '🏠',
  payment_agreement: '🤝',
  nota: '📝',
};

export function usePortfolioActions(contractId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['portfolio-actions', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_collection_actions')
        .select('*')
        .eq('contract_id', contractId!)
        .order('performed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CollectionAction[];
    },
    enabled: !!contractId,
  });

  const addAction = useMutation({
    mutationFn: async (input: Omit<CollectionAction, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('portfolio_collection_actions')
        .insert(input as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-actions', contractId] });
      toast.success('Gestión registrada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { actions: query.data || [], isLoading: query.isLoading, addAction };
}
