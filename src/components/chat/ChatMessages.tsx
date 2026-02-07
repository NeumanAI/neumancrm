import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/types/crm';
import ReactMarkdown from 'react-markdown';
import { useChat } from '@/contexts/ChatContext';

function getContextualQuickActions(pathname: string): string[] {
  const base = ['Dame un resumen ejecutivo'];

  if (pathname === '/pipeline') {
    return [...base, 'Analiza la salud de mis deals', '¿Cuáles deals están en riesgo?', 'Resumen del pipeline'];
  }
  if (pathname === '/contacts') {
    return [...base, 'Busca contactos sin seguimiento', 'Crea un contacto nuevo', 'Contactos con WhatsApp'];
  }
  if (pathname === '/tasks') {
    return [...base, '¿Qué tareas tengo para hoy?', 'Tareas vencidas', 'Completa la tarea...'];
  }
  if (pathname === '/companies') {
    return [...base, 'Lista mis empresas', 'Busca empresa por industria', 'Crear empresa nueva'];
  }
  if (pathname === '/team') {
    return [...base, 'Resumen del equipo', 'Progreso de cuotas', '¿Quién tiene más deals?'];
  }
  if (pathname === '/projects') {
    return [...base, 'Lista proyectos activos', 'Métricas por proyecto', 'Crear nuevo proyecto'];
  }
  if (pathname === '/conversations') {
    return [...base, 'Conversaciones abiertas', 'Mensajes sin leer', 'Resumen de conversación'];
  }
  if (pathname.startsWith('/contacts/')) {
    return [...base, 'Analiza este contacto', 'Siguiente mejor acción', 'Historial de interacciones'];
  }
  if (pathname.startsWith('/companies/')) {
    return [...base, 'Deals de esta empresa', 'Contactos asociados', 'Análisis de relación'];
  }
  if (pathname.startsWith('/projects/')) {
    return [...base, 'Métricas de este proyecto', 'Contactos del proyecto', 'Pipeline del proyecto'];
  }

  return [...base, 'Buscar en todo el CRM', 'Ver mi pipeline', '¿Cuáles son mis tareas de hoy?'];
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  streamingContent?: string;
}

export function ChatMessages({ messages, isLoading, streamingContent }: ChatMessagesProps) {
  const { setInputValue, inputRef, currentRoute } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions = getContextualQuickActions(currentRoute);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="space-y-6">
      {messages.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold mb-2">¿En qué puedo ayudarte?</h2>
          <p className="text-muted-foreground mb-6">
            Soy tu copiloto de CRM con IA. Puedo gestionar contactos, pipeline, tareas, conversaciones y mucho más.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                onClick={() => {
                  setInputValue(action);
                  inputRef.current?.focus();
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
                'h-8 w-8 flex-shrink-0',
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
          <Avatar className="h-8 w-8 bg-primary flex-shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="bg-muted rounded-2xl px-4 py-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
            </div>
          </div>
        </motion.div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
