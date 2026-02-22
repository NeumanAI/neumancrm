import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ChevronRight, ChevronLeft, Sparkles, AlertTriangle,
  Flame, Lightbulb, X, RefreshCw, CheckCircle, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

export function AICoWorker() {
  const [isMinimized, setIsMinimized] = useState(() => {
    return sessionStorage.getItem('coworker-minimized') === 'true';
  });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem('coworker-minimized', String(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    loadSuggestions();
    const interval = setInterval(loadSuggestions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  async function loadSuggestions() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-coworker-suggestions', {
        body: { current_page: location.pathname }
      });
      if (!error && data) {
        setSuggestions(data.suggestions || []);
        setLastUpdated(new Date());
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('CoWorker error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAction(suggestion: Suggestion) {
    if (suggestion.action_data?.type === 'navigate') {
      navigate(suggestion.action_data.route);
    }
    dismissSuggestion(suggestion.id);
  }

  function dismissSuggestion(id: string) {
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'important': return <Flame className="h-4 w-4 text-amber-500" />;
      default: return <Lightbulb className="h-4 w-4 text-blue-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'border-l-destructive';
      case 'important': return 'border-l-amber-500';
      default: return 'border-l-blue-500';
    }
  };

  const urgentCount = suggestions.filter(s => s.type === 'urgent').length;

  if (isMinimized) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex flex-col items-center gap-2 bg-card border border-r-0 rounded-l-lg p-2 shadow-lg hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {urgentCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 min-w-[20px] h-5">
              {urgentCount}
            </Badge>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-16 bottom-0 w-72 bg-card border-l shadow-lg z-20 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI Co-Worker</p>
            <p className="text-[10px] text-muted-foreground">Tu asistente 24/7</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadSuggestions} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsMinimized(true)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {isLoading && suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs">Analizando tu CRM...</p>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className={cn(
                  "rounded-lg border border-l-4 p-3 space-y-2 bg-background",
                  getBorderColor(suggestion.type)
                )}
              >
                <div className="flex items-start gap-2">
                  {getIcon(suggestion.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">{suggestion.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{suggestion.description}</p>
                  </div>
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {suggestion.impact === 'high' ? 'Alto impacto' : suggestion.impact === 'medium' ? 'Medio' : 'Bajo'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 text-[11px] px-2"
                    onClick={() => handleAction(suggestion)}
                  >
                    {suggestion.action}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
              <p className="text-sm font-medium">¡Todo al día!</p>
              <p className="text-xs">No hay acciones urgentes</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {lastUpdated && (
        <div className="p-2 border-t">
          <p className="text-[10px] text-muted-foreground text-center">
            Actualizado: {lastUpdated.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}
