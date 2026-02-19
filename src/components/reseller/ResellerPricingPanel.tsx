import { useState } from 'react';
import { useResellerAdmin, SubClient } from '@/hooks/useResellerAdmin';
import {
  usePlanCatalog,
  useActivateSubscription,
  useSetCustomPricing,
  useOrgUsage,
  useOrgPricing,
  PlanCatalog,
} from '@/hooks/usePricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Star, Users, Zap, DollarSign, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ---- Per-client usage mini-bar ----
function ClientUsage({ orgId }: { orgId: string }) {
  const { data: usage } = useOrgUsage(orgId);
  if (!usage) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = usage.ai_conversations_limit > 0
    ? Math.round((usage.ai_conversations_used / usage.ai_conversations_limit) * 100)
    : 0;
  return (
    <div className="space-y-1 min-w-[120px]">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>IA</span>
        <span>{usage.ai_conversations_used}/{usage.ai_conversations_limit === 0 ? 'Sin IA' : usage.ai_conversations_limit}</span>
      </div>
      {usage.ai_conversations_limit > 0 && (
        <Progress value={pct} className="h-1" />
      )}
    </div>
  );
}

// ---- Manage Client Dialog ----
function ManageClientDialog({
  client,
  plans,
  open,
  onOpenChange,
}: {
  client: SubClient | null;
  plans: PlanCatalog[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: currentPricing } = useOrgPricing(client?.id);
  const activate = useActivateSubscription();
  const setCustom = useSetCustomPricing();

  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<'trial' | 'active' | 'suspended'>('active');
  const [customPrice, setCustomPrice] = useState('');
  const [customUsers, setCustomUsers] = useState('');
  const [customAI, setCustomAI] = useState('');
  const [notes, setNotes] = useState('');

  if (!client) return null;

  const handleSave = async () => {
    if (planId) {
      await activate.mutateAsync({
        organizationId: client.id,
        planId,
        status,
        notes,
      });
    }
    if (customPrice || customUsers || customAI) {
      await setCustom.mutateAsync({
        organizationId: client.id,
        planId: planId || undefined,
        customPriceUsd: customPrice ? parseFloat(customPrice) : undefined,
        customMaxUsers: customUsers ? parseInt(customUsers) : undefined,
        customMaxAiConversations: customAI ? parseInt(customAI) : undefined,
        notes,
      });
    }
    onOpenChange(false);
  };

  const isSaving = activate.isPending || setCustom.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar: {client.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="font-semibold">Plan Base</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar plan del catálogo" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ${p.price_usd}/mes · {p.max_users} usuarios
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado de suscripción</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Pricing (Markup) */}
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Precio y Límites Personalizados <span className="text-muted-foreground font-normal">(opcional)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Sobreescribe los límites del catálogo. Útil para markup de precio o límites especiales.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tu precio (USD/mes)</Label>
                <Input
                  type="number"
                  placeholder={currentPricing?.custom_price_usd?.toString() || 'Ej: 150'}
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Máx. usuarios</Label>
                <Input
                  type="number"
                  placeholder={currentPricing?.custom_max_users?.toString() || 'Del plan'}
                  value={customUsers}
                  onChange={e => setCustomUsers(e.target.value)}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Conversaciones IA/mes</Label>
                <Input
                  type="number"
                  placeholder={currentPricing?.custom_max_ai_conversations?.toString() || 'Del plan'}
                  value={customAI}
                  onChange={e => setCustomAI(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notas internas (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Plan anual con descuento" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving || (!planId && !customPrice && !customUsers && !customAI)}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResellerPricingPanel() {
  const { subClients, isLoading } = useResellerAdmin();
  const { data: plans = [] } = usePlanCatalog();
  const [managing, setManaging] = useState<SubClient | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (subClients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>No tienes clientes. Crea un cliente desde la pestaña "Clientes".</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Asigna planes y precios personalizados a tus clientes. El markup es libre.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Consumo IA</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.admin_email || 'Sin admin'}</p>
                </div>
              </TableCell>
              <TableCell>
                {client.is_approved ? (
                  <Badge className="bg-green-600 text-white">Activo</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pendiente</Badge>
                )}
              </TableCell>
              <TableCell>
                <ClientUsage orgId={client.id} />
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => setManaging(client)}>
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  Gestionar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ManageClientDialog
        client={managing}
        plans={plans}
        open={!!managing}
        onOpenChange={(v) => !v && setManaging(null)}
      />
    </div>
  );
}
