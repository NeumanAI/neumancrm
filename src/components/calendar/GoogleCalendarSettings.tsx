import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Unplug } from 'lucide-react';

interface GoogleCalendarSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncConfig: any;
}

export function GoogleCalendarSettings({ open, onOpenChange, syncConfig }: GoogleCalendarSettingsProps) {
  const queryClient = useQueryClient();
  const isConnected = syncConfig?.is_connected;

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error('Google Calendar no está configurado. Contacta al administrador.');
      return;
    }
    const redirectUri = `${window.location.origin}/auth/google-calendar-callback`;
    const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'disconnect' },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-sync'] });
      toast.success('Desconectado de Google Calendar');
    } catch {
      toast.error('Error al desconectar');
    }
  };

  const handleSyncDirectionChange = async (direction: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'update_settings', sync_direction: direction },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-sync'] });
      toast.success('Configuración actualizada');
    } catch {
      toast.error('Error al actualizar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Google Calendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Connection status */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Estado</p>
              <p className="text-sm text-muted-foreground">
                {isConnected ? syncConfig.google_email : 'No conectado'}
              </p>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>

          {isConnected ? (
            <>
              {/* Sync direction */}
              <div>
                <Label>Dirección de sincronización</Label>
                <Select value={syncConfig?.sync_direction || 'bidirectional'} onValueChange={handleSyncDirectionChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bidirectional">Bidireccional</SelectItem>
                    <SelectItem value="to_google">Solo CRM → Google</SelectItem>
                    <SelectItem value="from_google">Solo Google → CRM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Last sync */}
              {syncConfig?.last_sync_at && (
                <p className="text-xs text-muted-foreground">
                  Última sincronización: {new Date(syncConfig.last_sync_at).toLocaleString('es-ES')}
                </p>
              )}

              <Button variant="destructive" onClick={handleDisconnect} className="w-full">
                <Unplug className="h-4 w-4 mr-2" /> Desconectar
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" /> Conectar con Google Calendar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
