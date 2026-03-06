import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, Loader2, Users, Trash2 } from 'lucide-react';
import { useTwilio } from '@/hooks/useTwilio';
import { useContacts } from '@/hooks/useContacts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  sending: 'Enviando',
  completed: 'Completada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
};

export function BroadcastTab() {
  const { campaigns, isLoadingCampaigns, isConfigured, createCampaign, launchCampaign, deleteCampaign } = useTwilio();
  const { contacts = [] } = useContacts();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  const contactsWithPhone = contacts.filter(
    (c: any) => c.whatsapp_number || c.phone || c.mobile
  );

  const getPhone = (c: any) => c.whatsapp_number || c.mobile || c.phone || '';

  const filteredContacts = targetType === 'all'
    ? contactsWithPhone
    : contactsWithPhone.filter((c: any) => c.contact_type === targetType);

  const handleCreate = async () => {
    const ids = selectedContacts.length > 0 ? selectedContacts : filteredContacts.map((c: any) => c.id);
    const phoneMap: Record<string, string> = {};
    for (const id of ids) {
      const contact = contacts.find((c: any) => c.id === id);
      if (contact) phoneMap[id] = getPhone(contact);
    }

    await createCampaign.mutateAsync({
      name,
      message_template: message,
      target_type: targetType,
      contact_ids: ids,
      phone_numbers: phoneMap,
    });
    setOpen(false);
    setName('');
    setMessage('');
    setSelectedContacts([]);
  };

  const handleLaunch = (campaignId: string) => {
    launchCampaign.mutate(campaignId);
  };

  const toggleContact = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Campañas Masivas</h3>
          <p className="text-sm text-muted-foreground">Envía mensajes WhatsApp a múltiples contactos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nueva Campaña</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Campaña</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Recordatorio de pago marzo" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Audiencia</label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los contactos con teléfono</SelectItem>
                    <SelectItem value="prospecto">Solo prospectos</SelectItem>
                    <SelectItem value="comprador">Solo compradores</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{filteredContacts.length} contactos disponibles</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mensaje</label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{message.length}/1600 caracteres</p>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Selección manual (opcional)</p>
                {filteredContacts.slice(0, 50).map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedContacts.includes(c.id)}
                      onCheckedChange={() => toggleContact(c.id)}
                    />
                    <span>{c.first_name} {c.last_name}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{getPhone(c)}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={handleCreate}
                disabled={!name || !message || createCampaign.isPending}
                className="w-full"
              >
                {createCampaign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Campaña
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Campañas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingCampaigns ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No hay campañas aún</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Enviados</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[c.status] || ''} variant="secondary">
                        {STATUS_LABELS[c.status] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {c.total_recipients}
                      </span>
                    </TableCell>
                    <TableCell>{c.sent_count}/{c.total_recipients}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      {c.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLaunch(c.id)}
                          disabled={launchCampaign.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" /> Lanzar
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar campaña?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará "{c.name}" y todos sus mensajes asociados. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCampaign.mutate(c.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
