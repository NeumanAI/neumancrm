import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

// ── Types ──

export interface PortalSession {
  contact_id: string;
  organization_id: string;
  org_slug: string;
  org_name: string;
  org_logo: string | null;
  org_primary_color: string;
  org_secondary_color: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  is_blocked: boolean;
}

export interface PortalContract {
  id: string;
  contract_number: string;
  status: string;
  total_price: number;
  down_payment: number;
  financed_amount: number;
  project_name: string | null;
  unit_name: string | null;
  created_at: string;
  schedule: PortalInstallment[];
}

export interface PortalInstallment {
  id: string;
  installment_number: number;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  principal_amount: number;
  interest_amount: number;
  late_fee: number;
}

export interface PortalAppointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  meeting_url: string | null;
  description: string | null;
  event_type: string;
}

export interface PortalDocument {
  id: string;
  file_name: string;
  document_type: string;
  file_size: number;
  mime_type: string;
  share_token: string | null;
  created_at: string;
}

export interface PortalUser {
  id: string;
  contact_id: string;
  is_blocked: boolean;
  blocked_at: string | null;
  block_reason: string | null;
  last_login_at: string | null;
  registered_at: string;
  contact_email: string;
  contact_name: string;
}

// ── Client hooks ──

export function usePortalSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['portal-session', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<PortalSession | null> => {
      const { data, error } = await supabase.rpc('get_portal_session', { p_user_id: user!.id } as any);
      if (error) throw error;
      const row = (data as any[])?.[0];
      if (!row) return null;
      // Update last_login in background
      Promise.resolve(supabase.rpc('update_portal_last_login', { p_user_id: user!.id } as any)).catch(() => {});
      return row as PortalSession;
    },
  });
}

export function usePortalContracts(contactId?: string, orgId?: string) {
  return useQuery({
    queryKey: ['portal-contracts', contactId],
    enabled: !!contactId && !!orgId,
    queryFn: async (): Promise<PortalContract[]> => {
      const { data: contracts, error } = await supabase
        .from('portfolio_contracts')
        .select('id, contract_number, status, total_price, down_payment, financed_amount, created_at, real_estate_projects(name), real_estate_unit_types(name)')
        .eq('contact_id', contactId!)
        .eq('organization_id', orgId!);
      if (error) throw error;
      if (!contracts?.length) return [];

      const result: PortalContract[] = [];
      for (const c of contracts) {
        const { data: schedule } = await supabase
          .from('portfolio_payment_schedule')
          .select('*')
          .eq('contract_id', c.id)
          .order('installment_number', { ascending: true });
        result.push({
          id: c.id,
          contract_number: c.contract_number,
          status: c.status,
          total_price: c.total_price || 0,
          down_payment: c.down_payment || 0,
          financed_amount: c.financed_amount || 0,
          project_name: (c as any).real_estate_projects?.name || null,
          unit_name: (c as any).real_estate_unit_types?.name || null,
          created_at: c.created_at,
          schedule: (schedule || []).map((s: any) => ({
            id: s.id,
            installment_number: s.installment_number,
            due_date: s.due_date,
            total_amount: s.total_amount || 0,
            paid_amount: s.paid_amount || 0,
            status: s.status,
            principal_amount: s.principal_amount || 0,
            interest_amount: s.interest_amount || 0,
            late_fee: s.late_fee || 0,
          })),
        });
      }
      return result;
    },
  });
}

export function usePortalAppointments(contactId?: string, orgId?: string) {
  return useQuery({
    queryKey: ['portal-appointments', contactId],
    enabled: !!contactId && !!orgId,
    queryFn: async (): Promise<PortalAppointment[]> => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, end_time, location, meeting_url, description, event_type')
        .eq('contact_id', contactId!)
        .eq('organization_id', orgId!)
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data || []) as PortalAppointment[];
    },
  });
}

export function usePortalDocuments(contactId?: string, orgId?: string) {
  return useQuery({
    queryKey: ['portal-documents', contactId],
    enabled: !!contactId && !!orgId,
    queryFn: async (): Promise<PortalDocument[]> => {
      const { data, error } = await supabase
        .from('contact_documents')
        .select('id, file_name, document_type, file_size, mime_type, share_token, created_at')
        .eq('contact_id', contactId!)
        .eq('organization_id', orgId!)
        .eq('is_shared', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PortalDocument[];
    },
  });
}

// ── Admin hooks ──

export function usePortalSettings() {
  const { organization } = useTeam();
  const queryClient = useQueryClient();

  const isPortalEnabled: boolean = (organization as any)?.settings?.portal_enabled === true;

  const togglePortal = useMutation({
    mutationFn: async (enabled: boolean) => {
      const currentSettings = (organization as any)?.settings || {};
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: { ...currentSettings, portal_enabled: enabled },
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', organization!.id);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'Portal de clientes activado' : 'Portal de clientes desactivado');
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: () => toast.error('Error al actualizar configuración'),
  });

  return { isPortalEnabled, togglePortal };
}

export function usePortalUsers() {
  const { organization } = useTeam();
  const queryClient = useQueryClient();

  const { data: portalUsers = [], isLoading } = useQuery({
    queryKey: ['portal-users', organization?.id],
    enabled: !!organization?.id,
    queryFn: async (): Promise<PortalUser[]> => {
      const { data, error } = await supabase
        .from('client_portal_users')
        .select('id, contact_id, is_blocked, blocked_at, block_reason, last_login_at, registered_at, contacts(email, first_name, last_name)')
        .eq('organization_id', organization!.id)
        .order('registered_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.id,
        contact_id: u.contact_id,
        is_blocked: u.is_blocked,
        blocked_at: u.blocked_at,
        block_reason: u.block_reason,
        last_login_at: u.last_login_at,
        registered_at: u.registered_at,
        contact_email: u.contacts?.email || '',
        contact_name: `${u.contacts?.first_name || ''} ${u.contacts?.last_name || ''}`.trim(),
      }));
    },
  });

  const toggleBlock = useMutation({
    mutationFn: async ({ id, block, reason }: { id: string; block: boolean; reason?: string }) => {
      const { error } = await supabase
        .from('client_portal_users')
        .update({
          is_blocked: block,
          blocked_at: block ? new Date().toISOString() : null,
          block_reason: block ? (reason || null) : null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { block }) => {
      toast.success(block ? 'Cliente bloqueado del portal' : 'Acceso restaurado');
      queryClient.invalidateQueries({ queryKey: ['portal-users'] });
    },
    onError: () => toast.error('Error al actualizar acceso'),
  });

  return { portalUsers, isLoading, toggleBlock };
}
