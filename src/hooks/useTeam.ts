import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect, useCallback } from 'react';

export type TeamRole = 'admin' | 'manager' | 'sales_rep' | 'viewer';

export interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: TeamRole;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  quota_monthly: number;
  quota_quarterly: number;
  deals_closed_value: number;
  is_active: boolean;
  invited_by: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export type OrganizationType = 'direct' | 'whitelabel';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  max_users: number;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  industry_vertical: 'general' | 'real_estate' | 'health' | null;
  settings: {
    timezone: string;
    currency: string;
    date_format: string;
  } | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  custom_domain: string | null;
  organization_type: OrganizationType;
  parent_organization_id: string | null;
  created_at: string;
  updated_at: string;
}

const ACTIVE_ORG_KEY = 'active_organization_id';

export function useTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get stored active org from localStorage
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  });

  // Step 1: Get ALL active memberships for the user
  const { 
    data: allMemberships = [], 
    isLoading: memberLoading,
    error: memberError,
    isError: memberIsError,
  } = useQuery({
    queryKey: ['all_team_memberships', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Determine current member based on activeOrgId or fallback to first
  const currentMember = allMemberships.find(m => m.organization_id === activeOrgId) 
    || allMemberships[0] 
    || null;

  // Sync activeOrgId when memberships load
  useEffect(() => {
    if (currentMember && currentMember.organization_id !== activeOrgId) {
      setActiveOrgId(currentMember.organization_id);
      localStorage.setItem(ACTIVE_ORG_KEY, currentMember.organization_id);
    }
  }, [currentMember, activeOrgId]);

  const organizationId = currentMember?.organization_id;

  // Step 2: Fetch organization by ID
  const { 
    data: organization, 
    isLoading: orgLoading,
    error: orgError,
    isError: orgIsError,
  } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId!)
        .single();
      
      if (error) throw error;
      
      return {
        ...data,
        organization_type: (data.organization_type || 'direct') as OrganizationType,
        settings: data.settings as Organization['settings'],
      } as Organization;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Step 3: Fetch all team members for the organization
  const { 
    data: teamMembers = [], 
    isLoading: teamMembersLoading,
    error: teamMembersError,
  } = useQuery({
    queryKey: ['team_members', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Switch organization function
  const switchOrganization = useCallback(async (orgId: string) => {
    setActiveOrgId(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);

    // Update the server-side active org for RLS
    try {
      const { error } = await supabase
        .from('user_active_organization' as any)
        .upsert({ user_id: user!.id, organization_id: orgId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) console.warn('Failed to update active org on server:', error);
    } catch (e) {
      console.warn('Failed to update active org:', e);
    }

    // Invalidate everything
    queryClient.invalidateQueries();
  }, [user, queryClient]);

  // Combined loading state
  const isLoading = memberLoading || (!!organizationId && orgLoading);
  
  // Combined error state
  const error = memberError || orgError || teamMembersError;
  const isError = memberIsError || orgIsError;

  // Permission helpers
  const isAdmin = currentMember?.role === 'admin';
  const isManager = currentMember?.role === 'manager';
  const canManageTeam = isAdmin;
  const canSetQuotas = isAdmin || isManager;
  const canEdit = isAdmin || isManager || currentMember?.role === 'sales_rep';
  const isViewer = currentMember?.role === 'viewer';

  // Refetch all team-related data
  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['all_team_memberships'] });
    queryClient.invalidateQueries({ queryKey: ['organization'] });
    queryClient.invalidateQueries({ queryKey: ['team_members'] });
  };

  // Invite member mutation
  const inviteMember = useMutation({
    mutationFn: async ({ email, role, fullName }: { email: string; role: TeamRole; fullName?: string }) => {
      if (!organization) throw new Error('No organization found');
      
      const activeMembers = teamMembers.filter(m => m.is_active).length;
      if (activeMembers >= organization.max_users) {
        throw new Error(`Límite de usuarios alcanzado (${organization.max_users})`);
      }

      const { data, error } = await supabase
        .from('team_members')
        .insert({
          organization_id: organization.id,
          email,
          role,
          full_name: fullName || email.split('@')[0],
          user_id: null,
          pending_email: email.toLowerCase(),
          invitation_status: 'pending',
          invited_by: user?.id,
          is_active: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast({
        title: 'Invitación enviada',
        description: 'El usuario recibirá un email con la invitación.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al invitar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update member role mutation
  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TeamRole }) => {
      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast({
        title: 'Rol actualizado',
        description: 'El rol del miembro ha sido actualizado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar rol',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update quota mutation
  const updateQuota = useMutation({
    mutationFn: async ({ 
      memberId, 
      quotaMonthly, 
      quotaQuarterly 
    }: { 
      memberId: string; 
      quotaMonthly: number; 
      quotaQuarterly: number;
    }) => {
      const { data, error } = await supabase
        .from('team_members')
        .update({ 
          quota_monthly: quotaMonthly,
          quota_quarterly: quotaQuarterly 
        })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast({
        title: 'Cuota actualizada',
        description: 'La cuota del miembro ha sido actualizada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar cuota',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove/deactivate member mutation
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      toast({
        title: 'Miembro eliminado',
        description: 'El miembro ha sido desactivado del equipo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al eliminar miembro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update organization mutation
  const updateOrganization = useMutation({
    mutationFn: async (updates: Partial<Organization>) => {
      if (!organization) throw new Error('No organization found');
      
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast({
        title: 'Organización actualizada',
        description: 'Los cambios han sido guardados.',
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

  return {
    organization,
    teamMembers,
    currentMember,
    allMemberships,
    isLoading,
    error,
    isError,
    refetchAll,
    switchOrganization,
    
    // Permissions
    isAdmin,
    isManager,
    canManageTeam,
    canSetQuotas,
    canEdit,
    isViewer,
    
    // Mutations
    inviteMember,
    updateMemberRole,
    updateQuota,
    removeMember,
    updateOrganization,
  };
}
