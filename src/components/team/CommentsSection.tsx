import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useComments, Comment } from '@/hooks/useComments';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Pin, 
  Trash2, 
  Send,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommentsSectionProps {
  entityType: 'contacts' | 'companies' | 'opportunities';
  entityId: string;
}

export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const { user } = useAuth();
  const { teamMembers, currentMember } = useTeam();
  const { comments, isLoading, addComment, togglePinComment, deleteComment } = useComments({ 
    entityType, 
    entityId 
  });
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addComment.mutateAsync(newComment);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Simple @mention handling
  const handleMentionInsert = (memberId: string, memberName: string) => {
    setNewComment(prev => prev + `@[${memberName}](${memberId}) `);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentMember?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {getInitials(currentMember?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Escribe un comentario... Usa @ para mencionar a alguien"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  @ Mencionar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {teamMembers.filter(m => m.is_active).map((member) => (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => handleMentionInsert(member.user_id, member.full_name || member.email)}
                  >
                    <Avatar className="h-5 w-5 mr-2">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {member.full_name || member.email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground">
              Tip: @nombre para notificar
            </span>
          </div>
          <Button type="submit" size="sm" disabled={isSubmitting || !newComment.trim()}>
            <Send className="h-4 w-4 mr-1" />
            {isSubmitting ? 'Enviando...' : 'Comentar'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No hay comentarios aún</p>
          <p className="text-sm">Sé el primero en comentar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              getInitials={getInitials}
              onPin={() => togglePinComment.mutate({ id: comment.id, isPinned: comment.is_pinned })}
              onDelete={() => deleteComment.mutate(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  currentUserId,
  getInitials,
  onPin,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  getInitials: (name: string | null) => string;
  onPin: () => void;
  onDelete: () => void;
}) {
  const isOwner = comment.user_id === currentUserId;
  const wasEdited = comment.created_at !== comment.updated_at;

  return (
    <div className={`flex gap-3 p-3 rounded-lg transition-colors ${
      comment.is_pinned ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
    }`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.user_avatar || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(comment.user_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {comment.user_name || 'Usuario'}
          </span>
          {comment.is_pinned && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Pin className="h-3 w-3" />
              Fijado
            </span>
          )}
          {wasEdited && (
            <span className="text-xs text-muted-foreground">(editado)</span>
          )}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { 
              addSuffix: true, 
              locale: es 
            })}
          </span>
        </div>

        <p className="text-sm mt-1 whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>

      {isOwner && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPin}>
              <Pin className="h-4 w-4 mr-2" />
              {comment.is_pinned ? 'Desfijar' : 'Fijar'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
