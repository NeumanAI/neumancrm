import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandingContext } from '@/contexts/BrandingContext';
import { useOnboarding, SetupStep } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Send, Loader2, CheckCircle2, Circle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Goal → Action mapping ─────────────────────────────────────
const GOAL_TO_ACTION: Record<string, {
  emoji: string;
  title: string;
  description: string;
  cta: string;
  route: string;
}> = {
  "📋 Organizar mis contactos": {
    emoji: "👥",
    title: "Agrega tu primer contacto",
    description: "Empieza guardando a un cliente o prospecto. Puedes pedirle al asistente que lo haga por ti.",
    cta: "Agregar primer contacto",
    route: "/contacts",
  },
  "📈 Hacer seguimiento a ventas": {
    emoji: "📈",
    title: "Crea tu primer deal",
    description: "Agrega una oportunidad de venta al pipeline. El asistente puede ayudarte.",
    cta: "Ir al pipeline",
    route: "/pipeline",
  },
  "🤖 Automatizar comunicaciones": {
    emoji: "💬",
    title: "Conecta tu primer canal",
    description: "Integra WhatsApp o email para empezar a automatizar tus conversaciones.",
    cta: "Ver conversaciones",
    route: "/conversations",
  },
  "📊 Ver mis métricas": {
    emoji: "📊",
    title: "Explora tu dashboard",
    description: "Tu dashboard personalizado está listo. Ve tus métricas en tiempo real.",
    cta: "Ir al dashboard",
    route: "/dashboard",
  },
};

// ── Setup Panel ────────────────────────────────────────────────
function SetupPanel({ steps }: { steps: SetupStep[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 py-6"
    >
      <div className="text-center mb-6">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <p className="font-semibold text-lg">Configurando tu CRM...</p>
        <p className="text-sm text-muted-foreground">Solo un momento</p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.4 }}
            className="flex items-center gap-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.4 + 0.2 }}
            >
              {step.done
                ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                : <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
            </motion.div>
            <span className={`text-sm ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── First Action Panel ─────────────────────────────────────────
function FirstActionPanel({
  firstGoal,
  onAction,
  onSkip,
  userName,
}: {
  firstGoal: string | null;
  onAction: (route: string) => void;
  onSkip: () => void;
  userName?: string;
}) {
  const action = firstGoal
    ? GOAL_TO_ACTION[firstGoal] ?? GOAL_TO_ACTION["📋 Organizar mis contactos"]
    : GOAL_TO_ACTION["📋 Organizar mis contactos"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6 py-4"
    >
      <div>
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-9 w-9 text-green-600" />
        </div>
        <p className="font-bold text-xl">
          ¡Tu CRM está listo{userName ? `, ${userName}` : ''}! 🎉
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Todo está configurado para tu negocio.
        </p>
      </div>

      <div className="rounded-2xl border bg-muted/30 p-5 text-left max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{action.emoji}</span>
          <p className="font-semibold">{action.title}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
        <Button className="w-full gap-2" onClick={() => onAction(action.route)}>
          {action.cta} →
        </Button>
      </div>

      <button
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        onClick={onSkip}
      >
        Prefiero explorar solo
      </button>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Onboarding() {
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const { branding } = useBrandingContext();
  const { messages, isLoading, state, sendMessage, finishOnboarding } = useOnboarding();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (state.phase === 'done') {
      navigate('/dashboard', { replace: true });
    }
  }, [state.phase, navigate]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleSuggestion = (text: string) => {
    if (isLoading) return;
    sendMessage(text);
  };

  const progressPercent = Math.min((state.currentStep / 6) * 100, 100);
  const stepLabel = state.phase === 'chat'
    ? `Paso ${Math.min(state.currentStep + 1, 6)} de 6`
    : state.phase === 'setup' ? 'Configurando...'
    : state.phase === 'action' ? '¡Listo!'
    : '';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {branding.logo_url
            ? <img src={branding.logo_url} alt={branding.name} className="w-8 h-8 rounded-lg object-contain" />
            : <img src="/neuman-logo.png" alt="Neuman CRM" className="w-8 h-8 rounded-lg object-contain" />}
          <span className="font-semibold text-foreground">{branding.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">{stepLabel}</span>
      </header>

      {/* Progress bar */}
      <div className="px-6 pt-3 flex-shrink-0">
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-4 py-6 max-w-xl mx-auto w-full">

        {/* Phase: chat */}
        {state.phase === 'chat' && (
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {isLoading && state.phase === 'chat' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase: setup */}
        {state.phase === 'setup' && (
          <SetupPanel steps={state.setupSteps.length > 0 ? state.setupSteps : [
            { label: `Creando tu espacio "${state.collectedData.company_name ?? 'Mi empresa'}"`, done: true },
            { label: "Configurando pipeline de ventas", done: true },
            { label: "Preparando categorías para tu industria", done: true },
            { label: "Activando plan gratuito — 14 días con IA completa", done: true },
          ]} />
        )}

        {/* Phase: first action */}
        {state.phase === 'action' && (
          <FirstActionPanel
            firstGoal={state.firstGoal}
            userName={state.collectedData.preferred_name}
            onAction={(route) => { finishOnboarding(); navigate(route, { replace: true }); }}
            onSkip={() => { finishOnboarding(); }}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {state.phase === 'chat' && state.suggestions.length > 0 && (
        <div className="px-4 pb-2 max-w-xl mx-auto w-full flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {state.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground hover:bg-muted hover:border-primary/40 transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {state.phase === 'chat' && (
        <div className="border-t border-border px-4 py-4 max-w-xl mx-auto w-full flex-shrink-0">
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu respuesta..."
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
