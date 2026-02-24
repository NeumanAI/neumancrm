import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMemo } from 'react';

export interface PortfolioInstallment {
  id: string;
  contract_id: string;
  organization_id: string;
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  remaining_balance: number;
  status: string;
  paid_amount: number;
  paid_at: string | null;
  late_fee: number;
  created_at: string;
  updated_at: string;
}

export const INSTALLMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  partial: 'Parcial',
  overdue: 'En mora',
  waived: 'Condonada',
};

export const INSTALLMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  waived: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function usePortfolioSchedule(contractId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['portfolio-schedule', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_payment_schedule')
        .select('*')
        .eq('contract_id', contractId!)
        .order('installment_number', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PortfolioInstallment[];
    },
    enabled: !!contractId,
  });

  const installments = query.data || [];

  const metrics = useMemo(() => {
    const totalPaid = installments.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
    const totalPaidPartial = installments.filter(i => i.status === 'partial').reduce((s, i) => s + i.paid_amount, 0);
    const totalPending = installments.filter(i => ['pending', 'overdue', 'partial'].includes(i.status)).reduce((s, i) => s + (i.total_amount - i.paid_amount), 0);
    const overdueAmount = installments.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total_amount - i.paid_amount), 0);
    const overdueInstallments = installments.filter(i => i.status === 'overdue').length;
    const nextPending = installments.find(i => ['pending', 'overdue', 'partial'].includes(i.status));
    const paidCount = installments.filter(i => i.status === 'paid').length;

    return { totalPaid: totalPaid + totalPaidPartial, totalPending, overdueAmount, overdueInstallments, nextPending, paidCount };
  }, [installments]);

  const registerPayment = useMutation({
    mutationFn: async (input: {
      installmentId: string;
      amount: number;
      paymentMethod: string;
      bankReference?: string;
      paymentDate: string;
      notes?: string;
      contractId: string;
      organizationId: string;
      recordedBy: string;
    }) => {
      // Get current installment
      const { data: inst, error: fetchErr } = await supabase
        .from('portfolio_payment_schedule')
        .select('*')
        .eq('id', input.installmentId)
        .single();
      if (fetchErr) throw fetchErr;

      const currentInst = inst as unknown as PortfolioInstallment;
      const newPaidAmount = currentInst.paid_amount + input.amount;
      const isPaidInFull = newPaidAmount >= currentInst.total_amount;

      // Update installment
      const { error: updErr } = await supabase
        .from('portfolio_payment_schedule')
        .update({
          paid_amount: newPaidAmount,
          status: isPaidInFull ? 'paid' : 'partial',
          paid_at: new Date().toISOString(),
        } as any)
        .eq('id', input.installmentId);
      if (updErr) throw updErr;

      // Insert payment record
      const { error: payErr } = await supabase
        .from('portfolio_payments')
        .insert({
          contract_id: input.contractId,
          installment_id: input.installmentId,
          organization_id: input.organizationId,
          amount: input.amount,
          payment_method: input.paymentMethod,
          bank_reference: input.bankReference || null,
          payment_date: input.paymentDate,
          notes: input.notes || null,
          recorded_by: input.recordedBy,
        } as any);
      if (payErr) throw payErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-schedule', contractId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-payments', contractId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-contracts'] });
      toast.success('Pago registrado exitosamente');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { installments, isLoading: query.isLoading, metrics, registerPayment };
}
