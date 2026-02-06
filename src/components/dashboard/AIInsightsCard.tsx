import { useAIInsights, AIInsightsError } from '@/hooks/useAIInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  AlertTriangle, 
  UserCheck, 
  Lightbulb,
  TrendingUp,
  RefreshCw,
  CloudOff
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AIInsightsCard() {
  const { data: insights, isLoading, error, refetch, isFetching } = useAIInsights();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Handle 404 (function not deployed) gracefully
  const typedError = error as unknown as AIInsightsError | null;
  const isNotFoundError = typedError?.isNotFound === true;
  
  if (isNotFoundError) {
    return (
      <Card className="border-0 shadow-card bg-gradient-to-br from-muted/50 to-muted/30">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <CloudOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Insights IA no disponibles por el momento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle other errors
  if (error && !isNotFoundError) {
    return (
      <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>No se pudieron cargar los insights</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg font-semibold">Insights IA</CardTitle>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : insights ? (
          <>
            {/* Pipeline Health Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(insights.pipeline_health.total_value)}
                </p>
                <p className="text-xs text-muted-foreground">Pipeline Activo</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-green-600">
                  {insights.pipeline_health.win_rate}%
                </p>
                <p className="text-xs text-muted-foreground">Tasa de Cierre</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold">
                  {insights.pipeline_health.avg_deal_cycle}d
                </p>
                <p className="text-xs text-muted-foreground">Ciclo Promedio</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-2xl font-bold text-green-600">
                  {insights.pipeline_health.deals_won_this_month}
                </p>
                <p className="text-xs text-muted-foreground">Ganados (Mes)</p>
              </div>
            </div>

            {/* Deals at Risk */}
            {insights.deals_at_risk.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h4 className="font-medium text-sm">Deals en Riesgo</h4>
                  <Badge variant="outline" className="text-warning border-warning">
                    {insights.deals_at_risk.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {insights.deals_at_risk.slice(0, 3).map((deal) => (
                    <Link
                      key={deal.id}
                      to="/pipeline"
                      className="flex items-center justify-between p-3 rounded-lg bg-warning/5 hover:bg-warning/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.company_name || 'Sin empresa'} • {deal.reason}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-semibold">{formatCurrency(deal.value)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts needing follow-up */}
            {insights.contacts_followup.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium text-sm">Necesitan Follow-up</h4>
                  <Badge variant="outline" className="text-blue-500 border-blue-500">
                    {insights.contacts_followup.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insights.contacts_followup.slice(0, 5).map((contact) => (
                    <Link
                      key={contact.id}
                      to={`/contacts/${contact.id}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-full bg-blue-500/5 hover:bg-blue-500/10 transition-colors"
                    >
                      <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-medium text-blue-600">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{contact.name.split(' ')[0]}</span>
                      <Badge variant="secondary" className="text-xs">
                        {contact.days_since_contact}d
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            {insights.suggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium text-sm">Sugerencias de IA</h4>
                </div>
                <ul className="space-y-2">
                  {insights.suggestions.map((suggestion, index) => (
                    <li 
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty state */}
            {insights.deals_at_risk.length === 0 && 
             insights.contacts_followup.length === 0 && 
             insights.suggestions.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                <p>¡Tu pipeline está saludable!</p>
                <p className="text-sm">Sigue así con el seguimiento de tus oportunidades.</p>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
