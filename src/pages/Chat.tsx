import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AIConversation, ChatMessage } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Plus, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { parseISO, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const quickActions = [
  'Crear un nuevo contacto',
  'Ver mi pipeline',
  '¿Cuáles son mis tareas de hoy?',
  'Resumen de actividad',
];

// Streaming chat function
async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Error de conexión" }));
      onError(errorData.error || `Error ${resp.status}`);
      return;
    }

    if (!resp.body) {
      onError("No se recibió respuesta del servidor");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream error:", error);
    onError("Error de conexión con el asistente");
  }
}

export default function Chat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ['ai_conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return data.map(conv => ({
        ...conv,
        messages: (conv.messages as unknown as ChatMessage[]) || [],
      })) as AIConversation[];
    },
  });

  // Get current conversation
  const currentConversation = conversations.find(c => c.id === selectedConversationId);
  const messages = currentConversation?.messages || [];

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async (firstMessage: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const initialMessages: ChatMessage[] = [
        { role: 'user', content: firstMessage, timestamp: new Date().toISOString() }
      ];

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          title: firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : ''),
          messages: initialMessages as unknown as never,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, messages: initialMessages };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai_conversations'] });
      setSelectedConversationId(data.id);
    },
  });

  // Update conversation mutation
  const updateConversation = useMutation({
    mutationFn: async ({ id, messages }: { id: string; messages: ChatMessage[] }) => {
      const { error } = await supabase
        .from('ai_conversations')
        .update({
          messages: messages as unknown as never,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_conversations'] });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      let conversationId = selectedConversationId;
      let currentMessages = [...messages];

      if (!conversationId) {
        // Create new conversation
        const newConv = await createConversation.mutateAsync(userMessage);
        conversationId = newConv.id;
        currentMessages = newConv.messages;
      } else {
        // Add user message to existing conversation
        const userMsg: ChatMessage = {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        };
        currentMessages = [...messages, userMsg];
        await updateConversation.mutateAsync({
          id: conversationId,
          messages: currentMessages,
        });
      }

      // Prepare messages for AI (without timestamps)
      const aiMessages = currentMessages.map(m => ({ role: m.role, content: m.content }));

      let assistantContent = '';

      await streamChat({
        messages: aiMessages,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setStreamingContent(assistantContent);
        },
        onDone: async () => {
          // Save complete response
          const aiResponse: ChatMessage = {
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date().toISOString(),
          };
          
          await updateConversation.mutateAsync({
            id: conversationId!,
            messages: [...currentMessages, aiResponse],
          });
          
          setStreamingContent('');
          setIsLoading(false);
        },
        onError: (error) => {
          toast.error(error);
          setStreamingContent('');
          setIsLoading(false);
        },
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = () => {
    setSelectedConversationId(null);
    setStreamingContent('');
  };

  const groupConversationsByDate = (convs: AIConversation[]) => {
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
  };

  const groupedConversations = groupConversationsByDate(conversations);

  // Combine stored messages with streaming content for display
  const displayMessages = streamingContent 
    ? [...messages, { role: 'assistant' as const, content: streamingContent, timestamp: new Date().toISOString() }]
    : messages;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <Card className="w-64 flex-shrink-0 flex flex-col border-0 shadow-card overflow-hidden">
        <div className="p-4 border-b">
          <Button onClick={startNewConversation} className="w-full gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Conversación
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-4">
            {groupedConversations.today.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Hoy</p>
                {groupedConversations.today.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={cn(
                      'w-full text-left p-2 rounded-lg text-sm transition-colors',
                      selectedConversationId === conv.id
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
            )}
            
            {groupedConversations.yesterday.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Ayer</p>
                {groupedConversations.yesterday.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={cn(
                      'w-full text-left p-2 rounded-lg text-sm transition-colors',
                      selectedConversationId === conv.id
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
            )}
            
            {groupedConversations.older.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Más antiguas</p>
                {groupedConversations.older.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversationId(conv.id)}
                    className={cn(
                      'w-full text-left p-2 rounded-lg text-sm transition-colors',
                      selectedConversationId === conv.id
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
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col border-0 shadow-card overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {displayMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2">¿En qué puedo ayudarte?</h2>
                <p className="text-muted-foreground mb-6">
                  Soy tu asistente de CRM con IA. Puedo ayudarte a gestionar contactos, pipeline y tareas.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      onClick={() => {
                        setInputValue(action);
                        textareaRef.current?.focus();
                      }}
                      className="text-sm"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {displayMessages.map((msg, index) => (
                  <motion.div
                    key={`${index}-${msg.content.slice(0, 20)}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={cn(
                      'flex gap-3',
                      msg.role === 'user' && 'flex-row-reverse'
                    )}
                  >
                    <Avatar className={cn(
                      'h-8 w-8',
                      msg.role === 'assistant' && 'bg-primary'
                    )}>
                      <AvatarFallback className={cn(
                        msg.role === 'assistant' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      )}>
                        {msg.role === 'assistant' ? (
                          <Sparkles className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3',
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isLoading && !streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <Avatar className="h-8 w-8 bg-primary">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              className="min-h-[48px] max-h-32 resize-none"
              rows={1}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isLoading}
              className="gradient-primary px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
