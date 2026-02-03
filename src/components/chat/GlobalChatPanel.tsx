import { KeyboardEvent } from 'react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChat } from '@/contexts/ChatContext';
import { ChatMessages } from './ChatMessages';
import { ChatConversationList } from './ChatConversationList';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Sparkles, Loader2 } from 'lucide-react';

export function GlobalChatPanel() {
  const {
    isPanelOpen,
    closePanel,
    displayMessages,
    isLoading,
    streamingContent,
    inputValue,
    setInputValue,
    sendMessage,
  } = useChat();

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
            
            {/* Input footer inside panel */}
            <div className="border-t border-border p-4">
              <div className="max-w-3xl mx-auto flex items-end gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregúntame algo sobre tu CRM..."
                    className="min-h-[44px] max-h-[120px] resize-none pl-10 pr-4 py-3 rounded-xl border-muted-foreground/20 focus:border-primary"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="flex-shrink-0 h-10 w-10 rounded-xl gradient-primary"
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
