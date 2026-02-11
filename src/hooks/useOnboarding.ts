import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface OnboardingState {
  currentStep: number;
  completed: boolean;
  suggestions: string[];
  collectedData: Record<string, string>;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    completed: false,
    suggestions: [],
    collectedData: {},
  });

  // Initialize onboarding - get first AI message
  const initialize = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-onboarding-step', {
        body: { current_step: 0, user_input: null, session_id: user.id },
      });
      if (error) throw error;
      if (data?.message) {
        setMessages([{ role: 'assistant', content: data.message }]);
        setState({
          currentStep: data.current_step ?? 0,
          completed: data.completed ?? false,
          suggestions: data.suggestions ?? [],
          collectedData: data.collected_data ?? {},
        });
      }
    } catch (e) {
      console.error('Onboarding init error:', e);
      // Fallback message
      setMessages([{ role: 'assistant', content: '¡Hola! 👋 Soy tu asistente de configuración. ¿Cómo te gustaría que te llame?' }]);
      setState(s => ({ ...s, suggestions: [] }));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const sendMessage = useCallback(async (input: string) => {
    if (!user || isLoading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('process-onboarding-step', {
        body: { current_step: state.currentStep, user_input: input, session_id: user.id },
      });

      if (error) throw error;

      if (data?.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
        setState({
          currentStep: data.current_step ?? state.currentStep + 1,
          completed: data.completed ?? false,
          suggestions: data.suggestions ?? [],
          collectedData: data.collected_data ?? {},
        });
      }
    } catch (e: any) {
      console.error('Onboarding error:', e);
      toast.error('Error al procesar tu respuesta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading, state.currentStep]);

  return { messages, isLoading, state, sendMessage };
}
