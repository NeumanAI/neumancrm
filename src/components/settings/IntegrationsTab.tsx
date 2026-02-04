import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIntegrations } from '@/hooks/useIntegrations';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageCircle, RefreshCw, AlertCircle, CheckCircle2, XCircle, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function IntegrationsTab() {
  const { integrations, getIntegration, enableIntegration, disableIntegration } = useIntegrations();
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const gmailIntegration = getIntegration('gmail');
  const whatsappIntegration = getIntegration('whatsapp');

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-whatsapp-conversation`;

  async function connectGmail() {
    setIsConnectingGmail(true);
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
      setIsConnectingGmail(false);
    }
  }

  async function disconnectGmail() {
    try {
      await disableIntegration.mutateAsync('gmail');
      toast.success('Gmail desconectado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
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

  async function enableWhatsApp() {
    setIsConnectingWhatsApp(true);
    try {
      await enableIntegration.mutateAsync({
        provider: 'whatsapp',
        metadata: { webhook_enabled: true }
      });
      toast.success('WhatsApp habilitado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsConnectingWhatsApp(false);
    }
  }

  async function disableWhatsApp() {
    try {
      await disableIntegration.mutateAsync('whatsapp');
      toast.success('WhatsApp deshabilitado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL copiada al portapapeles');
  }

  const getStatusIcon = (integration: any) => {
    if (!integration || !integration.is_active) return <XCircle className="h-5 w-5 text-muted-foreground" />;
    if (integration.sync_status === 'error') return <AlertCircle className="h-5 w-5 text-destructive" />;
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = (integration: any) => {
    if (!integration || !integration.is_active) return 'No conectado';
    if (integration.sync_status === 'error') return 'Error';
    if (integration.sync_status === 'syncing') return 'Sincronizando...';
    return 'Conectado';
  };

  const getStatusVariant = (integration: any): "default" | "secondary" | "destructive" | "outline" => {
    if (!integration || !integration.is_active) return 'secondary';
    if (integration.sync_status === 'error') return 'destructive';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Gmail Integration */}
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
              {getStatusIcon(gmailIntegration)}
              <Badge variant={getStatusVariant(gmailIntegration)}>
                {getStatusText(gmailIntegration)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {gmailIntegration?.is_active ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cuenta:</span>
                  <span className="ml-2 font-medium">{gmailIntegration.metadata?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Última sync:</span>
                  <span className="ml-2">
                    {gmailIntegration.last_synced_at 
                      ? new Date(gmailIntegration.last_synced_at).toLocaleString('es-ES')
                      : 'Nunca'
                    }
                  </span>
                </div>
              </div>

              {gmailIntegration.error_message && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{gmailIntegration.error_message}</AlertDescription>
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
                <Button onClick={disconnectGmail} variant="destructive">
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

              <Button onClick={connectGmail} disabled={isConnectingGmail} className="gradient-primary">
                {isConnectingGmail ? (
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

      {/* WhatsApp Integration */}
      <Card className="border-0 shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">WhatsApp</CardTitle>
                <CardDescription>
                  Captura de conversaciones desde tu plataforma
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(whatsappIntegration)}
              <Badge variant={getStatusVariant(whatsappIntegration)}>
                {getStatusText(whatsappIntegration)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {whatsappIntegration?.is_active ? (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  El webhook está activo. Las conversaciones de WhatsApp desde tu plataforma se sincronizarán automáticamente.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Webhook URL:</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-background p-2 rounded border overflow-x-auto">
                    {webhookUrl}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Método: POST | Header: x-api-key
                </p>
              </div>

              <Button onClick={disableWhatsApp} variant="destructive">
                Deshabilitar
              </Button>
            </>
          ) : (
            <>
              <Alert>
                <AlertDescription>
                  Al habilitar WhatsApp, tu plataforma enviará automáticamente:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Conversaciones de clientes por WhatsApp</li>
                    <li>Datos del contacto (nombre, número, empresa)</li>
                    <li>El CRM extraerá información automáticamente</li>
                    <li>Creará contactos, empresas y tareas según sea necesario</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button onClick={enableWhatsApp} disabled={isConnectingWhatsApp} className="gradient-primary">
                {isConnectingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Habilitando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Habilitar WhatsApp
                  </>
                )}
              </Button>
            </>
          )}

          <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
            <p>✓ Recibe conversaciones vía webhook</p>
            <p>✓ Procesa con IA para extraer datos relevantes</p>
            <p>✓ Crea contactos y tareas automáticamente</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
