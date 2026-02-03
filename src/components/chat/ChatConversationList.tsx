import { Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AIConversation } from '@/types/crm';
import { parseISO, isToday, isYesterday } from 'date-fns';
import { useChat } from '@/contexts/ChatContext';

function groupConversationsByDate(convs: AIConversation[]) {
  const groups: { [key: string]: AIConversation[] } = {
    today: [],
    yesterday: [],
    older: [],
  };

  convs.forEach(conv => {
    const date = parseISO(conv.last_message_at);
    if (isToday(date)) {
      groups.today.push(conv);
    } else if (isYesterday(date)) {
      groups.yesterday.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

interface ConversationGroupProps {
  title: string;
  conversations: AIConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function ConversationGroup({ title, conversations, selectedId, onSelect }: ConversationGroupProps) {
  if (conversations.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground px-2 mb-2">{title}</p>
      {conversations.map(conv => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            'w-full text-left p-2 rounded-lg text-sm transition-colors',
            selectedId === conv.id
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{conv.title || 'Nueva conversación'}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function ChatConversationList() {
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    startNewConversation,
  } = useChat();

  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <div className="w-56 flex-shrink-0 flex flex-col border-r border-border bg-muted/30">
      <div className="p-3 border-b border-border">
        <Button onClick={startNewConversation} className="w-full gradient-primary" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Conversación
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          <ConversationGroup
            title="Hoy"
            conversations={groupedConversations.today}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
          <ConversationGroup
            title="Ayer"
            conversations={groupedConversations.yesterday}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
          <ConversationGroup
            title="Más antiguas"
            conversations={groupedConversations.older}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
