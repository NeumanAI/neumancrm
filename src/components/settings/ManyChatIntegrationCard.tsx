import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { IntegrationSteps } from './IntegrationSteps';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { 
  MessageCircle, 
  Copy, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { Integration, ManyChatChannel, ManyChatConfig } from '@/types/integrations';

interface ManyChatIntegrationCardProps {
  integration: Integration | null;
  onDisable: () => Promise<void>;
}

export function ManyChatIntegrationCard({ integration, onDisable }: ManyChatIntegrationCardProps) {
  const { user } = useAuth();
  const { currentMember } = useTeam();
  const { 
    saveManyChatApiKey, 
    testManyChatConnection, 
    updateManyChatChannels,
    getManyChatConfig 
  } = useIntegrations();

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [channels, setChannels] = useState<ManyChatChannel[]>(['whatsapp', 'instagram', 'messenger']);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manychat-webhook`;
  const config = integration?.metadata as ManyChatConfig | undefined;

  useEffect(() => {
    if (config?.channels_enabled) {
      setChannels(config.channels_enabled);
    }
  }, [config?.channels_enabled]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Ingresa una API Key válida');
      return;
    }

    setIsSaving(true);
    try {
      await saveManyChatApiKey.mutateAsync(apiKey);
      toast.success('API Key guardada correctamente');
      setApiKey('');
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testManyChatConnection.mutateAsync();
      if (result.success) {
        toast.success(`Conexión exitosa: ${result.page_name}`);
      } else {
        toast.error('Error de conexión');
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleChannelToggle = async (channel: ManyChatChannel) => {
    const newChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];
    
    setChannels(newChannels);
    try {
      await updateManyChatChannels.mutateAsync(newChannels);
    } catch (error: any) {
      toast.error('Error al actualizar canales');
      setChannels(channels); // Revert
    }
  };

  const getStatusIcon = () => {
    if (!integration || !integration.is_active) return <XCircle className="h-5 w-5 text-muted-foreground" />;
    if (config?.test_status === 'error') return <AlertCircle className="h-5 w-5 text-destructive" />;
    if (config?.test_status === 'success') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (!integration || !integration.is_active) return 'No configurado';
    if (!config?.api_key_configured) return 'Pendiente';
    if (config?.test_status === 'error') return 'Error de conexión';
    if (config?.test_status === 'success') return 'Conectado';
    return 'API Key guardada';
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (!integration || !integration.is_active) return 'secondary';
    if (config?.test_status === 'error') return 'destructive';
    if (config?.test_status === 'success') return 'default';
    return 'outline';
  };

  const steps = [
    {
      number: 1,
      title: 'Obtén tu API Key de ManyChat',
      description: 'Ve a ManyChat → Settings → API y copia tu token.',
      completed: config?.api_key_configured,
      content: (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config?.api_key_configured ? '••••••••••••••••' : 'Pega tu API Key aquí'}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={handleSaveApiKey} disabled={isSaving || !apiKey.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
          <a 
            href="https://manychat.com/settings" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Ir a ManyChat Settings <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )
    },
    {
      number: 2,
      title: 'Configura el Webhook en ManyChat',
      description: 'Copia esta URL y pégala en una acción "External Request" de tu flujo.',
      content: (
        <div className="space-y-2">
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted p-2 rounded border overflow-x-auto">
              {webhookUrl}
            </code>
            <Button size="icon" variant="outline" onClick={() => copyToClipboard(webhookUrl, 'URL')}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Método: POST | Headers: x-api-key (opcional)</p>
        </div>
      )
    },
    {
      number: 3,
      title: 'Agrega los campos del CRM al flujo',
      description: 'Incluye estos valores en el body del External Request para vincular la conversación.',
      content: (
        <div className="space-y-3">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded">
                crm_user_id: "{user?.id || 'tu-user-id'}"
              </code>
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(user?.id || '', 'User ID')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded">
                crm_organization_id: "{currentMember?.organization_id || 'tu-org-id'}"
              </code>
              <Button 
                size="icon" 
                variant="outline" 
                onClick={() => copyToClipboard(currentMember?.organization_id || '', 'Org ID')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">ManyChat</CardTitle>
              <CardDescription>
                WhatsApp, Instagram y Messenger
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
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            Conecta ManyChat para recibir automáticamente conversaciones de WhatsApp, Instagram y Messenger en tu CRM.
          </AlertDescription>
        </Alert>

        <IntegrationSteps steps={steps} />

        {config?.api_key_configured && (
          <>
            <div className="flex gap-2">
              <Button 
                onClick={handleTestConnection} 
                disabled={isTesting}
                variant="outline"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Probando...
                  </>
                ) : (
                  'Probar conexión'
                )}
              </Button>
              {integration?.is_active && (
                <Button onClick={onDisable} variant="destructive">
                  Deshabilitar
                </Button>
              )}
            </div>

            {config.test_status === 'success' && (
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Canales habilitados</Label>
                <div className="flex gap-4">
                  {(['whatsapp', 'instagram', 'messenger'] as ManyChatChannel[]).map((channel) => (
                    <div key={channel} className="flex items-center gap-2">
                      <Checkbox
                        id={channel}
                        checked={channels.includes(channel)}
                        onCheckedChange={() => handleChannelToggle(channel)}
                      />
                      <Label htmlFor={channel} className="text-sm capitalize cursor-pointer">
                        {channel}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
          <p>✓ Recibe conversaciones de múltiples canales</p>
          <p>✓ Vincula automáticamente a contactos del CRM</p>
          <p>✓ Responde desde el módulo de Conversaciones</p>
        </div>
      </CardContent>
    </Card>
  );
}
