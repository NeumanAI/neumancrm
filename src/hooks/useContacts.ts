import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/types/crm';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { ContactType } from '@/lib/contactTypes';

interface UseContactsOptions {
  limit?: number;
  enabled?: boolean;
  contactType?: ContactType;
}

export function useContacts(options: UseContactsOptions = {}) {
  const { limit, enabled = true, contactType } = options;
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', { limit, contactType }],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*, companies(id, name, logo_url)')
        .order('created_at', { ascending: false });
      
      if (contactType) {
        query = query.eq('contact_type', contactType);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const createContact = useMutation({
    mutationFn: async (newContact: Omit<Partial<Contact>, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { companies, metadata, ...contactData } = newContact;
      
      const insertData = { 
        ...contactData, 
        user_id: user.id,
        email: newContact.email || '',
        metadata: metadata ? (metadata as Json) : undefined,
        assigned_advisor_id: user.id,
        capture_advisor_id: user.id,
        assigned_at: new Date().toISOString(),
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

  const convertContactType = useMutation({
    mutationFn: async ({ contactId, newType, reason }: { contactId: string; newType: ContactType; reason?: string }) => {
      // Get current contact to know previous type
      const { data: contact, error: fetchError } = await supabase
        .from('contacts')
        .select('contact_type, organization_id')
        .eq('id', contactId)
        .single();
      
      if (fetchError || !contact) throw new Error('Contacto no encontrado');

      const previousType = (contact as any).contact_type || 'prospecto';
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Update contact type
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ contact_type: newType } as any)
        .eq('id', contactId);
      
      if (updateError) throw updateError;

      // Record in history
      if (contact.organization_id) {
        await supabase.from('contact_type_history' as any).insert({
          contact_id: contactId,
          organization_id: contact.organization_id,
          previous_type: previousType,
          new_type: newType,
          reason: reason || null,
          changed_by: user.id,
        });
      }

      return { previousType, newType };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.contactId] });
      toast.success(`Contacto convertido a ${variables.newType}`);
    },
    onError: (error) => {
      toast.error('Error al convertir: ' + error.message);
    },
  });

  return {
    contacts: contacts || [],
    isLoading,
    createContact,
    updateContact,
    deleteContact,
    convertContactType,
  };
}
