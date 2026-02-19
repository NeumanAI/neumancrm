import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

// ======= TYPES =======

export interface PlanCatalog {
  id: string;
  name: string;
  slug: string;
  plan_type: 'individual' | 'bundle';
  description: string | null;
  price_usd: number;
  max_users: number;
  max_ai_conversations: number;
  max_contacts: number;
  features: string[];
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSubscription {
  id: string;
  organization_id: string;
  plan_id: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  activated_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  plan?: PlanCatalog;
  org_name?: string;
}

export interface OrganizationPricing {
  id: string;
  organization_id: string;
  plan_id: string | null;
  custom_price_usd: number | null;
  custom_max_users: number | null;
  custom_max_ai_conversations: number | null;
  custom_max_contacts: number | null;
  set_by: string | null;
  notes: string | null;
}

export interface CurrentUsage {
  ai_conversations_used: number;
  ai_conversations_limit: number;
  users_count: number;
  users_limit: number;
  contacts_count: number;
  contacts_limit: number;
  can_use_ai: boolean;
  subscription_status: string;
  plan_name: string;
  plan_slug: string;
}

// ======= HOOKS =======

/** Fetch all active plans from catalog */
export function usePlanCatalog() {
  return useQuery({
    queryKey: ['plan_catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_catalog' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as unknown as PlanCatalog[]) || [];
    },
  });
}

/** Fetch all plans including inactive (super admin) */
export function useAllPlans() {
  return useQuery({
    queryKey: ['plan_catalog_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_catalog' as any)
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as unknown as PlanCatalog[]) || [];
    },
  });
}

/** Fetch the current org's subscription */
export function useCurrentSubscription() {
  const { organization } = useTeam();
  return useQuery({
    queryKey: ['org_subscription', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_subscriptions' as any)
        .select('*, plan:plan_id(*)')
        .eq('organization_id', organization!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OrganizationSubscription | null;
    },
  });
}

/** Fetch all subscriptions (super admin) */
export function useAllSubscriptions() {
  return useQuery({
    queryKey: ['all_subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_subscriptions' as any)
        .select('*, plan:plan_id(*), org:organization_id(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as any[]) || [];
    },
  });
}

/** Fetch current usage for current org — refreshes every 60s */
export function useCurrentUsage() {
  const { organization } = useTeam();
  return useQuery({
    queryKey: ['current_usage', organization?.id],
    enabled: !!organization?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_current_usage' as any, { p_org_id: organization!.id });
      if (error) throw error;
      const row = (data as any[])?.[0];
      return row as CurrentUsage | null;
    },
  });
}

/** Fetch usage for a specific org (super admin / reseller) */
export function useOrgUsage(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org_usage', orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_current_usage' as any, { p_org_id: orgId });
      if (error) throw error;
      const row = (data as any[])?.[0];
      return row as CurrentUsage | null;
    },
  });
}

/** Fetch custom pricing for a specific org */
export function useOrgPricing(orgId: string | undefined) {
  return useQuery({
    queryKey: ['org_pricing', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_pricing' as any)
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OrganizationPricing | null;
    },
  });
}

// ======= MUTATIONS =======

/** Super admin: activate / update subscription for any org */
export function useActivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      planId,
      status,
      notes,
    }: {
      organizationId: string;
      planId: string;
      status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('organization_subscriptions' as any)
        .upsert({
          organization_id: organizationId,
          plan_id: planId,
          status,
          activated_by: user?.id,
          notes: notes || null,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['org_subscription'] });
      toast.success('Suscripción actualizada');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
}

/** Reseller / super admin: set custom pricing for an org */
export function useSetCustomPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      planId,
      customPriceUsd,
      customMaxUsers,
      customMaxAiConversations,
      customMaxContacts,
      notes,
    }: {
      organizationId: string;
      planId?: string;
      customPriceUsd?: number;
      customMaxUsers?: number;
      customMaxAiConversations?: number;
      customMaxContacts?: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('organization_pricing' as any)
        .upsert({
          organization_id: organizationId,
          plan_id: planId || null,
          custom_price_usd: customPriceUsd ?? null,
          custom_max_users: customMaxUsers ?? null,
          custom_max_ai_conversations: customMaxAiConversations ?? null,
          custom_max_contacts: customMaxContacts ?? null,
          set_by: user?.id,
          notes: notes || null,
        }, { onConflict: 'organization_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org_pricing'] });
      toast.success('Precio personalizado guardado');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
}

/** Super admin: update plan catalog entry */
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlanCatalog> & { id: string }) => {
      const { error } = await supabase
        .from('plan_catalog' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan_catalog'] });
      queryClient.invalidateQueries({ queryKey: ['plan_catalog_all'] });
      toast.success('Plan actualizado');
    },
    onError: (e: Error) => toast.error('Error: ' + e.message),
  });
}
