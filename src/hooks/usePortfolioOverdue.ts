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

      // Step 1: Fetch overdue installments (NO embedded joins)
      const { data: installments, error } = await supabase
        .from('portfolio_payment_schedule')
        .select('*')
        .eq('status', 'overdue')
        .order('due_date', { ascending: true });
      if (error) {
        console.error('[usePortfolioOverdue] Query error:', error.code, error.message);
        throw error;
      }
      if (!installments || installments.length === 0) return [];

      // Step 2: Get unique contract IDs and fetch contracts
      const contractIds = [...new Set(installments.map(i => i.contract_id))];
      const { data: contracts } = await supabase
        .from('portfolio_contracts')
        .select('id, contract_number, contact_id, project_id')
        .in('id', contractIds);

      const contractMap = new Map((contracts || []).map((c: any) => [c.id, c]));

      // Step 3: Fetch contacts and projects
      const contactIds = [...new Set((contracts || []).map((c: any) => c.contact_id).filter(Boolean))];
      const projectIds = [...new Set((contracts || []).map((c: any) => c.project_id).filter(Boolean))];

      const [contactsRes, projectsRes] = await Promise.all([
        contactIds.length > 0
          ? supabase.from('contacts').select('id, first_name, last_name, email, phone, mobile, whatsapp_number').in('id', contactIds)
          : { data: [] },
        projectIds.length > 0
          ? supabase.from('real_estate_projects').select('id, name').in('id', projectIds)
          : { data: [] },
      ]);

      const contactMap = new Map((contactsRes.data || []).map((c: any) => [c.id, c]));
      const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]));

      // Step 4: Merge
      const today = new Date();
      return installments.map((row: any) => {
        const contract = contractMap.get(row.contract_id);
        const contact = contract ? contactMap.get(contract.contact_id) : null;
        const project = contract ? projectMap.get(contract.project_id) : null;
        const dueDate = new Date(row.due_date);
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

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
          project_name: project?.name || '',
        } as OverdueInstallment;
      });
    },
    refetchInterval: 5 * 60 * 1000,
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
    isError: query.isError,
    error: query.error,
  };
}

export function usePortfolioUpcoming(daysAhead = 7) {
  return useQuery({
    queryKey: ['portfolio-upcoming', daysAhead],
    queryFn: async () => {
      const today = new Date();
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);

      // Step 1: Fetch pending installments (NO embedded joins)
      const { data: installments, error } = await supabase
        .from('portfolio_payment_schedule')
        .select('*')
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', future.toISOString().split('T')[0])
        .order('due_date', { ascending: true });
      if (error) {
        console.error('[usePortfolioUpcoming] Query error:', error.code, error.message);
        throw error;
      }
      if (!installments || installments.length === 0) return [];

      // Step 2: Fetch contracts
      const contractIds = [...new Set(installments.map(i => i.contract_id))];
      const { data: contracts } = await supabase
        .from('portfolio_contracts')
        .select('id, contract_number, contact_id')
        .in('id', contractIds);

      const contractMap = new Map((contracts || []).map((c: any) => [c.id, c]));

      // Step 3: Fetch contacts
      const contactIds = [...new Set((contracts || []).map((c: any) => c.contact_id).filter(Boolean))];
      const { data: contactsData } = contactIds.length > 0
        ? await supabase.from('contacts').select('id, first_name, last_name, email, mobile, phone').in('id', contactIds)
        : { data: [] };

      const contactMap = new Map((contactsData || []).map((c: any) => [c.id, c]));

      // Step 4: Merge
      return installments.map((row: any) => {
        const contract = contractMap.get(row.contract_id);
        const contact = contract ? contactMap.get(contract.contact_id) : null;
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
