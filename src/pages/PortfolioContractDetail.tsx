import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Wallet, Phone, Mail, Calendar, DollarSign, Plus, CreditCard } from 'lucide-react';
import { usePortfolioContract, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_COLORS } from '@/hooks/usePortfolioContracts';
import { usePortfolioSchedule, INSTALLMENT_STATUS_LABELS, INSTALLMENT_STATUS_COLORS, PortfolioInstallment } from '@/hooks/usePortfolioSchedule';
import { usePortfolioPayments, PAYMENT_METHOD_LABELS } from '@/hooks/usePortfolioPayments';
import { usePortfolioActions, ACTION_TYPE_LABELS, ACTION_TYPE_ICONS } from '@/hooks/usePortfolioActions';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

export default function PortfolioContractDetail() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: contract, isLoading } = usePortfolioContract(contractId);
  const { installments, metrics, registerPayment } = usePortfolioSchedule(contractId);
  const { payments } = usePortfolioPayments(contractId);
  const { actions, addAction } = usePortfolioActions(contractId);

  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payInstallment, setPayInstallment] = useState<PortfolioInstallment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('transferencia');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('call');
  const [actionResult, setActionResult] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionPromiseDate, setActionPromiseDate] = useState('');
  const [actionPromiseAmount, setActionPromiseAmount] = useState('');

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-96" /></div>;
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Contrato no encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/cartera')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Volver a Cartera
        </Button>
      </div>
    );
  }

  const contact = contract.contacts;
  const progressPercent = installments.length > 0
    ? Math.round((metrics.paidCount / installments.length) * 100) : 0;

  const openPayDialog = (inst: PortfolioInstallment) => {
    setPayInstallment(inst);
    setPayAmount(String(inst.total_amount - inst.paid_amount));
    setPayMethod('transferencia');
    setPayRef('');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes('');
    setPayDialogOpen(true);
  };

  const handlePay = () => {
    if (!payInstallment || !payAmount) return;
    registerPayment.mutate({
      installmentId: payInstallment.id,
      amount: parseFloat(payAmount),
      paymentMethod: payMethod,
      bankReference: payRef,
      paymentDate: payDate,
      notes: payNotes,
      contractId: contract.id,
      organizationId: contract.organization_id,
      recordedBy: user?.id || '',
    });
    setPayDialogOpen(false);
  };

  const handleAddAction = () => {
    addAction.mutate({
      contract_id: contract.id,
      organization_id: contract.organization_id,
      action_type: actionType,
      result: actionResult || null,
      notes: actionNotes || null,
      promise_date: actionPromiseDate || null,
      promise_amount: actionPromiseAmount ? parseFloat(actionPromiseAmount) : null,
      performed_by: user?.id || null,
      performed_at: new Date().toISOString(),
    });
    setActionDialogOpen(false);
    setActionResult('');
    setActionNotes('');
    setActionPromiseDate('');
    setActionPromiseAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cartera')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Wallet className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{contact?.first_name} {contact?.last_name}</h1>
            <Badge variant="outline" className={cn('text-xs', CONTRACT_STATUS_COLORS[contract.status])}>
              {CONTRACT_STATUS_LABELS[contract.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
            {contact?.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{contact.email}</span>}
            {(contact?.phone || contact?.mobile) && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{contact.mobile || contact.phone}</span>}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-0.5 flex-wrap">
            <span>Contrato N° {contract.contract_number}</span>
            {contract.fiducia_number && <span>Fiducia: {contract.fiducia_number}</span>}
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(contract.signing_date).toLocaleDateString('es-CO')}</span>
            <span>{contract.real_estate_projects?.name}</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className="text-xl font-bold">{fmt(metrics.totalPending)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Total pagado</p>
          <p className="text-xl font-bold text-green-600">{fmt(metrics.totalPaid)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">En mora</p>
          <p className={cn("text-xl font-bold", metrics.overdueAmount > 0 ? "text-red-600" : "text-muted-foreground")}>
            {fmt(metrics.overdueAmount)}
          </p>
          {metrics.overdueInstallments > 0 && <p className="text-xs text-red-500">{metrics.overdueInstallments} cuotas</p>}
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Avance</p>
          <p className="text-xl font-bold">{progressPercent}%</p>
          <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
        </CardContent></Card>
      </div>

      {/* Next payment card */}
      {metrics.nextPending && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">Próxima cuota: #{metrics.nextPending.installment_number}</p>
              <p className="text-xs text-muted-foreground">Vence: {new Date(metrics.nextPending.due_date).toLocaleDateString('es-CO')}</p>
              <p className="font-bold text-lg mt-1">{fmt(metrics.nextPending.total_amount - metrics.nextPending.paid_amount)}</p>
            </div>
            <Button onClick={() => openPayDialog(metrics.nextPending!)}>
              <CreditCard className="h-4 w-4 mr-2" />Registrar pago
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Plan de pagos ({installments.length})</TabsTrigger>
          <TabsTrigger value="payments">Pagos ({payments.length})</TabsTrigger>
          <TabsTrigger value="actions">Gestión de cobro ({actions.length})</TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">N°</TableHead>
                      <TableHead>Vencimiento</TableHead>
                      <TableHead className="text-right">Capital</TableHead>
                      <TableHead className="text-right">Intereses</TableHead>
                      <TableHead className="text-right">Cuota</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {installments.map(inst => (
                      <TableRow key={inst.id} className={cn(inst.status === 'overdue' && 'bg-red-50 dark:bg-red-950/20')}>
                        <TableCell className="font-mono text-sm">{inst.installment_number}</TableCell>
                        <TableCell className="text-sm">{new Date(inst.due_date).toLocaleDateString('es-CO')}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(inst.principal_amount)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(inst.interest_amount)}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{fmt(inst.total_amount)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(inst.remaining_balance)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', INSTALLMENT_STATUS_COLORS[inst.status])}>
                            {INSTALLMENT_STATUS_LABELS[inst.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {['pending', 'overdue', 'partial'].includes(inst.status) && (
                            <Button size="sm" variant="outline" onClick={() => openPayDialog(inst)}>
                              <DollarSign className="h-3 w-3 mr-1" />Pagar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {payments.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay pagos registrados</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{new Date(p.payment_date).toLocaleDateString('es-CO')}</TableCell>
                          <TableCell className="text-right font-medium text-sm">{fmt(p.amount)}</TableCell>
                          <TableCell className="text-sm">{PAYMENT_METHOD_LABELS[p.payment_method] || p.payment_method}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.bank_reference || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.notes || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="px-4 py-3 border-t text-right">
                    <span className="text-sm text-muted-foreground mr-2">Total pagado:</span>
                    <span className="font-bold">{fmt(payments.reduce((s, p) => s + p.amount, 0))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collection Actions Tab */}
        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle>Gestiones de cobro</CardTitle>
              <Button size="sm" onClick={() => setActionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Agregar gestión
              </Button>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No hay gestiones registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map(a => (
                    <div key={a.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {ACTION_TYPE_ICONS[a.action_type] || '📝'} {ACTION_TYPE_LABELS[a.action_type] || a.action_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.performed_at).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                      {a.result && <p className="text-sm"><span className="font-medium">Resultado:</span> {a.result}</p>}
                      {a.notes && <p className="text-sm text-muted-foreground">{a.notes}</p>}
                      {a.promise_date && (
                        <p className="text-sm text-amber-600">
                          📅 Promesa de pago: {new Date(a.promise_date).toLocaleDateString('es-CO')}
                          {a.promise_amount ? ` por ${fmt(a.promise_amount)}` : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Register Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago - Cuota #{payInstallment?.installment_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto</Label>
              <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia bancaria</Label>
              <Input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label>Fecha de pago</Label>
              <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handlePay} disabled={registerPayment.isPending}>
                {registerPayment.isPending ? 'Registrando...' : 'Registrar pago'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar gestión de cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de gestión</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resultado</Label>
              <Input value={actionResult} onChange={e => setActionResult(e.target.value)} placeholder="Ej: Se comprometió a pagar el viernes" />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={actionNotes} onChange={e => setActionNotes(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha promesa de pago</Label>
                <Input type="date" value={actionPromiseDate} onChange={e => setActionPromiseDate(e.target.value)} />
              </div>
              <div>
                <Label>Monto prometido</Label>
                <Input type="number" value={actionPromiseAmount} onChange={e => setActionPromiseAmount(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddAction} disabled={addAction.isPending}>
                {addAction.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
