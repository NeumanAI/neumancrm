import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/crm';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface UseContactsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useContacts(options: UseContactsOptions = {}) {
  const { limit, enabled = true } = options;
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', { limit }],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*, companies(id, name, logo_url)')
        .order('created_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
    enabled,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const createContact = useMutation({
    mutationFn: async (newContact: Omit<Partial<Contact>, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Prepare data without the joined companies field
      const { companies, metadata, ...contactData } = newContact;
      
      const insertData = { 
        ...contactData, 
        user_id: user.id,
        email: newContact.email || '',
        metadata: metadata ? (metadata as Json) : undefined,
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacto creado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear el contacto: ' + error.message);
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      // Remove joined data and cast metadata
      const { companies, metadata, ...updateData } = updates;
      
      const { data, error } = await supabase
        .from('contacts')
        .update({
          ...updateData,
          metadata: metadata ? (metadata as Json) : undefined,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacto actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar: ' + error.message);
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contacto eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar: ' + error.message);
    },
  });

  return {
    contacts: contacts || [],
    isLoading,
    createContact,
    updateContact,
    deleteContact,
  };
}
