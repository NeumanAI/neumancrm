import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useRef,
  useEffect,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AIConversation, ChatMessage } from '@/types/crm';
import { toast } from 'sonner';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Streaming chat function
async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  accessToken,
  currentRoute,
}: {
  messages: { role: string; content: string }[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  accessToken?: string;
  currentRoute?: string;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, currentRoute }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({ error: "Error de conexión" }));
      if (resp.status === 429) {
        // AI limit reached — descriptive toast
        onError(errorData.error || "Has alcanzado el límite de conversaciones IA este mes.");
      } else {
        onError(errorData.error || `Error ${resp.status}`);
      }
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

interface ChatContextType {
  // Panel state
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  
  // Conversations
  conversations: AIConversation[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  startNewConversation: () => void;
  
  // Messages
  displayMessages: ChatMessage[];
  
  // Input
  inputValue: string;
  setInputValue: (value: string) => void;
  
  // Loading state
  isLoading: boolean;
  streamingContent: string;
  
  // Actions
  sendMessage: () => Promise<void>;
  sendPrefilledMessage: (prompt: string) => void;
  
  // Route context
  currentRoute: string;
  
  // Refs
  inputRef: React.RefObject<HTMLTextAreaElement>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const location = useLocation();
  
  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  // Conversation state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  
  // Local messages state for reliable display during streaming
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Prefilled message queue
  const [pendingPrefill, setPendingPrefill] = useState<string | null>(null);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Get current conversation from cache
  const currentConversation = conversations.find(c => c.id === selectedConversationId);

  // Sync local messages with current conversation when not streaming
  useEffect(() => {
    if (!isStreaming && currentConversation) {
      setLocalMessages(currentConversation.messages);
    }
  }, [currentConversation, isStreaming, selectedConversationId]);

  // Reset local messages when starting new conversation
  useEffect(() => {
    if (!selectedConversationId) {
      setLocalMessages([]);
    }
  }, [selectedConversationId]);

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
      setLocalMessages(data.messages);
      setSelectedConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['ai_conversations'] });
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
      return { id, messages };
    },
    onMutate: async ({ id, messages }) => {
      await queryClient.cancelQueries({ queryKey: ['ai_conversations'] });
      const previous = queryClient.getQueryData<AIConversation[]>(['ai_conversations']);
      queryClient.setQueryData<AIConversation[]>(['ai_conversations'], (old) =>
        old?.map(conv => 
          conv.id === id 
            ? { ...conv, messages, last_message_at: new Date().toISOString() }
            : conv
        ) ?? []
      );
      setLocalMessages(messages);
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) queryClient.setQueryData(['ai_conversations'], context.previous);
      toast.error('Error al guardar el mensaje');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_conversations'] });
    },
  });

  // Panel actions
  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), []);

  // Conversation actions
  const startNewConversation = useCallback(() => {
    setSelectedConversationId(null);
    setStreamingContent('');
  }, []);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    
    if (!isPanelOpen) setIsPanelOpen(true);

    try {
      let conversationId = selectedConversationId;
      let currentMessages = [...localMessages];

      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };
      
      if (!conversationId) {
        setLocalMessages([userMsg]);
        const newConv = await createConversation.mutateAsync(userMessage);
        conversationId = newConv.id;
        currentMessages = newConv.messages;
      } else {
        currentMessages = [...localMessages, userMsg];
        setLocalMessages(currentMessages);
        await updateConversation.mutateAsync({ id: conversationId, messages: currentMessages });
      }

      const aiMessages = currentMessages.map(m => ({ role: m.role, content: m.content }));
      const { data: { session } } = await supabase.auth.getSession();

      let assistantContent = '';

      await streamChat({
        messages: aiMessages,
        accessToken: session?.access_token,
        currentRoute: location.pathname,
        onDelta: (chunk) => {
          assistantContent += chunk;
          setStreamingContent(assistantContent);
        },
        onDone: async () => {
          const aiResponse: ChatMessage = {
            role: 'assistant',
            content: assistantContent,
            timestamp: new Date().toISOString(),
          };
          const finalMessages = [...currentMessages, aiResponse];
          await updateConversation.mutateAsync({ id: conversationId!, messages: finalMessages });
          setLocalMessages(finalMessages);
          setStreamingContent('');
          setIsStreaming(false);
          setIsLoading(false);
        },
        onError: (error) => {
          toast.error(error);
          setStreamingContent('');
          setIsStreaming(false);
          setIsLoading(false);
        },
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isPanelOpen, selectedConversationId, localMessages, createConversation, updateConversation, location.pathname]);

  // Send prefilled message - sets input and triggers send on next tick
  const sendPrefilledMessage = useCallback((prompt: string) => {
    setInputValue(prompt);
    setIsPanelOpen(true);
    setPendingPrefill(prompt);
  }, []);

  // Process pending prefill
  useEffect(() => {
    if (pendingPrefill && inputValue === pendingPrefill && !isLoading) {
      setPendingPrefill(null);
      // Use setTimeout to ensure state is settled
      const timer = setTimeout(() => {
        sendMessage();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingPrefill, inputValue, isLoading, sendMessage]);

  // Display messages with streaming
  const displayMessages = streamingContent 
    ? [...localMessages, { role: 'assistant' as const, content: streamingContent, timestamp: new Date().toISOString() }]
    : localMessages;

  return (
    <ChatContext.Provider
      value={{
        isPanelOpen,
        openPanel,
        closePanel,
        togglePanel,
        conversations,
        selectedConversationId,
        setSelectedConversationId,
        startNewConversation,
        displayMessages,
        inputValue,
        setInputValue,
        isLoading,
        streamingContent,
        sendMessage,
        sendPrefilledMessage,
        currentRoute: location.pathname,
        inputRef,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
