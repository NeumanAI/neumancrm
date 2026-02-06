import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { generateUniqueSlug } from '@/lib/utils';

export interface SubClient {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  max_users: number;
  is_approved: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  admin_email: string | null;
  admin_name: string | null;
  member_count: number;
  parent_organization_id: string | null;
}

export interface ResellerOrganization {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  custom_domain: string | null;
}

export function useResellerAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is a reseller admin
  const { data: isResellerAdmin = false, isLoading: checkingReseller } = useQuery({
    queryKey: ['is_reseller_admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_reseller_admin');
      if (error) {
        console.error('Error checking reseller admin status:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos - roles no cambian frecuentemente
    refetchOnWindowFocus: false,
  });

  // Get the reseller's own organization (to inherit branding)
  const { data: resellerOrg, isLoading: loadingResellerOrg } = useQuery({
    queryKey: ['reseller_organization', user?.id],
    queryFn: async () => {
      const { data: orgId, error: idError } = await supabase.rpc('get_reseller_organization_id');
      if (idError || !orgId) return null;

      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, primary_color, secondary_color, custom_domain')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      return data as ResellerOrganization;
    },
    enabled: !!user && isResellerAdmin,
  });

  // Fetch sub-clients (organizations where parent_organization_id = reseller's org)
  const { data: subClients = [], isLoading: subClientsLoading, refetch: refetchSubClients } = useQuery({
    queryKey: ['reseller_sub_clients', resellerOrg?.id],
    queryFn: async () => {
      if (!resellerOrg?.id) return [];

      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('parent_organization_id', resellerOrg.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get admin info for each sub-client
      const subClientsWithAdmins: SubClient[] = await Promise.all(
        (orgs || []).map(async (org) => {
          const { data: admins } = await supabase
            .from('team_members')
            .select('email, full_name')
            .eq('organization_id', org.id)
            .eq('role', 'admin')
            .eq('is_active', true)
            .limit(1);

          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id)
            .eq('is_active', true);

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: org.plan,
            max_users: org.max_users,
            is_approved: org.is_approved,
            approved_at: org.approved_at,
            created_at: org.created_at,
            updated_at: org.updated_at,
            parent_organization_id: org.parent_organization_id,
            admin_email: admins?.[0]?.email || null,
            admin_name: admins?.[0]?.full_name || null,
            member_count: count || 0,
          };
        })
      );

      return subClientsWithAdmins;
    },
    enabled: !!user && isResellerAdmin && !!resellerOrg?.id,
  });

  // Create sub-client mutation
  const createSubClient = useMutation({
    mutationFn: async (data: { name: string; admin_email: string; admin_name?: string; is_approved?: boolean }) => {
      if (!resellerOrg) throw new Error('No reseller organization found');

      const { data: org, error } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug: generateUniqueSlug(data.name),
          parent_organization_id: resellerOrg.id,
          organization_type: 'direct', // Sub-clients are always 'direct'
          is_approved: data.is_approved ?? false,
          approved_at: data.is_approved ? new Date().toISOString() : null,
          // Inherit branding from parent reseller
          logo_url: resellerOrg.logo_url,
          primary_color: resellerOrg.primary_color || '#3B82F6',
          secondary_color: resellerOrg.secondary_color || '#8B5CF6',
        })
        .select()
        .single();

      if (error) throw error;
      return { org, admin_email: data.admin_email };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reseller_sub_clients'] });
      toast({
        title: 'Sub-cliente creado',
        description: `${result.org.name} ha sido creado. El admin (${result.admin_email}) debe registrarse.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear sub-cliente',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Approve sub-client mutation
  const approveSubClient = useMutation({
    mutationFn: async (subClientId: string) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq('id', subClientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reseller_sub_clients'] });
      toast({
        title: 'Sub-cliente aprobado',
        description: `${data.name} ahora tiene acceso completo al CRM.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al aprobar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Revoke sub-client access mutation
  const revokeSubClient = useMutation({
    mutationFn: async (subClientId: string) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          is_approved: false,
          approved_at: null,
        })
        .eq('id', subClientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reseller_sub_clients'] });
      toast({
        title: 'Acceso revocado',
        description: `${data.name} ya no tiene acceso al CRM.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al revocar acceso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Derived data
  const pendingSubClients = subClients.filter(sc => !sc.is_approved);
  const approvedSubClients = subClients.filter(sc => sc.is_approved);

  return {
    isResellerAdmin,
    isLoading: checkingReseller || loadingResellerOrg || subClientsLoading,
    resellerOrg,
    subClients,
    pendingSubClients,
    approvedSubClients,
    createSubClient,
    approveSubClient,
    revokeSubClient,
    refetchSubClients,
  };
}
