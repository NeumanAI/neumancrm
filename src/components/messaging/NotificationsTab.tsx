import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, UserPlus, CheckSquare } from 'lucide-react';
import { useTwilio } from '@/hooks/useTwilio';

const NOTIFICATION_RULES = [
  {
    id: 'overdue_alert',
    icon: AlertTriangle,
    label: 'Alertas de mora',
    description: 'Notifica al asesor cuando un comprador tiene cuotas vencidas',
    color: 'text-destructive',
  },
  {
    id: 'deal_stale',
    icon: TrendingDown,
    label: 'Deals sin movimiento',
    description: 'Alerta cuando un deal lleva más de 7 días sin actividad',
    color: 'text-yellow-600',
  },
  {
    id: 'new_lead',
    icon: UserPlus,
    label: 'Nuevos leads asignados',
    description: 'Notifica al asesor cuando se le asigna un nuevo prospecto',
    color: 'text-blue-600',
  },
  {
    id: 'task_due',
    icon: CheckSquare,
    label: 'Tareas próximas a vencer',
    description: 'Recuerda al asesor tareas que vencen en las próximas 24 horas',
    color: 'text-primary',
  },
];

export function NotificationsTab() {
  const { isConfigured } = useTwilio();

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Configura tus credenciales de Twilio primero en la pestaña de Configuración.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Notificaciones Automáticas</h3>
        <p className="text-sm text-muted-foreground">
          Configura reglas para enviar alertas WhatsApp automáticas a tu equipo
        </p>
      </div>

      <div className="space-y-4">
        {NOTIFICATION_RULES.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-muted ${rule.color}`}>
                  <rule.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{rule.label}</p>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">Próximamente</Badge>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            Las notificaciones automáticas se enviarán al número WhatsApp registrado de cada asesor en el equipo.
            Esta funcionalidad estará disponible próximamente con activación por eventos del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
