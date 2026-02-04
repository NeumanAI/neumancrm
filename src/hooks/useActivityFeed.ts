import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActivityFeedItem {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  action: 'created' | 'updated' | 'deleted' | 'assigned' | 'stage_changed' | 'commented';
  entity_type: 'contacts' | 'companies' | 'opportunities' | 'activities';
  entity_id: string;
  entity_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UseActivityFeedOptions {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { entityType, entityId, limit = 50 } = options;

  const queryKey = ['activity_feed', entityType, entityId, limit];

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityFeedItem[];
    },
    enabled: !!user,
  });

  // Log activity mutation
  const logActivity = useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      entityName,
      oldValues,
      newValues,
      metadata,
    }: {
      action: ActivityFeedItem['action'];
      entityType: ActivityFeedItem['entity_type'];
      entityId: string;
      entityName?: string;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      // Get current user's team member info
      const { data: member } = await supabase
        .from('team_members')
        .select('organization_id, full_name, avatar_url')
        .eq('user_id', user?.id)
        .single();

      if (!member) throw new Error('No team member found');

      const { data, error } = await (supabase
        .from('activity_feed') as any)
        .insert({
          organization_id: member.organization_id,
          user_id: user?.id,
          user_name: member.full_name,
          user_avatar: member.avatar_url,
          action,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          old_values: oldValues,
          new_values: newValues,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity_feed'] });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('activity_feed_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['activity_feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    activities,
    isLoading,
    error,
    logActivity,
  };
}
