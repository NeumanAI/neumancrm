import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

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

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  max_users: number;
  settings: {
    timezone: string;
    currency: string;
    date_format: string;
  };
  created_at: string;
  updated_at: string;
}

export function useTeam() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch organization
  const { data: organization, isLoading: orgLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data as Organization | null;
    },
    enabled: !!user,
  });

  // Fetch team members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!user,
  });

  // Current member (the logged-in user)
  const currentMember = teamMembers.find(m => m.user_id === user?.id);

  // Permission helpers
  const isAdmin = currentMember?.role === 'admin';
  const isManager = currentMember?.role === 'manager';
  const canManageTeam = isAdmin;
  const canSetQuotas = isAdmin || isManager;
  const canEdit = isAdmin || isManager || currentMember?.role === 'sales_rep';
  const isViewer = currentMember?.role === 'viewer';

  // Invite member mutation
  const inviteMember = useMutation({
    mutationFn: async ({ email, role, fullName }: { email: string; role: TeamRole; fullName?: string }) => {
      if (!organization) throw new Error('No organization found');
      
      // Check max users limit
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
          user_id: crypto.randomUUID(), // Placeholder until they accept invite
          invited_by: user?.id,
          is_active: false, // Will be activated when they accept
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
    isLoading: orgLoading || membersLoading,
    
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
