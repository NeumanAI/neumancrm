import { useState, useEffect, KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, ChevronLeft, PanelRightClose, PanelRightOpen,
  Send, Loader2, Plus, RefreshCw, AlertTriangle, Flame, Lightbulb,
  X, CheckCircle, MessageSquare, History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { supabase } from '@/integrations/supabase/client';
import { AIConversation } from '@/types/crm';
import { parseISO, isToday, isYesterday } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Suggestion types ───
interface Suggestion {
  id: string;
  type: 'urgent' | 'important' | 'suggestion';
  title: string;
  description: string;
  action: string;
  action_data: { type: string; route: string };
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

// ─── Inline conversation sidebar (collapsible) ───
function ConversationSidebar({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    startNewConversation,
  } = useChat();

  const grouped = groupByDate(conversations);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-[7.5rem] left-1 z-10 h-6 w-6"
        onClick={onToggle}
      >
        {isOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <History className="h-3.5 w-3.5" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 180, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-border bg-muted/30 flex flex-col overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <Button
                onClick={startNewConversation}
                className="w-full gradient-primary"
                size="sm"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nueva
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-3">
                <DateGroup title="Hoy" items={grouped.today} selectedId={selectedConversationId} onSelect={setSelectedConversationId} />
                <DateGroup title="Ayer" items={grouped.yesterday} selectedId={selectedConversationId} onSelect={setSelectedConversationId} />
                <DateGroup title="Anteriores" items={grouped.older} selectedId={selectedConversationId} onSelect={setSelectedConversationId} />
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DateGroup({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: AIConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground px-1.5 mb-1">{title}</p>
      {items.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={cn(
            'w-full text-left px-1.5 py-1 rounded text-[11px] transition-colors truncate flex items-center gap-1.5',
            selectedId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
          )}
        >
          <MessageSquare className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{c.title || 'Nueva conversación'}</span>
        </button>
      ))}
    </div>
  );
}

function groupByDate(convs: AIConversation[]) {
  const groups = { today: [] as AIConversation[], yesterday: [] as AIConversation[], older: [] as AIConversation[] };
  convs.forEach((c) => {
    const d = parseISO(c.last_message_at);
    if (isToday(d)) groups.today.push(c);
    else if (isYesterday(d)) groups.yesterday.push(c);
    else groups.older.push(c);
  });
  return groups;
}

// ─── Main component ───
interface AIAssistantProps {
  onMinimizedChange?: (minimized: boolean) => void;
}

export function AIAssistant({ onMinimizedChange }: AIAssistantProps) {
  const isMobile = useIsMobile();
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    // Default to minimized
    const stored = sessionStorage.getItem('ai-assistant-minimized');
    return stored === null ? true : stored === 'true';
  });
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [showConversations, setShowConversations] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const {
    displayMessages,
    inputValue,
    setInputValue,
    sendMessage,
    isLoading,
    streamingContent,
    inputRef,
    startNewConversation,
  } = useChat();

  // Persist minimized state
  useEffect(() => {
    sessionStorage.setItem('ai-assistant-minimized', String(isMinimized));
    onMinimizedChange?.(isMinimized);
  }, [isMinimized, onMinimizedChange]);

  // Load suggestions
  useEffect(() => {
    loadSuggestions();
    const interval = setInterval(loadSuggestions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  async function loadSuggestions() {
    setIsLoadingSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-coworker-suggestions', {
        body: { current_page: location.pathname },
      });
      if (!error && data) {
        setSuggestions(data.suggestions || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Suggestions error:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }

  function handleAction(s: Suggestion) {
    if (s.action_data?.type === 'navigate') navigate(s.action_data.route);
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  function dismissSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const urgentCount = suggestions.filter((s) => s.type === 'urgent').length;

  // ─── Minimized state ───
  if (isMinimized) {
    return (
      <>
        {/* Desktop: vertical strip */}
        <div className="fixed right-0 top-0 bottom-0 w-14 z-30 hidden md:flex flex-col items-center bg-card border-l border-border">
          <button
            onClick={() => setIsMinimized(false)}
            className="mt-4 flex flex-col items-center gap-3 group"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            {urgentCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 min-w-[20px] h-5">
                {urgentCount}
              </Badge>
            )}
          </button>
          <span className="writing-mode-vertical text-[11px] font-medium text-muted-foreground mt-4 select-none">
            AI Assistant
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setIsMinimized(false)}
            className="mb-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile: FAB */}
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 z-40 md:hidden h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
        >
          <Sparkles className="h-6 w-6 text-white" />
          {urgentCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold">
              {urgentCount}
            </span>
          )}
        </button>
      </>
    );
  }

  // ─── Expanded state ───
  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
        onClick={() => setIsMinimized(true)}
      />

      {/* Panel */}
      <div className={cn(
        "fixed z-50 flex flex-col bg-card border-l border-border shadow-xl",
        "inset-0 md:inset-auto",
        "md:right-0 md:top-0 md:bottom-0 md:w-[420px] md:z-30"
      )}>
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold leading-tight">AI Assistant</h2>
                <p className="text-[10px] text-white/70">Tu copiloto inteligente</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                onClick={startNewConversation}
                title="Nueva conversación"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              {/* Mobile: X button, Desktop: minimize */}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 md:hidden"
                onClick={() => setIsMinimized(true)}
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 hidden md:flex"
                onClick={() => setIsMinimized(true)}
                title="Minimizar"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="px-3 pb-1">
            <TabsList className="w-full bg-white/10 border-0 h-8">
              <TabsTrigger
                value="chat"
                className="flex-1 text-xs text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none h-6"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="flex-1 text-xs text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:shadow-none h-6"
              >
                Sugerencias
                {urgentCount > 0 && (
                  <Badge variant="destructive" className="ml-1.5 text-[9px] px-1 h-4 min-w-[16px]">
                    {urgentCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === 'chat' ? (
            <ChatTab
              showConversations={showConversations}
              onToggleConversations={() => setShowConversations(!showConversations)}
              displayMessages={displayMessages}
              isLoading={isLoading}
              streamingContent={streamingContent}
              inputValue={inputValue}
              setInputValue={setInputValue}
              sendMessage={sendMessage}
              handleKeyDown={handleKeyDown}
              inputRef={inputRef}
            />
          ) : (
            <SuggestionsTab
              suggestions={suggestions}
              isLoading={isLoadingSuggestions}
              lastUpdated={lastUpdated}
              onRefresh={loadSuggestions}
              onAction={handleAction}
              onDismiss={dismissSuggestion}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-3 py-1.5 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            Powered by AI • Contexto: {location.pathname}
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Chat Tab ───
function ChatTab({
  showConversations,
  onToggleConversations,
  displayMessages,
  isLoading,
  streamingContent,
  inputValue,
  setInputValue,
  sendMessage,
  handleKeyDown,
  inputRef,
}: {
  showConversations: boolean;
  onToggleConversations: () => void;
  displayMessages: any[];
  isLoading: boolean;
  streamingContent: string;
  inputValue: string;
  setInputValue: (v: string) => void;
  sendMessage: () => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div className="flex-1 flex min-h-0 relative">
      <ConversationSidebar isOpen={showConversations} onToggle={onToggleConversations} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <ChatMessages
              messages={displayMessages}
              isLoading={isLoading}
              streamingContent={streamingContent}
            />
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 border-t border-border p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntame algo..."
                className="min-h-[40px] max-h-[100px] resize-none pl-8 pr-3 py-2.5 text-sm rounded-xl border-muted-foreground/20 focus:border-primary"
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
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Suggestions Tab ───
function SuggestionsTab({
  suggestions,
  isLoading,
  lastUpdated,
  onRefresh,
  onAction,
  onDismiss,
}: {
  suggestions: Suggestion[];
  isLoading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onAction: (s: Suggestion) => void;
  onDismiss: (id: string) => void;
}) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'important':
        return <Flame className="h-4 w-4 text-amber-500" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'border-l-destructive';
      case 'important':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-border">
        <p className="text-xs text-muted-foreground">
          {lastUpdated
            ? `Actualizado: ${lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
            : 'Cargando...'}
        </p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {isLoading && suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs">Analizando tu CRM...</p>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className={cn(
                  'p-3 rounded-lg border-l-4 bg-card border border-border shadow-sm',
                  getBorderColor(s.type),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getIcon(s.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDismiss(s.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onAction(s)}>
                    {s.action}
                  </Button>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Sparkles className="h-8 w-8 mb-3 text-primary/30" />
              <p className="text-sm font-medium">Todo en orden</p>
              <p className="text-xs mt-1">No hay sugerencias por ahora</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
