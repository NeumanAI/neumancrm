import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useTwilio } from '@/hooks/useTwilio';

export function TwilioSettingsTab() {
  const { isConfigured, whatsappNumber, configureTwilio } = useTwilio();
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phone, setPhone] = useState('');
  const [showToken, setShowToken] = useState(false);

  const handleSave = () => {
    if (!accountSid || !authToken || !phone) return;
    configureTwilio.mutate({
      account_sid: accountSid,
      auth_token: authToken,
      whatsapp_number: phone,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Configuración de Twilio</CardTitle>
              <CardDescription>
                Conecta tu cuenta de Twilio para enviar mensajes de WhatsApp
              </CardDescription>
            </div>
            {isConfigured && (
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                <CheckCircle className="h-3 w-3 mr-1" /> Conectado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Account SID</label>
            <Input
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Auth Token</label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder="Tu auth token de Twilio"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Número WhatsApp</label>
            <Input
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Número registrado en Twilio con formato internacional (ej: +573001234567)
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={!accountSid || !authToken || !phone || configureTwilio.isPending}
            className="w-full"
          >
            {configureTwilio.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isConfigured ? 'Actualizar credenciales' : 'Guardar y conectar'}
          </Button>

          {isConfigured && whatsappNumber && (
            <p className="text-sm text-muted-foreground text-center">
              Número activo: <span className="font-medium text-foreground">{whatsappNumber}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">¿Cómo obtener las credenciales?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Crea una cuenta en <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">twilio.com</a></li>
            <li>Ve a la consola y copia tu <strong>Account SID</strong> y <strong>Auth Token</strong></li>
            <li>Activa el sandbox de WhatsApp en <strong>Messaging → Try it out → WhatsApp</strong></li>
            <li>Copia el número del sandbox (o tu número aprobado)</li>
            <li>Pega las credenciales aquí y guarda</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
