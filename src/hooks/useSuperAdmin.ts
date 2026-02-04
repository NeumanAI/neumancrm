import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export type OrganizationType = 'direct' | 'whitelabel';

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
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  custom_domain: string | null;
  organization_type: OrganizationType;
  parent_organization_id: string | null;
}

export interface OrganizationDomain {
  id: string;
  organization_id: string;
  domain: string;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  organization_name?: string;
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
            organization_type: (org.organization_type || 'direct') as OrganizationType,
            parent_organization_id: org.parent_organization_id || null,
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

  // Fetch all domains
  const { data: domains = [], isLoading: domainsLoading, refetch: refetchDomains } = useQuery({
    queryKey: ['all_domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_domains')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get organization names
      const domainsWithOrgs: OrganizationDomain[] = await Promise.all(
        (data || []).map(async (domain) => {
          const org = organizations.find(o => o.id === domain.organization_id);
          return {
            ...domain,
            organization_name: org?.name || undefined,
          };
        })
      );

      return domainsWithOrgs;
    },
    enabled: !!user && isSuperAdmin && organizations.length > 0,
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

  // Update organization branding mutation
  const updateOrganization = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      logo_url?: string | null;
      favicon_url?: string | null;
      primary_color?: string | null;
      secondary_color?: string | null;
      custom_domain?: string | null;
    }) => {
      const { id, ...updates } = data;
      const { data: result, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all_organizations'] });
      toast({
        title: 'Organización actualizada',
        description: `${data.name} ha sido actualizada.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Create organization mutation (super admin creates org + team member placeholder)
  const createOrganization = useMutation({
    mutationFn: async (data: {
      name: string;
      admin_email: string;
      admin_name?: string;
      is_approved?: boolean;
      organization_type: OrganizationType;
      logo_url?: string;
      primary_color?: string;
      secondary_color?: string;
      custom_domain?: string;
    }) => {
      // Create organization first
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: data.name,
          slug: data.name.toLowerCase().replace(/\s+/g, '-'),
          is_approved: data.is_approved ?? true,
          approved_at: data.is_approved ? new Date().toISOString() : null,
          approved_by: data.is_approved ? user?.id : null,
          organization_type: data.organization_type,
          logo_url: data.organization_type === 'whitelabel' ? (data.logo_url || null) : null,
          primary_color: data.organization_type === 'whitelabel' ? (data.primary_color || '#3B82F6') : '#3B82F6',
          secondary_color: data.organization_type === 'whitelabel' ? (data.secondary_color || '#8B5CF6') : '#8B5CF6',
          custom_domain: data.organization_type === 'whitelabel' ? (data.custom_domain || null) : null,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Note: The actual team member will be created when the user signs up.
      // For now, we just create the org. The admin email is informational.
      
      return { org, admin_email: data.admin_email };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['all_organizations'] });
      toast({
        title: 'Organización creada',
        description: `${result.org.name} ha sido creada. El admin (${result.admin_email}) debe registrarse.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear organización',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add domain mutation
  const addDomain = useMutation({
    mutationFn: async (data: { organization_id: string; domain: string; is_primary?: boolean }) => {
      const { data: result, error } = await supabase
        .from('organization_domains')
        .insert({
          organization_id: data.organization_id,
          domain: data.domain.toLowerCase().trim(),
          is_primary: data.is_primary ?? false,
          is_verified: true, // Super admin can verify immediately
          verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_domains'] });
      toast({
        title: 'Dominio agregado',
        description: 'El dominio ha sido configurado correctamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al agregar dominio',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete domain mutation
  const deleteDomain = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase
        .from('organization_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_domains'] });
      toast({
        title: 'Dominio eliminado',
        description: 'El dominio ha sido eliminado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al eliminar dominio',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Derived data
  const pendingOrganizations = organizations.filter(org => !org.is_approved);
  const approvedOrganizations = organizations.filter(org => org.is_approved);
  const rootOrganizations = organizations.filter(org => !org.parent_organization_id);
  const subClientOrganizations = organizations.filter(org => !!org.parent_organization_id);
  const directOrganizations = organizations.filter(org => org.organization_type === 'direct' && !org.parent_organization_id);
  const whitelabelOrganizations = organizations.filter(org => org.organization_type === 'whitelabel');

  // Helper to get sub-clients of a parent organization
  const getSubClientsOf = (parentId: string) => organizations.filter(org => org.parent_organization_id === parentId);

  return {
    isSuperAdmin,
    isLoading: checkingAdmin || orgsLoading,
    organizations,
    pendingOrganizations,
    approvedOrganizations,
    rootOrganizations,
    subClientOrganizations,
    directOrganizations,
    whitelabelOrganizations,
    getSubClientsOf,
    approveOrganization,
    rejectOrganization,
    updateOrganization,
    createOrganization,
    refetchOrgs,
    // Domains
    domains,
    domainsLoading,
    refetchDomains,
    addDomain,
    deleteDomain,
  };
}
