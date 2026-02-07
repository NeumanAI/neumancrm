import { useState } from 'react';
import { useAIInsights, AIInsightsError } from '@/hooks/useAIInsights';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  AlertTriangle, 
  Flame,
  CheckCircle,
  RefreshCw,
  CloudOff,
  ChevronDown,
  MessageSquare,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';

interface InsightBoxProps {
  color: 'red' | 'orange' | 'green';
  icon: React.ElementType;
  title: string;
  count: number;
  value: string;
  onClick?: () => void;
}

function InsightBox({ color, icon: Icon, title, count, value, onClick }: InsightBoxProps) {
  const colorStyles = {
    red: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    orange: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
    green: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  };

  const iconStyles = {
    red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
  };

  return (
    <button 
      onClick={onClick}
      className={cn('p-4 rounded-xl border text-left w-full transition-all hover:shadow-md', colorStyles[color])}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('p-2 rounded-lg', iconStyles[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{value}</p>
    </button>
  );
}

export function AIInsightsCard() {
  const { data: insights, isLoading, error, refetch, isFetching } = useAIInsights();
  const [isExpanded, setIsExpanded] = useState(false);
  const { sendPrefilledMessage } = useChat();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const handleAskAI = (prompt: string) => {
    sendPrefilledMessage(prompt);
  };

  // Handle 404 (function not deployed) gracefully
  const typedError = error as unknown as AIInsightsError | null;
  const isNotFoundError = typedError?.isNotFound === true;
  
  if (isNotFoundError) {
    return (
      <Card className="border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-purple-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full blur-3xl opacity-10" />
        <CardContent className="p-8 relative z-10">
          <div className="text-center text-muted-foreground">
            <CloudOff className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-base font-medium">Insights IA no disponibles</p>
            <p className="text-sm mt-1">Esta funcionalidad estará disponible pronto</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle other errors
  if (error && !isNotFoundError) {
    return (
      <Card className="border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-purple-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full blur-3xl opacity-10" />
        <CardContent className="p-8 relative z-10">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">No se pudieron cargar los insights</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-3">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const dealsAtRiskCount = insights?.deals_at_risk?.length || 0;
  const dealsAtRiskValue = insights?.deals_at_risk?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;
  const hotOppsCount = Math.min(5, insights?.pipeline_health?.deals_won_this_month || 0);
  const actionsCount = insights?.contacts_followup?.length || 0;

  return (
    <Card className="border-2 border-purple-200/50 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-purple-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 relative overflow-hidden">
      {/* Decorative blur */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full blur-3xl opacity-10" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-300 rounded-full blur-3xl opacity-10" />
      
      <CardContent className="p-8 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 rounded-xl shadow-lg shadow-purple-600/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Insights Inteligentes de IA</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Análisis automático de tu pipeline y recomendaciones proactivas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="hidden sm:flex"
            >
              {isExpanded ? 'Ver menos' : 'Ver más'}
              <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : insights ? (
          <>
            {/* 3-column grid with clickable insight boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InsightBox 
                color="red" 
                icon={AlertTriangle} 
                title="Deals en Riesgo" 
                count={dealsAtRiskCount} 
                value={`${formatCurrency(dealsAtRiskValue)} en riesgo`}
                onClick={() => handleAskAI('¿Cuáles son mis deals en riesgo y qué acciones recomiendas para cada uno?')}
              />
              <InsightBox 
                color="orange" 
                icon={Flame} 
                title="Oportunidades Hot" 
                count={hotOppsCount} 
                value={`${formatCurrency(insights.pipeline_health?.total_value || 0)} potencial`}
                onClick={() => handleAskAI('Dame un análisis de las oportunidades más prometedoras del pipeline')}
              />
              <InsightBox 
                color="green" 
                icon={CheckCircle} 
                title="Próximas Acciones" 
                count={actionsCount} 
                value="acciones recomendadas"
                onClick={() => handleAskAI('¿Cuáles son las próximas acciones recomendadas para mis contactos?')}
              />
            </div>

            {/* Expanded section */}
            {isExpanded && (
              <div className="mt-6 space-y-6 animate-in slide-in-from-top-2 duration-200">
                {/* Pipeline Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(insights.pipeline_health?.total_value || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Pipeline Activo</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                    <p className="text-2xl font-bold text-green-600">
                      {insights.pipeline_health?.win_rate || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Tasa de Cierre</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                    <p className="text-2xl font-bold">
                      {insights.pipeline_health?.avg_deal_cycle || 0}d
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Ciclo Promedio</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-white/5 border border-white/20">
                    <p className="text-2xl font-bold text-green-600">
                      {insights.pipeline_health?.deals_won_this_month || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Ganados (Mes)</p>
                  </div>
                </div>

                {/* Deals at Risk Details */}
                {insights.deals_at_risk?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Deals que necesitan atención
                    </h4>
                    <div className="space-y-2">
                      {insights.deals_at_risk.slice(0, 3).map((deal) => (
                        <button
                          key={deal.id}
                          onClick={() => handleAskAI(`Analiza el deal "${deal.title}" y sugiere acciones para recuperarlo`)}
                          className="w-full flex items-center justify-between p-3 rounded-lg bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors border border-white/30 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {deal.company_name || 'Sin empresa'} • {deal.reason}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 ml-4 flex items-center gap-2">
                            <p className="text-sm font-semibold">{formatCurrency(deal.value)}</p>
                            <MessageSquare className="h-4 w-4 text-purple-500" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {insights.suggestions?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Sugerencias de IA
                    </h4>
                    <ul className="space-y-2">
                      {insights.suggestions.map((suggestion, index) => (
                        <li 
                          key={index}
                          className="flex items-start gap-3 text-sm text-muted-foreground p-3 rounded-lg bg-white/40 dark:bg-white/5 cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
                          onClick={() => handleAskAI(suggestion)}
                        >
                          <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="flex items-center justify-between pt-6 border-t border-purple-200/50 dark:border-purple-800/30 mt-6">
              <p className="text-sm text-muted-foreground">¿Quieres análisis más profundo?</p>
              <Button 
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
                onClick={() => handleAskAI('Dame un análisis profundo del pipeline con recomendaciones de acción para cada deal')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Pregúntale a la IA
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-purple-400/50" />
            <p className="font-medium">¡Tu pipeline está saludable!</p>
            <p className="text-sm mt-1">Sigue así con el seguimiento de tus oportunidades.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
