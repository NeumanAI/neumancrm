import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/contexts/ChatContext';
import { ChatMessages } from './ChatMessages';
import { ChatConversationList } from './ChatConversationList';

export function GlobalChatPanel() {
  const {
    isPanelOpen,
    closePanel,
    displayMessages,
    isLoading,
    streamingContent,
  } = useChat();

  return (
    <Drawer open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
      <DrawerContent className="h-[70vh] max-h-[70vh]">
        <div className="flex h-full">
          {/* Conversation sidebar */}
          <ChatConversationList />
          
          {/* Main chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto">
                <ChatMessages
                  messages={displayMessages}
                  isLoading={isLoading}
                  streamingContent={streamingContent}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
