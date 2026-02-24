import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  MessageCircle, 
  MessageSquare, 
  Instagram, 
  Mail,
  Facebook,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Conversation, ConversationChannel } from '@/types/conversations';

const CHANNEL_ICONS: Record<ConversationChannel, React.ComponentType<{ className?: string }>> = {
  webchat: MessageCircle,
  whatsapp: MessageSquare,
  instagram: Instagram,
  messenger: Facebook,
  email: Mail,
};

const CHANNEL_COLORS: Record<ConversationChannel, string> = {
  webchat: 'text-blue-500',
  whatsapp: 'text-green-500',
  instagram: 'text-pink-500',
  messenger: 'text-blue-600',
  email: 'text-gray-500',
};

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const ChannelIcon = CHANNEL_ICONS[conversation.channel];
  const channelColor = CHANNEL_COLORS[conversation.channel];

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es });
    }
    if (isYesterday(date)) {
      return 'Ayer';
    }
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  };

  const displayName = conversation.contacts 
    ? [conversation.contacts.first_name, conversation.contacts.last_name].filter(Boolean).join(' ') 
      || (conversation.contacts as any)?.instagram_username
      || conversation.external_name 
      || 'Sin nombre'
    : conversation.external_name || 'Sin nombre';

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarUrl = (() => {
    const url = conversation.contacts?.avatar_url || conversation.external_avatar;
    return url && !url.includes('{{') ? url : undefined;
  })();

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer transition-colors border-b border-border',
        isSelected 
          ? 'bg-accent' 
          : 'hover:bg-muted/50',
        conversation.unread_count > 0 && 'bg-primary/5'
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        {/* Channel indicator */}
        <div className={cn(
          'absolute -bottom-1 -right-1 rounded-full bg-background p-0.5',
          channelColor
        )}>
          <ChannelIcon className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium text-sm truncate',
            conversation.unread_count > 0 && 'font-semibold'
          )}>
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatTime(conversation.last_message_at)}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            'text-xs truncate',
            conversation.unread_count > 0 
              ? 'text-foreground font-medium' 
              : 'text-muted-foreground'
          )}>
            {conversation.last_message_preview || 'Sin mensajes'}
          </p>
          
          {conversation.unread_count > 0 && (
            <Badge 
              variant="default" 
              className="h-5 min-w-5 flex items-center justify-center text-[10px] px-1.5"
            >
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </Badge>
          )}
        </div>

        {/* Status badge */}
        {conversation.status !== 'open' && (
          <Badge 
            variant="outline" 
            className={cn(
              'mt-1.5 text-[10px] px-1.5 py-0',
              conversation.status === 'resolved' && 'border-green-300 text-green-700',
              conversation.status === 'pending' && 'border-yellow-300 text-yellow-700',
              conversation.status === 'archived' && 'border-gray-300 text-gray-500'
            )}
          >
            {conversation.status === 'resolved' && 'Resuelta'}
            {conversation.status === 'pending' && 'Pendiente'}
            {conversation.status === 'archived' && 'Archivada'}
          </Badge>
        )}
      </div>
    </div>
  );
}
