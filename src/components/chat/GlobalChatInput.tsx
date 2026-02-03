import { KeyboardEvent } from 'react';
import { Send, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function GlobalChatInput() {
  const {
    inputValue,
    setInputValue,
    sendMessage,
    isLoading,
    togglePanel,
    isPanelOpen,
    inputRef,
  } = useChat();

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Hide when panel is open - input is inside the panel instead
  if (isPanelOpen) return null;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border"
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-end gap-2">
          {/* Expand/Collapse button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePanel}
            className="flex-shrink-0 h-10 w-10"
          >
            <ChevronUp
              className={cn(
                'h-5 w-5 transition-transform duration-200',
                isPanelOpen && 'rotate-180'
              )}
            />
          </Button>

          {/* Input container */}
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <Textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregúntame algo sobre tu CRM..."
              className="min-h-[44px] max-h-[120px] resize-none pl-10 pr-12 py-3 rounded-xl border-muted-foreground/20 focus:border-primary"
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Send button */}
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
    </motion.div>
  );
}
