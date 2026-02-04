import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();

  const handleToggle = async (key: string, value: boolean) => {
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast.success('Preferencias actualizadas');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  const handleHoursChange = async (hours: number) => {
    if (hours < 1 || hours > 168) return;
    try {
      await updatePreferences.mutateAsync({ reminder_hours: hours });
      toast.success('Preferencias actualizadas');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Preferencias de Notificaciones</CardTitle>
            <CardDescription>Configura qué notificaciones deseas recibir</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Recordatorios de tareas</Label>
              <p className="text-xs text-muted-foreground">
                Recibe alertas cuando tus tareas estén próximas a vencer
              </p>
            </div>
            <Switch
              checked={preferences.task_reminders}
              onCheckedChange={(checked) => handleToggle('task_reminders', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Actualizaciones de oportunidades</Label>
              <p className="text-xs text-muted-foreground">
                Notificaciones sobre cambios en el pipeline
              </p>
            </div>
            <Switch
              checked={preferences.deal_updates}
              onCheckedChange={(checked) => handleToggle('deal_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Nuevos contactos</Label>
              <p className="text-xs text-muted-foreground">
                Cuando se importen contactos automáticamente
              </p>
            </div>
            <Switch
              checked={preferences.new_contacts}
              onCheckedChange={(checked) => handleToggle('new_contacts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sincronización de emails</Label>
              <p className="text-xs text-muted-foreground">
                Estado de la sincronización con Gmail
              </p>
            </div>
            <Switch
              checked={preferences.email_sync}
              onCheckedChange={(checked) => handleToggle('email_sync', checked)}
            />
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-0.5">
              <Label>Recordar tareas con anticipación</Label>
              <p className="text-xs text-muted-foreground">
                Horas antes de la fecha de vencimiento
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={168}
                value={preferences.reminder_hours}
                onChange={(e) => handleHoursChange(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">horas</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
