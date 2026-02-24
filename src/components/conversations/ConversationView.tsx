import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Send, 
  Paperclip, 
  StickyNote, 
  MoreVertical,
  CheckCircle,
  Archive,
  Clock,
  User,
  Link,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MessageBubble } from './MessageBubble';
import { useConversationMessages } from '@/hooks/useConversations';
import { CHANNEL_CONFIG, STATUS_CONFIG } from '@/types/conversations';
import type { Conversation, ConversationStatus } from '@/types/conversations';

interface ConversationViewProps {
  conversation: Conversation | null;
  onStatusChange: (status: ConversationStatus) => void;
}

export function ConversationView({ conversation, onStatusChange }: ConversationViewProps) {
  const [message, setMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    isSending,
    markMessagesAsRead,
  } = useConversationMessages(conversation?.id || null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    if (conversation && conversation.unread_count > 0) {
      markMessagesAsRead();
    }
  }, [conversation?.id]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    sendMessage({ 
      content: message.trim(),
      is_internal_note: isInternalNote,
    });
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Selecciona una conversación</p>
          <p className="text-sm mt-1">
            Elige una conversación de la lista para ver los mensajes
          </p>
        </div>
      </div>
    );
  }

  const displayName = conversation.contacts 
    ? [conversation.contacts.first_name, conversation.contacts.last_name].filter(Boolean).join(' ') 
      || (conversation.contacts as any)?.instagram_username
      || conversation.external_name 
      || 'Sin nombre'
    : conversation.external_name || 'Sin nombre';

  const channelConfig = CHANNEL_CONFIG[conversation.channel];
  const statusConfig = STATUS_CONFIG[conversation.status];
  const avatarUrl = (() => {
    const url = conversation.contacts?.avatar_url || conversation.external_avatar;
    return url && !url.includes('{{') ? url : undefined;
  })();

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let currentDate = '';
  
  messages.forEach((msg) => {
    const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{displayName}</h3>
              <Badge 
                variant="outline" 
                className={`text-[10px] px-1.5 py-0 ${channelConfig.color} ${channelConfig.bgColor}`}
              >
                {channelConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {conversation.external_email && (
                <span>{conversation.external_email}</span>
              )}
              {conversation.external_phone && (
                <span>{conversation.external_phone}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="outline"
            className={`${statusConfig.color} ${statusConfig.bgColor}`}
          >
            {statusConfig.label}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange('open')}>
                <Clock className="h-4 w-4 mr-2" />
                Marcar como abierta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('pending')}>
                <Clock className="h-4 w-4 mr-2" />
                Marcar como pendiente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('resolved')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como resuelta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('archived')}>
                <Archive className="h-4 w-4 mr-2" />
                Archivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!conversation.contact_id && (
                <DropdownMenuItem>
                  <Link className="h-4 w-4 mr-2" />
                  Vincular a contacto
                </DropdownMenuItem>
              )}
              {conversation.contacts && (
                <DropdownMenuItem>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver contacto
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className="h-16 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No hay mensajes aún</p>
          </div>
        ) : (
          groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {format(new Date(group.date), "d 'de' MMMM, yyyy", { locale: es })}
                </span>
              </div>
              {/* Messages for this date */}
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4 flex-shrink-0">
        {isInternalNote && (
          <div className="flex items-center gap-2 mb-2 text-xs text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-md">
            <StickyNote className="h-3.5 w-3.5" />
            <span>Escribiendo nota interna (no visible para el cliente)</span>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isInternalNote ? "Escribe una nota interna..." : "Escribe un mensaje..."}
              className="min-h-[44px] max-h-32 resize-none pr-20"
              rows={1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                  >
                    <StickyNote className={`h-4 w-4 ${isInternalNote ? 'text-yellow-600' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isInternalNote ? 'Cambiar a mensaje' : 'Agregar nota interna'}
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Adjuntar archivo</TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          <Button 
            onClick={handleSend} 
            disabled={!message.trim() || isSending}
            size="icon"
            className="h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
