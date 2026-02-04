import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
        throw error;
      }

      return data;
    },
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}
