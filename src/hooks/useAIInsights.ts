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

export interface AIInsightsError {
  isNotFound: boolean;
  isAuthError: boolean;
  message: string;
}

export function useAIInsights() {
  const { user, clearInvalidSession } = useAuth();

  return useQuery({
    queryKey: ['ai-insights'],
    queryFn: async (): Promise<AIInsights> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw { isAuthError: true, isNotFound: false, message: 'No authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // Check if it's a 404 - function not deployed
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          throw { isNotFound: true, isAuthError: false, message: 'AI Insights not available' };
        }
        
        // Check if it's an auth error (401)
        if (error.message?.includes('401') || error.message?.includes('Invalid token') || error.message?.includes('Unauthorized')) {
          await clearInvalidSession();
          throw { isAuthError: true, isNotFound: false, message: 'Session expired - please log in again' };
        }
        
        throw { isNotFound: false, isAuthError: false, message: error.message || 'Unknown error' };
      }

      return data;
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: false, // Don't retry - especially for 404s
  });
}
