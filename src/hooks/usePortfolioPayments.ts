import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioPayment {
  id: string;
  contract_id: string;
  installment_id: string | null;
  organization_id: string;
  amount: number;
  payment_method: string;
  bank_reference: string | null;
  payment_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  cheque: 'Cheque',
  pse: 'PSE',
  otro: 'Otro',
};

export function usePortfolioPayments(contractId?: string) {
  const query = useQuery({
    queryKey: ['portfolio-payments', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_payments')
        .select('*')
        .eq('contract_id', contractId!)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PortfolioPayment[];
    },
    enabled: !!contractId,
  });

  return { payments: query.data || [], isLoading: query.isLoading };
}
