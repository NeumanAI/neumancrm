import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContactProject, ContactProjectStatus } from '@/types/crm';
import { toast } from 'sonner';

interface AddToProjectData {
  contact_id: string;
  project_id: string;
  status?: ContactProjectStatus;
  interest_level?: number;
  source?: string;
  notes?: string;
}

interface UpdateContactProjectData {
  id: string;
  status?: ContactProjectStatus;
  interest_level?: number;
  notes?: string;
}

export function useContactProjects(contactId?: string) {
  const queryClient = useQueryClient();

  const { data: contactProjects = [], isLoading } = useQuery({
    queryKey: ['contact-projects', contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from('contact_projects')
        .select(`
          *,
          projects:project_id (id, name, code, color, type, status)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactProject[];
    },
    enabled: !!contactId,
  });

  const addToProject = useMutation({
    mutationFn: async (data: AddToProjectData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('contact_projects')
        .insert({
          ...data,
          added_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result as ContactProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-contacts'] });
      toast.success('Contacto agregado al proyecto');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('El contacto ya está en este proyecto');
      } else {
        toast.error('Error al agregar contacto: ' + error.message);
      }
    },
  });

  const removeFromProject = useMutation({
    mutationFn: async ({ contactId, projectId }: { contactId: string; projectId: string }) => {
      const { error } = await supabase
        .from('contact_projects')
        .delete()
        .eq('contact_id', contactId)
        .eq('project_id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-contacts'] });
      toast.success('Contacto removido del proyecto');
    },
    onError: (error) => {
      toast.error('Error al remover contacto: ' + error.message);
    },
  });

  const updateContactProject = useMutation({
    mutationFn: async ({ id, ...data }: UpdateContactProjectData) => {
      const { data: result, error } = await supabase
        .from('contact_projects')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as ContactProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-contacts'] });
      toast.success('Estado actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  return {
    contactProjects,
    isLoading,
    addToProject,
    removeFromProject,
    updateContactProject,
  };
}

export function useProjectContacts(projectId?: string) {
  const { data: projectContacts = [], isLoading } = useQuery({
    queryKey: ['project-contacts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('contact_projects')
        .select(`
          *,
          contacts:contact_id (id, first_name, last_name, email, avatar_url, phone, company_id)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContactProject[];
    },
    enabled: !!projectId,
  });

  return { projectContacts, isLoading };
}