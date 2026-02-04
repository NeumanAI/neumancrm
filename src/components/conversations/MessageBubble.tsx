import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, CheckCheck, Bot, StickyNote } from 'lucide-react';
import type { ConversationMessage } from '@/types/conversations';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isFromContact = message.is_from_contact;
  const isInternalNote = message.is_internal_note;
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale: es });
    }
    if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm', { locale: es })}`;
    }
    return format(date, 'dd/MM HH:mm', { locale: es });
  };

  if (isInternalNote) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 max-w-[80%]">
          <div className="flex items-center gap-2 text-yellow-700 text-xs mb-1">
            <StickyNote className="h-3 w-3" />
            <span>Nota interna</span>
            {message.sender_name && (
              <span className="font-medium">• {message.sender_name}</span>
            )}
          </div>
          <p className="text-sm text-yellow-800">{message.content}</p>
          <span className="text-[10px] text-yellow-600 mt-1 block">
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex mb-3',
        isFromContact ? 'justify-start' : 'justify-end'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm',
          isFromContact
            ? 'bg-muted text-foreground rounded-bl-md'
            : 'bg-primary text-primary-foreground rounded-br-md'
        )}
      >
        {/* Sender name for contact messages */}
        {isFromContact && message.sender_name && (
          <p className="text-xs font-medium opacity-70 mb-1">
            {message.sender_name}
          </p>
        )}
        
        {/* Bot indicator */}
        {message.is_bot && !isFromContact && (
          <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
            <Bot className="h-3 w-3" />
            <span>Bot</span>
          </div>
        )}

        {/* Message content */}
        {message.message_type === 'text' && (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
        
        {message.message_type === 'image' && message.attachment_url && (
          <div className="space-y-2">
            <img 
              src={message.attachment_url} 
              alt="Imagen" 
              className="max-w-full rounded-lg"
            />
            {message.content && (
              <p className="text-sm">{message.content}</p>
            )}
          </div>
        )}
        
        {['file', 'audio', 'video'].includes(message.message_type) && message.attachment_url && (
          <a 
            href={message.attachment_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            📎 Ver archivo adjunto
          </a>
        )}

        {/* Timestamp and status */}
        <div className={cn(
          'flex items-center gap-1 mt-1',
          isFromContact ? 'justify-start' : 'justify-end'
        )}>
          <span className={cn(
            'text-[10px]',
            isFromContact ? 'text-muted-foreground' : 'text-primary-foreground/70'
          )}>
            {formatTime(message.created_at)}
          </span>
          
          {!isFromContact && (
            <span className="text-primary-foreground/70">
              {message.read_at ? (
                <CheckCheck className="h-3 w-3" />
              ) : message.delivered_at ? (
                <CheckCheck className="h-3 w-3 opacity-50" />
              ) : (
                <Check className="h-3 w-3 opacity-50" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
