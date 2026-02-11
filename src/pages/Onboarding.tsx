import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandingContext } from '@/contexts/BrandingContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Onboarding() {
  const [input, setInput] = useState('');
  const { user } = useAuth();
  const { branding } = useBrandingContext();
  const { messages, isLoading, state, sendMessage } = useOnboarding();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (state.completed) {
      const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.completed, navigate]);

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

  const progressPercent = (state.currentStep / 5) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.name} className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          <span className="font-semibold text-foreground">{branding.name}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Paso {Math.min(state.currentStep + 1, 5)} de 5</span>
        </div>
      </header>

      {/* Progress */}
      <div className="px-6 pt-4">
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-auto px-6 py-8 max-w-2xl mx-auto w-full">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start mb-4"
          >
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </motion.div>
        )}

        {state.completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 rounded-full gradient-primary mx-auto flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">¡Todo listo!</p>
            <p className="text-sm text-muted-foreground mt-1">Redirigiendo al dashboard...</p>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {state.suggestions.length > 0 && !state.completed && (
        <div className="px-6 pb-2 max-w-2xl mx-auto w-full">
          <div className="flex flex-wrap gap-2">
            {state.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(s)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!state.completed && (
        <div className="border-t border-border px-6 py-4 max-w-2xl mx-auto w-full">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu respuesta..."
              disabled={isLoading}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
