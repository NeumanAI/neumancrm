import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Users, Copy, ExternalLink, Ban, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { usePortalSettings, usePortalUsers } from '@/hooks/useClientPortal';
import { useTeam } from '@/hooks/useTeam';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

export function PortalSettingsPanel() {
  const { organization } = useTeam();
  const { isPortalEnabled, togglePortal } = usePortalSettings();
  const { portalUsers, isLoading, toggleBlock } = usePortalUsers();
  const [blockingId, setBlockingId] = useState<string | null>(null);

  const portalUrl = organization?.slug
    ? `${window.location.origin}/portal/login?org=${organization.slug}`
    : null;

  const copyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Link del portal copiado');
  };

  const handleToggleBlock = async (id: string, currentlyBlocked: boolean) => {
    setBlockingId(id);
    await toggleBlock.mutateAsync({ id, block: !currentlyBlocked });
    setBlockingId(null);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Portal de Clientes
          </CardTitle>
          <CardDescription>
            Activa el portal para que todos tus clientes puedan ver su cartera, citas y documentos desde una URL personalizada con tu marca.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {isPortalEnabled ? (
                  <Badge variant="default" className="mr-2">Portal activo</Badge>
                ) : (
                  <Badge variant="secondary" className="mr-2">Portal desactivado</Badge>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {isPortalEnabled ? 'Tus clientes pueden acceder al portal ahora' : 'Activa para dar acceso a tus clientes'}
              </p>
            </div>
            <Switch
              checked={isPortalEnabled}
              onCheckedChange={(checked) => togglePortal.mutate(checked)}
            />
          </div>

          {isPortalEnabled && portalUrl && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">URL del portal para compartir con tus clientes:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-background px-3 py-2 rounded border truncate">
                  {portalUrl}
                </code>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(portalUrl, '_blank')}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Comparte este link por WhatsApp, email o en tu sitio web. Tus clientes ingresan con el email que tienen registrado en el CRM.
              </p>
            </div>
          )}

          {!isPortalEnabled && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 text-yellow-800 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Para que tus clientes puedan acceder, asegúrate de que tengan su email registrado en su ficha de contacto en el CRM.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {isPortalEnabled && (
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Clientes con acceso al portal
            </CardTitle>
            <CardDescription>
              Clientes que ya se han registrado. Puedes bloquear el acceso individualmente si lo necesitas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : portalUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Ningún cliente se ha registrado aún. Comparte el link del portal.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead>Registrado</TableHead>
                    <TableHead className="text-right">Acceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portalUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{u.contact_name}</p>
                          <p className="text-xs text-muted-foreground">{u.contact_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.is_blocked ? (
                          <Badge variant="destructive">Bloqueado</Badge>
                        ) : (
                          <Badge variant="default">Activo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.last_login_at
                          ? format(new Date(u.last_login_at), 'd MMM yyyy, h:mm a', { locale: es })
                          : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(u.registered_at), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={u.is_blocked ? 'outline' : 'destructive'}
                          size="sm"
                          disabled={blockingId === u.id}
                          onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                        >
                          {blockingId === u.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : u.is_blocked ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Restaurar</>
                          ) : (
                            <><Ban className="h-3 w-3 mr-1" />Bloquear</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
