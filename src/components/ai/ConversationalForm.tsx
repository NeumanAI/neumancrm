import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Send, Check, X, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: Record<string, unknown>;
  actions?: string[];
}

interface ConversationalFormProps {
  entity: 'contact' | 'company' | 'opportunity';
  onComplete: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

const ENTITY_LABELS: Record<string, string> = {
  contact: 'Contacto',
  company: 'Empresa',
  opportunity: 'Oportunidad',
};

const INITIAL_MESSAGES: Record<string, string> = {
  contact: '¡Hola! Voy a ayudarte a crear un contacto. Puedes decirme algo como "Conocí a Juan Pérez de Acme Corp, su email es juan@acme.com" o simplemente su nombre. ¿Cómo se llama?',
  company: '¡Perfecto! Creemos una empresa. Dime el nombre y cualquier información que tengas (industria, sitio web, ubicación...).',
  opportunity: '¡Genial! Creemos una oportunidad de negocio. Cuéntame sobre el deal — nombre, valor y para qué empresa o contacto es.',
};

const QUICK_SUGGESTIONS: Record<string, string[]> = {
  contact: ['Juan Pérez de Acme Corp, juan@acme.com', 'María García, CEO de TechStart', 'carlos@empresa.com, teléfono 555-1234'],
  company: ['Acme Corporation, tecnología, México', 'Beta Solutions, consultoría, Madrid', 'StartupXYZ, fintech'],
  opportunity: ['Proyecto software para Acme, $50,000', 'Consultoría anual Beta Inc, $120k', 'Licencias SaaS, 30 mil dólares'],
};

export function ConversationalForm({ entity, onComplete, onCancel }: ConversationalFormProps) {
  const [conversation, setConversation] = useState<Message[]>([
    { role: 'assistant', content: INITIAL_MESSAGES[entity] }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, isProcessing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = { role: 'user', content: input };
    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    setInput('');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-conversational-input', {
        body: {
          input: input,
          entity,
          current_step: currentStep,
          collected_data: collectedData,
          conversation_history: conversation,
        }
      });

      if (error) throw error;

      const newCollectedData = { ...collectedData, ...data.extracted_data };
      setCollectedData(newCollectedData);

      if (data.is_complete) {
        const confirmMessage: Message = {
          role: 'assistant',
          content: data.confirmation_message || '¿Confirmas estos datos?',
          data: data.enriched_data || newCollectedData,
          actions: ['confirm', 'edit', 'cancel'],
        };
        setConversation([...newConversation, confirmMessage]);
      } else {
        const nextMessage: Message = {
          role: 'assistant',
          content: data.next_question || '¿Algo más que quieras añadir?',
        };
        setConversation([...newConversation, nextMessage]);
        setCurrentStep(currentStep + 1);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('NLI Error:', error);
      toast.error('No pude procesar tu mensaje. Intenta de nuevo.');
      // Remove the user message on error
      setConversation(conversation);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium">Crear {ENTITY_LABELS[entity]} con IA</p>
            <p className="text-xs text-muted-foreground">Describe los datos en lenguaje natural</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">AI-Native</Badge>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {conversation.map((msg, idx) => (
            <div key={idx} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted rounded-bl-md'
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {msg.data && (
                  <div className="mt-3 p-3 rounded-lg bg-background/50 border text-xs space-y-1">
                    {Object.entries(msg.data).filter(([, v]) => v).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium text-right">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.actions && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => onComplete(msg.data || collectedData)}
                      className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" /> Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConversation(prev => [...prev.slice(0, -1), {
                          role: 'assistant' as const,
                          content: '¿Qué dato quieres cambiar?'
                        }]);
                      }}
                      className="h-8 text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancel} className="h-8 text-xs text-destructive">
                      <X className="h-3 w-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">TÚ</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-3">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t space-y-2">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu respuesta..."
            disabled={isProcessing}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={isProcessing || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {currentStep === 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Prueba con:</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS[entity].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
