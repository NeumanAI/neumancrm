import { CreditCard, Zap, Users, BookOpen, Star, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCurrentUsage, useCurrentSubscription } from '@/hooks/usePricing';

function UsageBar({
  label,
  used,
  limit,
  icon: Icon,
}: {
  label: string;
  used: number;
  limit: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pct = limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const isUnlimited = limit === -1;
  const isCritical = pct >= 90;
  const isWarning = pct >= 75 && pct < 90;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
        <span className="text-sm text-muted-foreground">
          {isUnlimited ? (
            <span className="text-primary font-medium">Ilimitado</span>
          ) : (
            <>
              <span className={isCritical ? 'text-destructive font-semibold' : isWarning ? 'text-amber-600 font-semibold' : ''}>
                {used.toLocaleString()}
              </span>
              {' / '}{limit.toLocaleString()}
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={pct}
          className={`h-2 ${isCritical ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : ''}`}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    trial: { label: 'Trial', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
    active: { label: 'Activo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    suspended: { label: 'Suspendido', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
    expired: { label: 'Expirado', className: 'bg-muted text-muted-foreground' },
  };
  const cfg = map[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="secondary" className={cfg.className}>
      {cfg.label}
    </Badge>
  );
}

export function BillingTab() {
  const { data: usage, isLoading: usageLoading } = useCurrentUsage();
  const { data: subscription, isLoading: subLoading } = useCurrentSubscription();

  const isLoading = usageLoading || subLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const plan = subscription?.plan;
  const aiPct = usage && usage.ai_conversations_limit > 0
    ? Math.round((usage.ai_conversations_used / usage.ai_conversations_limit) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Plan Actual
              </CardTitle>
              <CardDescription>Tu suscripción activa y estado de facturación</CardDescription>
            </div>
            {usage && <StatusBadge status={usage.subscription_status} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              {plan?.is_featured ? (
                <Star className="h-7 w-7 text-primary fill-primary/30" />
              ) : (
                <CreditCard className="h-7 w-7 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">{usage?.plan_name || 'Trial'}</h3>
              {plan && (
                <p className="text-muted-foreground text-sm">
                  ${plan.price_usd}/mes · {plan.plan_type === 'bundle' ? 'Bundle' : 'Individual'}
                </p>
              )}
            </div>
          </div>

          {plan?.features && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(plan.features as string[]).map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Card */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Consumo del Mes
          </CardTitle>
          <CardDescription>
            Tu uso actual en el período mensual en curso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {usage ? (
            <>
              {/* AI Alert */}
              {!usage.can_use_ai && usage.ai_conversations_limit === 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    Tu plan <strong>CRM Base</strong> no incluye asistente IA. Contacta a tu administrador para cambiar de plan.
                  </p>
                </div>
              )}
              {!usage.can_use_ai && usage.ai_conversations_limit > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">
                    Has alcanzado el límite de conversaciones IA este mes. El asistente volverá a estar disponible el próximo período.
                  </p>
                </div>
              )}
              {usage.can_use_ai && aiPct >= 80 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    Has usado el {aiPct}% de tus conversaciones IA este mes.
                  </p>
                </div>
              )}

              <UsageBar
                label="Conversaciones IA"
                used={usage.ai_conversations_used}
                limit={usage.ai_conversations_limit}
                icon={Zap}
              />
              <UsageBar
                label="Usuarios activos"
                used={usage.users_count}
                limit={usage.users_limit}
                icon={Users}
              />
              <UsageBar
                label="Contactos"
                used={usage.contacts_count}
                limit={usage.contacts_limit}
                icon={BookOpen}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No se pudo cargar el consumo. Intenta recargar la página.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Para cambiar de plan, contacta a tu administrador o reseller. Los cambios se aplican manualmente.
      </p>
    </div>
  );
}
