import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface OverdueInstallment {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  days_overdue: number;
  contract_number: string;
  contact_name: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string;
  project_name: string;
}

export interface OverdueGroup {
  contract_id: string;
  contract_number: string;
  contact_name: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string;
  project_name: string;
  total_overdue: number;
  installments: OverdueInstallment[];
}

export function usePortfolioOverdue() {
  const query = useQuery({
    queryKey: ['portfolio-overdue'],
    queryFn: async () => {
      // Trigger overdue detection
      await (supabase.rpc as any)('update_overdue_installments').catch(() => {});

      const { data, error } = await supabase
        .from('portfolio_payment_schedule')
        .select('*, portfolio_contracts!portfolio_payment_schedule_contract_id_fkey(id, contract_number, contacts!portfolio_contracts_contact_id_fkey(first_name, last_name, email, phone, mobile, whatsapp_number), real_estate_projects!portfolio_contracts_project_id_fkey(name))')
        .eq('status', 'overdue')
        .order('due_date', { ascending: true });
      if (error) throw error;

      const today = new Date();
      return (data || []).map((row: any) => {
        const contract = row.portfolio_contracts;
        const contact = contract?.contacts;
        const dueDate = new Date(row.due_date);
        const diffTime = today.getTime() - dueDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        return {
          id: row.id,
          contract_id: row.contract_id,
          installment_number: row.installment_number,
          due_date: row.due_date,
          total_amount: row.total_amount,
          paid_amount: row.paid_amount,
          pending_amount: row.total_amount - row.paid_amount,
          days_overdue: daysOverdue,
          contract_number: contract?.contract_number || '',
          contact_name: `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim(),
          contact_phone: contact?.mobile || contact?.phone || null,
          contact_whatsapp: contact?.whatsapp_number || contact?.mobile || null,
          contact_email: contact?.email || '',
          project_name: contract?.real_estate_projects?.name || '',
        } as OverdueInstallment;
      });
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  const grouped = useMemo(() => {
    const items = query.data || [];
    const map = new Map<string, OverdueGroup>();
    for (const item of items) {
      if (!map.has(item.contract_id)) {
        map.set(item.contract_id, {
          contract_id: item.contract_id,
          contract_number: item.contract_number,
          contact_name: item.contact_name,
          contact_phone: item.contact_phone,
          contact_whatsapp: item.contact_whatsapp,
          contact_email: item.contact_email,
          project_name: item.project_name,
          total_overdue: 0,
          installments: [],
        });
      }
      const group = map.get(item.contract_id)!;
      group.total_overdue += item.pending_amount;
      group.installments.push(item);
    }
    return Array.from(map.values()).sort((a, b) => b.total_overdue - a.total_overdue);
  }, [query.data]);

  return {
    overdueInstallments: query.data || [],
    overdueGroups: grouped,
    totalOverdueAmount: grouped.reduce((s, g) => s + g.total_overdue, 0),
    overdueContractsCount: grouped.length,
    isLoading: query.isLoading,
  };
}

export function usePortfolioUpcoming(daysAhead = 7) {
  return useQuery({
    queryKey: ['portfolio-upcoming', daysAhead],
    queryFn: async () => {
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('portfolio_payment_schedule')
        .select('*, portfolio_contracts!portfolio_payment_schedule_contract_id_fkey(contract_number, contacts!portfolio_contracts_contact_id_fkey(first_name, last_name, email, mobile, phone))')
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', future.toISOString().split('T')[0])
        .order('due_date', { ascending: true });
      if (error) throw error;

      return (data || []).map((row: any) => {
        const contract = row.portfolio_contracts;
        const contact = contract?.contacts;
        return {
          id: row.id,
          installment_number: row.installment_number,
          due_date: row.due_date,
          total_amount: row.total_amount,
          paid_amount: row.paid_amount,
          contract_number: contract?.contract_number || '',
          contact_name: `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim(),
          contact_phone: contact?.mobile || contact?.phone || null,
        };
      });
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
