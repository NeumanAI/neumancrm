import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface OnboardingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SetupStep {
  label: string;
  done: boolean;
}

export interface OnboardingState {
  currentStep: number;
  completed: boolean;
  suggestions: string[];
  collectedData: Record<string, string>;
  setupSteps: SetupStep[];
  firstGoal: string | null;
  phase: 'chat' | 'setup' | 'action' | 'done';
}

export function useOnboarding() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<OnboardingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    completed: false,
    suggestions: [],
    collectedData: {},
    setupSteps: [],
    firstGoal: null,
    phase: 'chat',
  });

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
        setState(s => ({
          ...s,
          currentStep: data.current_step ?? 0,
          suggestions: data.suggestions ?? [],
          collectedData: data.collected_data ?? {},
        }));
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('Onboarding init error:', e);
      setMessages([{
        role: 'assistant',
        content: '👋 ¡Hola! Soy tu asistente de NeumanCRM. Voy a ayudarte a configurar todo en minutos. ¿Cuál es tu nombre?',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { initialize(); }, [initialize]);

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
      }

      const isCompleted = data?.completed ?? false;
      const nextStep = data?.current_step ?? state.currentStep + 1;

      setState(s => ({
        ...s,
        currentStep: nextStep,
        completed: isCompleted,
        suggestions: data?.suggestions ?? [],
        collectedData: data?.collected_data ?? s.collectedData,
        setupSteps: data?.setup_steps ?? [],
        firstGoal: data?.first_goal ?? null,
        phase: isCompleted ? 'setup' : 'chat',
      }));

      if (isCompleted) {
        setTimeout(() => {
          setState(s => ({ ...s, phase: 'action' }));
        }, 3500);
      }

    } catch (e: any) {
      if (import.meta.env.DEV) console.error('Onboarding error:', e);
      toast.error('Error al procesar tu respuesta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading, state.currentStep]);

  const finishOnboarding = useCallback(() => {
    setState(s => ({ ...s, phase: 'done' }));
  }, []);

  return { messages, isLoading, state, sendMessage, finishOnboarding };
}
