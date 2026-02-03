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
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const quickActions = [
  'Crear un nuevo contacto',
  'Ver mi pipeline',
  '¿Cuáles son mis tareas de hoy?',
  'Resumen de actividad',
];

export default function Chat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      if (!selectedConversationId) {
        // Create new conversation
        const newConv = await createConversation.mutateAsync(userMessage);
        
        // Simulate AI response (replace with actual API call)
        setTimeout(async () => {
          const aiResponse: ChatMessage = {
            role: 'assistant',
            content: getAIResponse(userMessage),
            timestamp: new Date().toISOString(),
          };
          
          const updatedMessages = [
            ...newConv.messages,
            aiResponse,
          ];
          
          await updateConversation.mutateAsync({
            id: newConv.id,
            messages: updatedMessages,
          });
          setIsLoading(false);
        }, 1000);
      } else {
        // Add to existing conversation
        const userMsg: ChatMessage = {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        };
        
        const updatedMessages = [...messages, userMsg];
        await updateConversation.mutateAsync({
          id: selectedConversationId,
          messages: updatedMessages,
        });

        // Simulate AI response
        setTimeout(async () => {
          const aiResponse: ChatMessage = {
            role: 'assistant',
            content: getAIResponse(userMessage),
            timestamp: new Date().toISOString(),
          };
          
          await updateConversation.mutateAsync({
            id: selectedConversationId,
            messages: [...updatedMessages, aiResponse],
          });
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
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
  };

  const getAIResponse = (userMessage: string): string => {
    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('contacto') || lowerMsg.includes('crear')) {
      return '¡Por supuesto! Para crear un nuevo contacto, puedo ayudarte. Ve a la sección de **Contactos** en el menú lateral y haz clic en "+ Nuevo Contacto". \n\nTambién puedes decirme los datos del contacto y yo lo crearé por ti:\n- Nombre\n- Email\n- Empresa\n- Cargo';
    }
    
    if (lowerMsg.includes('pipeline') || lowerMsg.includes('oportunidad')) {
      return 'Tu **Pipeline de Ventas** te permite visualizar todas tus oportunidades en un tablero Kanban. Cada columna representa una etapa del proceso de venta:\n\n1. 📋 Lead\n2. ✅ Calificado\n3. 📅 Reunión\n4. 📄 Propuesta\n5. 🤝 Negociación\n6. 🎉 Ganado\n\nPuedes arrastrar las oportunidades entre etapas para actualizar su estado.';
    }
    
    if (lowerMsg.includes('tarea') || lowerMsg.includes('hoy')) {
      return 'Aquí tienes un resumen de tus tareas:\n\n- Revisa tus tareas pendientes en la sección **Tareas** del menú\n- Puedes filtrar por: Pendientes, Hoy, Esta Semana, Completadas\n- Cada tarea tiene una prioridad asignada\n\n¿Quieres que te ayude a crear una nueva tarea?';
    }
    
    if (lowerMsg.includes('resumen') || lowerMsg.includes('actividad')) {
      return '📊 **Resumen de Actividad**\n\nTu CRM está funcionando correctamente. Aquí tienes algunas métricas:\n\n- Puedes ver estadísticas detalladas en el **Dashboard**\n- El gráfico de pipeline muestra la evolución de tus ventas\n- La distribución por etapa te ayuda a identificar cuellos de botella\n\n¿Hay algo específico que te gustaría analizar?';
    }
    
    return '¡Hola! Soy tu asistente de CRM. Puedo ayudarte con:\n\n- 👥 **Gestionar contactos y empresas**\n- 💰 **Administrar tu pipeline de ventas**\n- ✅ **Organizar tus tareas**\n- 📊 **Analizar tu actividad comercial**\n\n¿En qué puedo ayudarte hoy?';
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
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2">¿En qué puedo ayudarte?</h2>
                <p className="text-muted-foreground mb-6">
                  Soy tu asistente de CRM. Puedo ayudarte a gestionar contactos, pipeline y tareas.
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
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
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
            
            {isLoading && (
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
