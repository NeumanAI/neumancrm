import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

export interface AdvisorHistoryEntry {
  id: string;
  contact_id: string;
  organization_id: string;
  previous_advisor_id: string | null;
  new_advisor_id: string;
  transferred_by: string;
  reason: string | null;
  transfer_type: string;
  created_at: string;
  // Joined fields
  previous_advisor_name?: string;
  new_advisor_name?: string;
  transferred_by_name?: string;
}

export function useAdvisors() {
  const { organization, teamMembers } = useTeam();

  const advisors = teamMembers.filter(
    (m) => m.is_active && ['admin', 'manager', 'sales_rep'].includes(m.role)
  );

  return { advisors, organizationId: organization?.id };
}

export function useContactAdvisorHistory(contactId: string | undefined) {
  const { teamMembers } = useTeam();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['contact_advisor_history', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('contact_advisor_history' as any)
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((entry: any) => ({
        ...entry,
        previous_advisor_name: teamMembers.find((m) => m.user_id === entry.previous_advisor_id)?.full_name || null,
        new_advisor_name: teamMembers.find((m) => m.user_id === entry.new_advisor_id)?.full_name || null,
        transferred_by_name: teamMembers.find((m) => m.user_id === entry.transferred_by)?.full_name || null,
      })) as AdvisorHistoryEntry[];
    },
    enabled: !!contactId && teamMembers.length > 0,
  });

  return { history, isLoading };
}

export function useAssignAdvisor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { organization } = useTeam();

  const assignAdvisor = useMutation({
    mutationFn: async ({
      contactId,
      newAdvisorId,
      previousAdvisorId,
      reason,
      transferType = 'manual',
    }: {
      contactId: string;
      newAdvisorId: string;
      previousAdvisorId?: string | null;
      reason?: string;
      transferType?: string;
    }) => {
      if (!user || !organization) throw new Error('No autenticado');

      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          assigned_advisor_id: newAdvisorId,
          assigned_at: new Date().toISOString(),
        } as any)
        .eq('id', contactId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('contact_advisor_history' as any)
        .insert({
          contact_id: contactId,
          organization_id: organization.id,
          previous_advisor_id: previousAdvisorId || null,
          new_advisor_id: newAdvisorId,
          transferred_by: user.id,
          reason: reason || null,
          transfer_type: transferType,
        });

      if (historyError) console.error('Error recording history:', historyError);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ['contact_advisor_history', variables.contactId] });
      toast.success('Asesor asignado correctamente');
    },
    onError: (error) => {
      toast.error('Error al asignar asesor: ' + (error as Error).message);
    },
  });

  const bulkTransfer = useMutation({
    mutationFn: async ({
      contactIds,
      newAdvisorId,
      reason,
    }: {
      contactIds: string[];
      newAdvisorId: string;
      reason?: string;
    }) => {
      if (!user || !organization) throw new Error('No autenticado');

      // Get current advisors for history
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, assigned_advisor_id')
        .in('id', contactIds);

      // Update all contacts
      const { error } = await supabase
        .from('contacts')
        .update({
          assigned_advisor_id: newAdvisorId,
          assigned_at: new Date().toISOString(),
        } as any)
        .in('id', contactIds);

      if (error) throw error;

      // Record history for each
      const historyEntries = (contacts || []).map((c: any) => ({
        contact_id: c.id,
        organization_id: organization.id,
        previous_advisor_id: c.assigned_advisor_id || null,
        new_advisor_id: newAdvisorId,
        transferred_by: user.id,
        reason: reason || 'Traspaso masivo',
        transfer_type: 'bulk',
      }));

      if (historyEntries.length > 0) {
        await supabase.from('contact_advisor_history' as any).insert(historyEntries);
      }

      return contactIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact_advisor_history'] });
      toast.success(`${count} contactos traspasados`);
    },
    onError: (error) => {
      toast.error('Error en traspaso masivo: ' + (error as Error).message);
    },
  });

  return { assignAdvisor, bulkTransfer };
}

export function useAdvisorMetrics(period: 'month' | 'quarter' | 'year' = 'month') {
  const { organization, teamMembers } = useTeam();
  const advisors = teamMembers.filter(
    (m) => m.is_active && ['admin', 'manager', 'sales_rep'].includes(m.role)
  );

  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['advisor_metrics', organization?.id, period],
    queryFn: async () => {
      if (!organization) return [];

      const now = new Date();
      let startDate: Date;
      if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), q, 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Get contacts with advisor info
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, contact_type, assigned_advisor_id, created_at')
        .eq('organization_id', organization.id);

      // Get sold units
      const { data: units } = await supabase
        .from('real_estate_unit_types')
        .select('id, closing_advisor_id, sale_date, price, commercial_status')
        .eq('organization_id', organization.id);

      return advisors.map((advisor) => {
        const advisorContacts = (contacts || []).filter(
          (c: any) => c.assigned_advisor_id === advisor.user_id
        );
        const prospectos = advisorContacts.filter((c: any) => c.contact_type === 'prospecto').length;
        const compradores = advisorContacts.filter((c: any) => c.contact_type === 'comprador').length;
        const totalContacts = advisorContacts.length;

        const advisorUnits = (units || []).filter(
          (u: any) =>
            u.closing_advisor_id === advisor.user_id &&
            u.commercial_status === 'Vendido' &&
            u.sale_date &&
            new Date(u.sale_date) >= startDate
        );
        const unitsSold = advisorUnits.length;
        const salesValue = advisorUnits.reduce((s: number, u: any) => s + (u.price || 0), 0);
        const conversionRate = totalContacts > 0 ? Math.round((compradores / totalContacts) * 100) : 0;

        return {
          advisor_id: advisor.user_id,
          advisor_name: advisor.full_name || advisor.email,
          avatar_url: advisor.avatar_url,
          role: advisor.role,
          prospectos,
          compradores,
          total_contacts: totalContacts,
          units_sold: unitsSold,
          sales_value: salesValue,
          conversion_rate: conversionRate,
        };
      });
    },
    enabled: !!organization && advisors.length > 0,
    staleTime: 60000,
  });

  return { metrics, isLoading };
}
