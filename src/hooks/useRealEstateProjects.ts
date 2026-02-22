import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

export interface RealEstateProject {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  total_units: number;
  sold_units: number;
  reserved_units: number;
  available_units: number;
  price_from: number | null;
  price_to: number | null;
  currency: string;
  construction_progress: number;
  estimated_delivery: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  amenities: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useRealEstateProjects(filters?: { status?: string }) {
  const { user } = useAuth();
  const { organization } = useTeam();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['real_estate_projects', organization?.id, filters?.status],
    queryFn: async () => {
      let query = supabase
        .from('real_estate_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as RealEstateProject[];
    },
    enabled: !!user && !!organization,
  });

  const createProject = useMutation({
    mutationFn: async (input: Partial<RealEstateProject>) => {
      const { data, error } = await supabase
        .from('real_estate_projects')
        .insert({
          ...input,
          organization_id: organization!.id,
          created_by: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_projects'] });
      toast.success('Proyecto inmobiliario creado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<RealEstateProject>) => {
      const { data, error } = await supabase
        .from('real_estate_projects')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_projects'] });
      toast.success('Proyecto actualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('real_estate_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['real_estate_projects'] });
      toast.success('Proyecto eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { projects, isLoading, createProject, updateProject, deleteProject };
}

export function useRealEstateProject(id?: string) {
  return useQuery({
    queryKey: ['real_estate_project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('real_estate_projects')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as unknown as RealEstateProject;
    },
    enabled: !!id,
  });
}
