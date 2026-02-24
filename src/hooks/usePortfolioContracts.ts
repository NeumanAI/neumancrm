import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

export interface PortfolioContract {
  id: string;
  organization_id: string;
  project_id: string;
  contact_id: string;
  unit_id: string | null;
  contract_number: string;
  fiducia_number: string | null;
  status: string;
  signing_date: string;
  total_price: number;
  separation_amount: number;
  down_payment: number;
  subsidy_amount: number;
  financed_amount: number;
  interest_rate: number;
  term_months: number;
  payment_day: number;
  first_payment_date: string | null;
  monthly_payment: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  contacts?: { id: string; first_name: string | null; last_name: string | null; email: string; phone: string | null; mobile: string | null };
  real_estate_projects?: { id: string; name: string };
  real_estate_unit_types?: { id: string; name: string; nomenclature: string | null };
}

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  defaulted: 'En mora',
  cancelled: 'Cancelado',
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  defaulted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export interface Installment {
  installment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  remaining_balance: number;
}

export function generatePaymentSchedule(
  financedAmount: number,
  interestRate: number,
  termMonths: number,
  paymentDay: number,
  firstPaymentDate: string
): Installment[] {
  const schedule: Installment[] = [];
  const monthlyRate = interestRate / 100;

  let monthlyPayment: number;
  if (monthlyRate === 0) {
    monthlyPayment = financedAmount / termMonths;
  } else {
    monthlyPayment = financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  let balance = financedAmount;
  const startDate = new Date(firstPaymentDate);

  for (let i = 1; i <= termMonths; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance = Math.max(0, balance - principal);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    dueDate.setDate(paymentDay);

    schedule.push({
      installment_number: i,
      due_date: dueDate.toISOString().split('T')[0],
      principal_amount: Math.round(principal * 100) / 100,
      interest_amount: Math.round(interest * 100) / 100,
      total_amount: Math.round(monthlyPayment * 100) / 100,
      remaining_balance: Math.round(balance * 100) / 100,
    });
  }

  return schedule;
}

export function usePortfolioContracts(projectId?: string) {
  const { user } = useAuth();
  const { organization } = useTeam();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const query = useQuery({
    queryKey: ['portfolio-contracts', orgId, projectId],
    queryFn: async () => {
      let q = supabase
        .from('portfolio_contracts')
        .select('*, contacts(id, first_name, last_name, email, phone, mobile), real_estate_projects(id, name), real_estate_unit_types(id, name, nomenclature)')
        .order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PortfolioContract[];
    },
    enabled: !!orgId,
  });

  const createContract = useMutation({
    mutationFn: async (input: {
      contract: Omit<PortfolioContract, 'id' | 'created_at' | 'updated_at' | 'contacts' | 'real_estate_projects' | 'real_estate_unit_types'>;
      schedule: Installment[];
    }) => {
      const { data: contract, error } = await supabase
        .from('portfolio_contracts')
        .insert(input.contract as any)
        .select()
        .single();
      if (error) throw error;

      // Insert schedule in batches of 50
      const batchSize = 50;
      for (let i = 0; i < input.schedule.length; i += batchSize) {
        const batch = input.schedule.slice(i, i + batchSize).map(s => ({
          contract_id: contract.id,
          organization_id: input.contract.organization_id,
          ...s,
        }));
        const { error: schedError } = await supabase
          .from('portfolio_payment_schedule')
          .insert(batch as any);
        if (schedError) throw schedError;
      }

      return contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-contracts'] });
      toast.success('Contrato creado exitosamente');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<PortfolioContract>) => {
      const { error } = await supabase
        .from('portfolio_contracts')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-contracts'] });
      toast.success('Contrato actualizado');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { contracts: query.data || [], isLoading: query.isLoading, createContract, updateContract };
}

export function usePortfolioContract(contractId?: string) {
  return useQuery({
    queryKey: ['portfolio-contract', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_contracts')
        .select('*, contacts(id, first_name, last_name, email, phone, mobile), real_estate_projects(id, name), real_estate_unit_types(id, name, nomenclature)')
        .eq('id', contractId!)
        .single();
      if (error) throw error;
      return data as unknown as PortfolioContract;
    },
    enabled: !!contractId,
  });
}
