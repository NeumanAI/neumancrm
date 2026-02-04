import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationBranding {
  id: string;
  name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
}

const DEFAULT_BRANDING: OrganizationBranding = {
  id: '',
  name: 'CRM AI',
  logo_url: null,
  favicon_url: null,
  primary_color: '#3B82F6',
  secondary_color: '#8B5CF6',
};

export function useBranding() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const { data: branding, isLoading, error } = useQuery({
    queryKey: ['branding', hostname],
    queryFn: async (): Promise<OrganizationBranding> => {
      // Skip lookup for localhost or lovable preview domains without custom subdomain
      const isDefaultDomain = 
        hostname === 'localhost' || 
        hostname.includes('lovable.app') && !hostname.includes('--');

      if (isDefaultDomain) {
        return DEFAULT_BRANDING;
      }

      // Call the database function to get organization by domain
      const { data, error } = await supabase
        .rpc('get_organization_by_domain', { domain_name: hostname });

      if (error) {
        console.error('Error fetching branding:', error);
        return DEFAULT_BRANDING;
      }

      if (data && data.length > 0) {
        const org = data[0];
        return {
          id: org.id,
          name: org.name,
          logo_url: org.logo_url,
          favicon_url: org.favicon_url,
          primary_color: org.primary_color || DEFAULT_BRANDING.primary_color,
          secondary_color: org.secondary_color || DEFAULT_BRANDING.secondary_color,
        };
      }

      return DEFAULT_BRANDING;
    },
    staleTime: Infinity, // Branding doesn't change frequently
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });

  return {
    branding: branding || DEFAULT_BRANDING,
    isLoading,
    error,
    isWhiteLabel: !!branding?.id,
  };
}
