import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface OrganizationWithAdmin {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  max_users: number;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  admin_email: string | null;
  admin_name: string | null;
  member_count: number;
}

export function useSuperAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is super-admin
  const { data: isSuperAdmin = false, isLoading: checkingAdmin } = useQuery({
    queryKey: ['is_super_admin', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('is_super_admin');
      
      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      return data as boolean;
    },
    enabled: !!user,
  });

  // Fetch all organizations (only works for super-admins)
  const { data: organizations = [], isLoading: orgsLoading, refetch: refetchOrgs } = useQuery({
    queryKey: ['all_organizations'],
    queryFn: async () => {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (orgsError) throw orgsError;

      // Get admin info for each organization
      const orgsWithAdmins: OrganizationWithAdmin[] = await Promise.all(
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
            ...org,
            admin_email: admins?.[0]?.email || null,
            admin_name: admins?.[0]?.full_name || null,
            member_count: count || 0,
          };
        })
      );

      return orgsWithAdmins;
    },
    enabled: !!user && isSuperAdmin,
  });

  // Approve organization mutation
  const approveOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all_organizations'] });
      toast({
        title: 'Empresa aprobada',
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

  // Reject/revoke organization mutation
  const rejectOrganization = useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase
        .from('organizations')
        .update({
          is_approved: false,
          approved_at: null,
          approved_by: null,
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all_organizations'] });
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
  const pendingOrganizations = organizations.filter(org => !org.is_approved);
  const approvedOrganizations = organizations.filter(org => org.is_approved);

  return {
    isSuperAdmin,
    isLoading: checkingAdmin || orgsLoading,
    organizations,
    pendingOrganizations,
    approvedOrganizations,
    approveOrganization,
    rejectOrganization,
    refetchOrgs,
  };
}
