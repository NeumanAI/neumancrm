import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Mail, RefreshCw, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Integration } from '@/types/integrations';

interface GmailIntegrationCardProps {
  integration: Integration | null;
  onDisconnect: () => Promise<void>;
}

export function GmailIntegrationCard({ integration, onDisconnect }: GmailIntegrationCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  async function connectGmail() {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Debes estar autenticado');
        return;
      }

      const { data, error } = await supabase.functions.invoke('gmail-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (error: any) {
      toast.error('Error al conectar Gmail: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  }

  async function syncGmail() {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('process-emails', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      toast.success('Sincronización iniciada en segundo plano');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  }

  const getStatusIcon = () => {
    if (!integration || !integration.is_active) return <XCircle className="h-5 w-5 text-muted-foreground" />;
    if (integration.sync_status === 'error') return <AlertCircle className="h-5 w-5 text-destructive" />;
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (!integration || !integration.is_active) return 'No conectado';
    if (integration.sync_status === 'error') return 'Error';
    if (integration.sync_status === 'syncing') return 'Sincronizando...';
    return 'Conectado';
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!integration || !integration.is_active) return 'secondary';
    if (integration.sync_status === 'error') return 'destructive';
    return 'default';
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
              <Mail className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Gmail</CardTitle>
              <CardDescription>
                Captura automática de emails cada 5 minutos
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getStatusVariant()}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {integration?.is_active ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cuenta:</span>
                <span className="ml-2 font-medium">{(integration.metadata as any)?.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Última sync:</span>
                <span className="ml-2">
                  {integration.last_synced_at 
                    ? new Date(integration.last_synced_at).toLocaleString('es-ES')
                    : 'Nunca'
                  }
                </span>
              </div>
            </div>

            {integration.error_message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{integration.error_message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={syncGmail} disabled={isSyncing} variant="outline">
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar ahora
              </Button>
              <Button onClick={onDisconnect} variant="destructive">
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert>
              <AlertDescription>
                Al conectar Gmail, el CRM leerá automáticamente tus emails y:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Extraerá contactos y empresas mencionadas</li>
                  <li>Detectará oportunidades de venta</li>
                  <li>Identificará tareas y compromisos</li>
                  <li>Creará entradas en el timeline automáticamente</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button onClick={connectGmail} disabled={isConnecting} className="gradient-primary">
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Conectar Gmail
                </>
              )}
            </Button>
          </>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <p>✓ Conexión segura vía OAuth</p>
          <p>✓ Solo lectura de emails (nunca modifica ni elimina)</p>
          <p>✓ Puedes desconectar en cualquier momento</p>
        </div>
      </CardContent>
    </Card>
  );
}
