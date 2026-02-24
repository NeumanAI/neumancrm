import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { 
  Conversation, 
  ConversationMessage, 
  ConversationFilters,
  ConversationStatus 
} from '@/types/conversations';

export function useConversations(filters?: ConversationFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations with filters
  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversations', filters],
    queryFn: async () => {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          contacts:contact_id (id, first_name, last_name, email, avatar_url, instagram_username)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filters?.channel) {
        query = query.eq('channel', filters.channel);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.search) {
        query = query.or(`external_name.ilike.%${filters.search}%,external_email.ilike.%${filters.search}%,external_phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Real-time subscription for conversations
  useEffect(() => {
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Update conversation status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ConversationStatus }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Estado actualizado' });
    },
    onError: (error) => {
      toast({ title: 'Error al actualizar estado', description: error.message, variant: 'destructive' });
    },
  });

  // Assign conversation to team member
  const assignConversation = useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string | null }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_to })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Conversación asignada' });
    },
    onError: (error) => {
      toast({ title: 'Error al asignar', description: error.message, variant: 'destructive' });
    },
  });

  // Link conversation to existing contact
  const linkToContact = useMutation({
    mutationFn: async ({ id, contact_id }: { id: string; contact_id: string }) => {
      const { error } = await supabase
        .from('conversations')
        .update({ contact_id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({ title: 'Contacto vinculado' });
    },
    onError: (error) => {
      toast({ title: 'Error al vincular', description: error.message, variant: 'destructive' });
    },
  });

  // Mark conversation as read
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    updateStatus: updateStatus.mutate,
    assignConversation: assignConversation.mutate,
    linkToContact: linkToContact.mutate,
    markAsRead: markAsRead.mutate,
  };
}

export function useConversationMessages(conversationId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages for a conversation
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ConversationMessage[];
    },
    enabled: !!conversationId,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Send a message (agent reply)
  const sendMessage = useMutation({
    mutationFn: async ({ 
      content, 
      is_internal_note = false,
      message_type = 'text',
      attachment_url 
    }: { 
      content: string; 
      is_internal_note?: boolean;
      message_type?: string;
      attachment_url?: string;
    }) => {
      if (!conversationId) throw new Error('No conversation selected');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user's team member info for sender name
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          content,
          is_from_contact: false,
          sender_name: teamMember?.full_name || user.email,
          sender_id: user.id,
          is_bot: false,
          is_internal_note,
          message_type,
          attachment_url,
        });

      if (error) throw error;

      // If sending to external channel, call edge function
      if (!is_internal_note) {
        // Get conversation to check channel
        const { data: conversation } = await supabase
          .from('conversations')
          .select('channel, external_id')
          .eq('id', conversationId)
          .single();

        if (conversation && ['whatsapp', 'instagram', 'messenger'].includes(conversation.channel)) {
          // Call send-conversation-reply edge function
          await supabase.functions.invoke('send-conversation-reply', {
            body: {
              conversation_id: conversationId,
              content,
              message_type,
            },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      toast({ 
        title: 'Error al enviar mensaje', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Mark messages as read
  const markMessagesAsRead = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;

      const { error } = await supabase
        .from('conversation_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('is_from_contact', true)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
    },
  });

  return {
    messages,
    isLoading,
    error,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    markMessagesAsRead: markMessagesAsRead.mutate,
  };
}

// Hook for unread count (for sidebar badge)
export function useUnreadConversationsCount() {
  const { data: count = 0 } = useQuery({
    queryKey: ['conversations-unread-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('unread_count')
        .gt('unread_count', 0);

      if (error) throw error;
      return data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return count;
}
