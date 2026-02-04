import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationView } from '@/components/conversations/ConversationView';
import type { ConversationFilters, ConversationStatus } from '@/types/conversations';

export default function Conversations() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({});
  
  const { 
    conversations, 
    isLoading, 
    updateStatus,
    markAsRead,
  } = useConversations(filters);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    // Mark as read when selected
    const conversation = conversations.find(c => c.id === id);
    if (conversation && conversation.unread_count > 0) {
      markAsRead(id);
    }
  };

  const handleStatusChange = (status: ConversationStatus) => {
    if (selectedConversationId) {
      updateStatus({ id: selectedConversationId, status });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List - Left Panel */}
      <div className="w-80 flex-shrink-0">
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          selectedId={selectedConversationId}
          onSelect={handleSelectConversation}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {/* Chat View - Center Panel */}
      <ConversationView
        conversation={selectedConversation}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
