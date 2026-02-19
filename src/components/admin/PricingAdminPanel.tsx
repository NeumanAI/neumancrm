import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useAllPlans,
  useAllSubscriptions,
  useActivateSubscription,
  useUpdatePlan,
  PlanCatalog,
} from '@/hooks/usePricing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Star, Users, Zap, DollarSign, Plus, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

// ---- Activate Subscription Dialog ----
function ActivateDialog({
  open,
  onOpenChange,
  plans,
  orgs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plans: PlanCatalog[];
  orgs: { id: string; name: string }[];
}) {
  const [orgId, setOrgId] = useState('');
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<'trial' | 'active'>('active');
  const [notes, setNotes] = useState('');
  const activate = useActivateSubscription();

  const handleSave = async () => {
    if (!orgId || !planId) return toast.error('Selecciona organización y plan');
    await activate.mutateAsync({ organizationId: orgId, planId, status, notes });
    onOpenChange(false);
    setOrgId(''); setPlanId(''); setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Activar Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Organización</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar organización" /></SelectTrigger>
              <SelectContent>
                {orgs.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ${p.price_usd}/mes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Pago recibido vía transferencia" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={activate.isPending}>
            {activate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Edit Plan Dialog ----
function EditPlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: PlanCatalog | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<Partial<PlanCatalog>>({});
  const update = useUpdatePlan();

  const current = { ...(plan || {}), ...form } as PlanCatalog;

  const handleSave = async () => {
    if (!plan) return;
    await update.mutateAsync({ id: plan.id, ...form });
    onOpenChange(false);
    setForm({});
  };

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Plan: {plan.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Precio (USD/mes)</Label>
              <Input
                type="number"
                value={current.price_usd}
                onChange={e => setForm(f => ({ ...f, price_usd: parseFloat(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. usuarios</Label>
              <Input
                type="number"
                value={current.max_users}
                onChange={e => setForm(f => ({ ...f, max_users: parseInt(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Conv. IA/mes</Label>
              <Input
                type="number"
                value={current.max_ai_conversations}
                onChange={e => setForm(f => ({ ...f, max_ai_conversations: parseInt(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. contactos</Label>
              <Input
                type="number"
                value={current.max_contacts}
                onChange={e => setForm(f => ({ ...f, max_contacts: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    trial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-muted text-muted-foreground',
    expired: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = {
    trial: 'Trial', active: 'Activo', suspended: 'Suspendido',
    cancelled: 'Cancelado', expired: 'Expirado',
  };
  return (
    <Badge variant="secondary" className={map[status] || ''}>
      {labels[status] || status}
    </Badge>
  );
}

export function PricingAdminPanel() {
  const { data: plans = [], isLoading: plansLoading } = useAllPlans();
  const { data: subscriptions = [], isLoading: subsLoading } = useAllSubscriptions();
  const [activateOpen, setActivateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<PlanCatalog | null>(null);

  // Fetch orgs for dropdown
  const { data: orgs = [] } = useQuery({
    queryKey: ['orgs_for_pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('is_approved', true)
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  if (plansLoading || subsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo de Planes</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {subscriptions.length} suscripciones activas
            </p>
            <Button size="sm" onClick={() => setActivateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Activar Plan
            </Button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No hay suscripciones. Activa un plan para una organización.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.org?.name || sub.organization_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {sub.plan?.is_featured && <Star className="h-3 w-3 text-amber-500 fill-amber-400" />}
                        {sub.plan?.name}
                        <span className="text-xs text-muted-foreground ml-1">${sub.plan?.price_usd}/mes</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={sub.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(sub.created_at), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => setActivateOpen(true)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Catalog Tab */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <Card key={plan.id} className={`border relative ${plan.is_featured ? 'border-primary shadow-md' : ''}`}>
                {plan.is_featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">{plan.plan_type === 'bundle' ? 'Bundle' : 'Individual'}</CardDescription>
                  <div className="text-2xl font-bold text-primary">${plan.price_usd}<span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {plan.max_users} usuarios
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {plan.max_ai_conversations === 0 ? 'Sin IA' : `${plan.max_ai_conversations.toLocaleString()} conv.`}
                    </div>
                  </div>
                  <Button
                    size="sm" variant="outline" className="w-full"
                    onClick={() => setEditPlan(plan)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Editar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ActivateDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        plans={plans}
        orgs={orgs}
      />
      <EditPlanDialog
        plan={editPlan}
        open={!!editPlan}
        onOpenChange={(v) => !v && setEditPlan(null)}
      />
    </div>
  );
}
