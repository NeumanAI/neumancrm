import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { usePortfolioContracts, generatePaymentSchedule } from '@/hooks/usePortfolioContracts';
import { useRealEstateUnitTypes } from '@/hooks/useRealEstateUnitTypes';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';

const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  contactId: string;
  contactName: string;
}

export function CreateContractDialog({ open, onOpenChange, projectId, contactId, contactName }: Props) {
  const { user } = useAuth();
  const { organization } = useTeam();
  const { createContract } = usePortfolioContracts();
  const { unitTypes } = useRealEstateUnitTypes(projectId);

  const [step, setStep] = useState(1);

  // Step 1
  const [contractNumber, setContractNumber] = useState('');
  const [fiduciaNumber, setFiduciaNumber] = useState('');
  const [unitId, setUnitId] = useState('');
  const [signingDate, setSigningDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Step 2
  const [totalPrice, setTotalPrice] = useState('');
  const [separationAmount, setSeparationAmount] = useState('0');
  const [downPayment, setDownPayment] = useState('0');
  const [subsidyAmount, setSubsidyAmount] = useState('0');
  const [interestRate, setInterestRate] = useState('0');

  // Step 3
  const [termMonths, setTermMonths] = useState('12');
  const [paymentDay, setPaymentDay] = useState('1');
  const [firstPaymentDate, setFirstPaymentDate] = useState('');

  const financedAmount = useMemo(() => {
    const total = parseFloat(totalPrice) || 0;
    const sep = parseFloat(separationAmount) || 0;
    const down = parseFloat(downPayment) || 0;
    const sub = parseFloat(subsidyAmount) || 0;
    return Math.max(0, total - sep - down - sub);
  }, [totalPrice, separationAmount, downPayment, subsidyAmount]);

  const previewSchedule = useMemo(() => {
    if (financedAmount <= 0 || !firstPaymentDate || !termMonths) return [];
    return generatePaymentSchedule(
      financedAmount,
      parseFloat(interestRate) || 0,
      parseInt(termMonths) || 1,
      parseInt(paymentDay) || 1,
      firstPaymentDate
    );
  }, [financedAmount, interestRate, termMonths, paymentDay, firstPaymentDate]);

  const monthlyPayment = previewSchedule.length > 0 ? previewSchedule[0].total_amount : 0;

  const handleCreate = () => {
    if (!organization?.id || !user?.id) return;

    const schedule = generatePaymentSchedule(
      financedAmount,
      parseFloat(interestRate) || 0,
      parseInt(termMonths),
      parseInt(paymentDay),
      firstPaymentDate
    );

    createContract.mutate({
      contract: {
        organization_id: organization.id,
        project_id: projectId,
        contact_id: contactId,
        unit_id: unitId || null,
        contract_number: contractNumber,
        fiducia_number: fiduciaNumber || null,
        status: 'active',
        signing_date: signingDate,
        total_price: parseFloat(totalPrice),
        separation_amount: parseFloat(separationAmount) || 0,
        down_payment: parseFloat(downPayment) || 0,
        subsidy_amount: parseFloat(subsidyAmount) || 0,
        financed_amount: financedAmount,
        interest_rate: parseFloat(interestRate) || 0,
        term_months: parseInt(termMonths),
        payment_day: parseInt(paymentDay),
        first_payment_date: firstPaymentDate,
        monthly_payment: monthlyPayment,
        notes: notes || null,
        created_by: user.id,
      },
      schedule,
    });
    onOpenChange(false);
    // Reset
    setStep(1);
    setContractNumber('');
    setFiduciaNumber('');
    setUnitId('');
    setNotes('');
    setTotalPrice('');
    setSeparationAmount('0');
    setDownPayment('0');
    setSubsidyAmount('0');
    setInterestRate('0');
    setTermMonths('12');
    setPaymentDay('1');
    setFirstPaymentDate('');
  };

  const canAdvance1 = contractNumber && signingDate;
  const canAdvance2 = parseFloat(totalPrice) > 0 && financedAmount > 0;
  const canAdvance3 = parseInt(termMonths) > 0 && firstPaymentDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo contrato — {contactName}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Paso {step} de 3: {step === 1 ? 'Datos del contrato' : step === 2 ? 'Financiación' : 'Plan de cuotas'}
          </p>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Número de contrato *</Label>
              <Input value={contractNumber} onChange={e => setContractNumber(e.target.value)} placeholder="Ej: CT-2025-001" />
            </div>
            <div>
              <Label>Número de fiducia</Label>
              <Input value={fiduciaNumber} onChange={e => setFiduciaNumber(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label>Unidad</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar unidad" /></SelectTrigger>
                <SelectContent>
                  {unitTypes.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nomenclature || u.name} — {u.commercial_status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de firma *</Label>
              <Input type="date" value={signingDate} onChange={e => setSigningDate(e.target.value)} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canAdvance1}>
                Siguiente <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Precio total *</Label>
              <Input type="number" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Separación</Label>
                <Input type="number" value={separationAmount} onChange={e => setSeparationAmount(e.target.value)} />
              </div>
              <div>
                <Label>Cuota inicial</Label>
                <Input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} />
              </div>
              <div>
                <Label>Subsidio</Label>
                <Input type="number" value={subsidyAmount} onChange={e => setSubsidyAmount(e.target.value)} />
              </div>
            </div>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3">
                <p className="text-sm font-medium">Monto financiado: <span className="text-primary text-lg">{fmt(financedAmount)}</span></p>
              </CardContent>
            </Card>
            <div>
              <Label>Tasa de interés mensual (%)</Label>
              <Input type="number" step="0.01" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="0 = sin intereses" />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />Anterior
              </Button>
              <Button onClick={() => setStep(3)} disabled={!canAdvance2}>
                Siguiente <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plazo (meses) *</Label>
                <Input type="number" value={termMonths} onChange={e => setTermMonths(e.target.value)} min="1" />
              </div>
              <div>
                <Label>Día de pago</Label>
                <Input type="number" value={paymentDay} onChange={e => setPaymentDay(e.target.value)} min="1" max="28" />
              </div>
            </div>
            <div>
              <Label>Fecha primera cuota *</Label>
              <Input type="date" value={firstPaymentDate} onChange={e => setFirstPaymentDate(e.target.value)} />
            </div>

            {previewSchedule.length > 0 && (
              <Card>
                <CardContent className="py-3 space-y-2">
                  <p className="text-sm font-medium">Cuota mensual: {fmt(monthlyPayment)}</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {previewSchedule.slice(0, 3).map(s => (
                      <div key={s.installment_number} className="flex justify-between">
                        <span>Cuota {s.installment_number} — {new Date(s.due_date).toLocaleDateString('es-CO')}</span>
                        <span>{fmt(s.total_amount)}</span>
                      </div>
                    ))}
                    {previewSchedule.length > 3 && (
                      <>
                        <div className="text-center">...</div>
                        <div className="flex justify-between">
                          <span>Cuota {previewSchedule[previewSchedule.length - 1].installment_number} — {new Date(previewSchedule[previewSchedule.length - 1].due_date).toLocaleDateString('es-CO')}</span>
                          <span>{fmt(previewSchedule[previewSchedule.length - 1].total_amount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" />Anterior
              </Button>
              <Button onClick={handleCreate} disabled={!canAdvance3 || createContract.isPending}>
                <Check className="h-4 w-4 mr-1" />
                {createContract.isPending ? 'Creando...' : 'Crear contrato'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
