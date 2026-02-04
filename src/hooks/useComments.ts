import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Comment {
  id: string;
  organization_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  entity_type: 'contacts' | 'companies' | 'opportunities';
  entity_id: string;
  content: string;
  mentions: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface UseCommentsOptions {
  entityType: 'contacts' | 'companies' | 'opportunities';
  entityId: string;
}

export function useComments({ entityType, entityId }: UseCommentsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['comments', entityType, entityId];

  const { data: comments = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!user && !!entityId,
  });

  // Extract @mentions from content
  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[2]); // The UUID inside parentheses
    }
    return mentions;
  };

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      // Get current user's team member info
      const { data: member } = await supabase
        .from('team_members')
        .select('organization_id, full_name, avatar_url')
        .eq('user_id', user?.id)
        .single();

      if (!member) throw new Error('No team member found');

      const mentions = extractMentions(content);

      const { data, error } = await supabase
        .from('comments')
        .insert({
          organization_id: member.organization_id,
          user_id: user?.id,
          user_name: member.full_name,
          user_avatar: member.avatar_url,
          entity_type: entityType,
          entity_id: entityId,
          content,
          mentions,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Comentario agregado',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al agregar comentario',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update comment mutation
  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const mentions = extractMentions(content);

      const { data, error } = await supabase
        .from('comments')
        .update({ content, mentions })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Comentario actualizado',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al actualizar comentario',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete comment mutation
  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'Comentario eliminado',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al eliminar comentario',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Pin/unpin comment mutation
  const togglePinComment = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ is_pinned: !isPinned })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: data.is_pinned ? 'Comentario fijado' : 'Comentario desfijado',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al fijar comentario',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!user || !entityId) return;

    const channel = supabase
      .channel(`comments_${entityType}_${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_id=eq.${entityId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, entityId, entityType, queryClient, queryKey]);

  return {
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
    deleteComment,
    togglePinComment,
  };
}
