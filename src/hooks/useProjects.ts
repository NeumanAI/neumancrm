import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Project, ProjectType, ProjectStatus } from '@/types/crm';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface CreateProjectData {
  name: string;
  code?: string;
  description?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  start_date?: string;
  end_date?: string;
  budget?: number;
  revenue_target?: number;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  color?: string;
  icon?: string;
  image_url?: string;
}

interface UpdateProjectData extends Partial<CreateProjectData> {
  id: string;
}

// Global state for active project filter
let activeProjectId: string | null = null;
const listeners = new Set<() => void>();

export function useActiveProject() {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  
  const setActiveProject = (projectId: string | null) => {
    activeProjectId = projectId;
    listeners.forEach(l => l());
  };
  
  return { activeProjectId, setActiveProject };
}

export function useProjects(filters?: { status?: ProjectStatus; type?: ProjectType }) {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createProject = useMutation({
    mutationFn: async (data: CreateProjectData) => {
      // Get organization_id
      const { data: orgData } = await supabase.rpc('get_user_organization_id');
      if (!orgData) throw new Error('No organization found');

      const { data: user } = await supabase.auth.getUser();

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          ...data,
          organization_id: orgData,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return project as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Proyecto creado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear proyecto: ' + error.message);
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...data }: UpdateProjectData) => {
      const { data: project, error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return project as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Proyecto actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar proyecto: ' + error.message);
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Proyecto eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar proyecto: ' + error.message);
    },
  });

  return {
    projects,
    isLoading,
    error,
    refetch,
    createProject,
    updateProject,
    deleteProject,
  };
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}