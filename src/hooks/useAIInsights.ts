import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DealAtRisk {
  id: string;
  title: string;
  value: number;
  days_inactive: number;
  company_name: string | null;
  reason: string;
}

interface ContactFollowUp {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  days_since_contact: number;
  reason: string;
}

export interface AIInsights {
  deals_at_risk: DealAtRisk[];
  contacts_followup: ContactFollowUp[];
  suggestions: string[];
  pipeline_health: {
    total_value: number;
    win_rate: number;
    avg_deal_cycle: number;
    deals_won_this_month: number;
  };
  generated_at: string;
}

export function useAIInsights() {
  const { clearInvalidSession } = useAuth();

  return useQuery({
    queryKey: ['ai-insights'],
    queryFn: async (): Promise<AIInsights> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authenticated');
      }

      const { data, error } = await supabase.functions.invoke('generate-insights', {
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
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on auth errors
  });
}
