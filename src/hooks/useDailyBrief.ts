import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TaskSummary {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  type: string;
}

interface DealAlert {
  id: string;
  title: string;
  value: number;
  days_inactive: number;
  company_name: string | null;
}

export interface DailyBrief {
  greeting: string;
  date: string;
  overdue_tasks: TaskSummary[];
  today_tasks: TaskSummary[];
  deals_alert: DealAlert[];
  new_interactions: number;
  ai_summary: string;
  suggested_actions: string[];
}

export function useDailyBrief(enabled: boolean = true) {
  const { user, clearInvalidSession } = useAuth();

  return useQuery({
    queryKey: ['daily-brief'],
    queryFn: async (): Promise<DailyBrief> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-daily-brief', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // Check if it's an auth error (401) - session is invalid
        if (error.message?.includes('401') || error.message?.includes('Invalid token') || error.message?.includes('Unauthorized')) {
          await clearInvalidSession();
          throw new Error('Session expired - please log in again');
        }
        throw error;
      }

      return data;
    },
    enabled: enabled && !!user, // Only run when explicitly enabled AND user is authenticated
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on auth errors
  });
}