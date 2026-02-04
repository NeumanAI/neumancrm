import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { 
  Globe, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Palette,
  Settings,
  Code
} from 'lucide-react';
import { toast } from 'sonner';
import { Integration, WebchatConfig } from '@/types/integrations';

interface WebchatIntegrationCardProps {
  integration: Integration | null;
}

export function WebchatIntegrationCard({ integration }: WebchatIntegrationCardProps) {
  const { user } = useAuth();
  const { currentMember } = useTeam();
  const { updateWebchatConfig, enableIntegration } = useIntegrations();

  const [isSaving, setIsSaving] = useState(false);
  const config = integration?.metadata as WebchatConfig | undefined;

  const [widgetEnabled, setWidgetEnabled] = useState(config?.widget_enabled ?? false);
  const [n8nUrl, setN8nUrl] = useState(config?.n8n_webhook_url ?? '');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(
    config?.widget_config?.position ?? 'bottom-right'
  );
  const [primaryColor, setPrimaryColor] = useState(config?.widget_config?.primary_color ?? '#3B82F6');
  const [welcomeMessage, setWelcomeMessage] = useState(
    config?.widget_config?.welcome_message ?? '¡Hola! ¿En qué podemos ayudarte?'
  );

  useEffect(() => {
    if (config) {
      setWidgetEnabled(config.widget_enabled ?? false);
      setN8nUrl(config.n8n_webhook_url ?? '');
      setPosition(config.widget_config?.position ?? 'bottom-right');
      setPrimaryColor(config.widget_config?.primary_color ?? '#3B82F6');
      setWelcomeMessage(config.widget_config?.welcome_message ?? '¡Hola! ¿En qué podemos ayudarte?');
    }
  }, [config]);

  const handleToggleWidget = async () => {
    setIsSaving(true);
    try {
      if (!integration) {
        await enableIntegration.mutateAsync({
          provider: 'webchat',
          metadata: {
            widget_enabled: true,
            widget_config: {
              position: 'bottom-right',
              primary_color: '#3B82F6',
              welcome_message: '¡Hola! ¿En qué podemos ayudarte?'
            }
          }
        });
      } else {
        await updateWebchatConfig.mutateAsync({ widget_enabled: !widgetEnabled });
      }
      setWidgetEnabled(!widgetEnabled);
      toast.success(widgetEnabled ? 'Widget desactivado' : 'Widget activado');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateWebchatConfig.mutateAsync({
        widget_enabled: widgetEnabled,
        n8n_webhook_url: n8nUrl || undefined,
        widget_config: {
          position,
          primary_color: primaryColor,
          welcome_message: welcomeMessage
        }
      });
      toast.success('Configuración guardada');
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getEmbedCode = () => {
    const previewUrl = import.meta.env.VITE_SUPABASE_URL?.replace('supabase.co', 'lovable.app') || 'https://tu-proyecto.lovable.app';
    return `<script>
(function() {
  var script = document.createElement('script');
  script.src = '${previewUrl}/webchat-widget.js';
  script.async = true;
  script.dataset.crmUserId = '${user?.id || 'USER_ID'}';
  script.dataset.crmOrgId = '${currentMember?.organization_id || 'ORG_ID'}';
  script.dataset.primaryColor = '${primaryColor}';
  script.dataset.position = '${position}';
  script.dataset.welcomeMessage = '${welcomeMessage}';
  document.body.appendChild(script);
})();
</script>`;
  };

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(getEmbedCode());
    toast.success('Código copiado al portapapeles');
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Webchat</CardTitle>
              <CardDescription>
                Widget de chat para tu sitio web
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {widgetEnabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <Badge variant={widgetEnabled ? 'default' : 'secondary'}>
              {widgetEnabled ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="widget-toggle" className="text-sm font-medium">
              Habilitar widget de chat
            </Label>
            <p className="text-xs text-muted-foreground">
              Permite a los visitantes de tu sitio iniciar conversaciones
            </p>
          </div>
          <Switch
            id="widget-toggle"
            checked={widgetEnabled}
            onCheckedChange={handleToggleWidget}
            disabled={isSaving}
          />
        </div>

        {widgetEnabled && (
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Apariencia
              </TabsTrigger>
              <TabsTrigger value="embed" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Insertar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="n8n-url">URL de n8n (opcional)</Label>
                <Input
                  id="n8n-url"
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  placeholder="https://tu-n8n.com/webhook/xxx"
                />
                <p className="text-xs text-muted-foreground">
                  Configura un webhook de n8n para respuestas automáticas con IA
                </p>
              </div>
              
              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar configuración
              </Button>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Posición</Label>
                  <Select value={position} onValueChange={(v) => setPosition(v as typeof position)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Abajo a la derecha</SelectItem>
                      <SelectItem value="bottom-left">Abajo a la izquierda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color principal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome">Mensaje de bienvenida</Label>
                <Input
                  id="welcome"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                />
              </div>

              <Button onClick={handleSaveConfig} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Guardar apariencia
              </Button>

              {/* Preview */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-2 block">Vista previa</Label>
                <div className="relative bg-muted rounded-lg p-4 h-32">
                  <div 
                    className={`absolute bottom-4 ${position === 'bottom-right' ? 'right-4' : 'left-4'}`}
                  >
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4 pt-4">
              <Alert>
                <AlertDescription>
                  Copia este código y pégalo antes del cierre <code>&lt;/body&gt;</code> de tu sitio web.
                </AlertDescription>
              </Alert>

              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {getEmbedCode()}
                </pre>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="absolute top-2 right-2"
                  onClick={copyEmbedCode}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <p>✓ Widget personalizable para tu marca</p>
          <p>✓ Captura leads directamente en el CRM</p>
          <p>✓ Integración opcional con n8n para IA</p>
        </div>
      </CardContent>
    </Card>
  );
}
