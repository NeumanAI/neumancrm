import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TrackActionParams {
  action_type: 'create' | 'update' | 'delete' | 'view' | 'search' | 'filter' | 'navigate';
  entity_type?: 'contact' | 'company' | 'opportunity' | 'task';
  entity_id?: string;
  method?: 'form' | 'nli' | 'command_bar' | 'direct';
  metadata?: Record<string, unknown>;
  duration_ms?: number;
}

export function useActionTracking() {
  const { user } = useAuth();
  const orgIdCache = useRef<string | null>(null);

  const trackAction = useCallback(async (params: TrackActionParams) => {
    if (!user) return;

    try {
      // Cache organization_id to avoid repeated queries
      if (!orgIdCache.current) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!teamMember) return;
        orgIdCache.current = teamMember.organization_id;
      }

      // Fire-and-forget insert — don't await or block the UI
      supabase.from('user_actions').insert({
        user_id: user.id,
        organization_id: orgIdCache.current,
        page_url: window.location.pathname,
        success: true,
        ...params,
      } as any).then(({ error }) => {
        if (error) { if (import.meta.env.DEV) console.error('[ActionTracking] Insert error:', error.message); }
      });
    } catch (error) {
      // Silently fail — tracking should never break the app
      if (import.meta.env.DEV) console.error('[ActionTracking] Error:', error);
    }
  }, [user]);

  return { trackAction };
}
