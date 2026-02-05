import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectMetrics } from '@/types/crm';

export function useProjectMetrics(projectId?: string) {
  return useQuery({
    queryKey: ['project-metrics', projectId],
    queryFn: async (): Promise<ProjectMetrics> => {
      if (!projectId) {
        return {
          total_contacts: 0,
          total_companies: 0,
          total_opportunities: 0,
          pipeline_value: 0,
          won_deals_value: 0,
          conversion_rate: 0,
        };
      }

      // Count contacts in project
      const { count: contactCount } = await supabase
        .from('contact_projects')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Count companies in project
      const { count: companyCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get opportunities data
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('value, status')
        .eq('project_id', projectId);

      const totalOpportunities = opportunities?.length || 0;
      const pipelineValue = opportunities
        ?.filter(o => o.status === 'open')
        .reduce((sum, o) => sum + (Number(o.value) || 0), 0) || 0;
      const wonDealsValue = opportunities
        ?.filter(o => o.status === 'won')
        .reduce((sum, o) => sum + (Number(o.value) || 0), 0) || 0;
      const wonDeals = opportunities?.filter(o => o.status === 'won').length || 0;
      const conversionRate = totalOpportunities > 0 
        ? (wonDeals / totalOpportunities) * 100 
        : 0;

      return {
        total_contacts: contactCount || 0,
        total_companies: companyCount || 0,
        total_opportunities: totalOpportunities,
        pipeline_value: pipelineValue,
        won_deals_value: wonDealsValue,
        conversion_rate: Math.round(conversionRate * 10) / 10,
      };
    },
    enabled: !!projectId,
  });
}

export function useAllProjectsMetrics() {
  return useQuery({
    queryKey: ['all-projects-metrics'],
    queryFn: async () => {
      // Get all projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, status');

      const total = projects?.length || 0;
      const active = projects?.filter(p => p.status === 'active').length || 0;
      const completed = projects?.filter(p => p.status === 'completed').length || 0;
      const inactive = projects?.filter(p => p.status === 'inactive').length || 0;

      return { total, active, completed, inactive };
    },
  });
}