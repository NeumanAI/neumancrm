import { useOutletContext } from 'react-router-dom';
import { usePortalContracts, type PortalSession } from '@/hooks/useClientPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertCircle, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const INSTALLMENT_STATUS: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pagado', className: 'bg-green-100 text-green-800' },
  pending: { label: 'Pendiente', className: 'bg-muted text-muted-foreground' },
  overdue: { label: 'Vencido', className: 'bg-red-100 text-red-800' },
  partial: { label: 'Parcial', className: 'bg-yellow-100 text-yellow-800' },
};

const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export default function PortalCartera() {
  const session = useOutletContext<PortalSession>();
  const { data: contracts = [], isLoading } = usePortalContracts(session.contact_id, session.organization_id);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!contracts.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="font-medium">No tienes contratos activos</p>
        <p className="text-sm text-muted-foreground">Cuando tengas un contrato, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Mi Cartera</h2>

      {contracts.map(contract => {
        const paid = contract.schedule.filter(i => i.status === 'paid').reduce((s, i) => s + i.paid_amount, 0);
        const pending = contract.schedule.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.total_amount - i.paid_amount), 0);
        const overdue = contract.schedule.filter(i => i.status === 'overdue').length;
        const pct = contract.financed_amount > 0 ? (paid / contract.financed_amount) * 100 : 0;

        return (
          <Card key={contract.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {contract.project_name || 'Contrato'}
                  {contract.unit_name ? ` · ${contract.unit_name}` : ''}
                </CardTitle>
                <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                  {contract.status === 'active' ? 'Activo' : contract.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                #{contract.contract_number} · {format(new Date(contract.created_at), 'MMM yyyy', { locale: es })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold text-sm">{fmt(contract.total_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pagado</p>
                  <p className="font-semibold text-sm text-green-600">{fmt(paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="font-semibold text-sm">{fmt(pending)}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Avance de pago</span>
                  <span>{pct.toFixed(1)}%</span>
                </div>
                <Progress value={Math.min(pct, 100)} className="h-2" />
              </div>

              {/* Overdue alert */}
              {overdue > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Tienes {overdue} cuota{overdue > 1 ? 's' : ''} vencida{overdue > 1 ? 's' : ''}. Contacta a tu asesor.</span>
                </div>
              )}

              {/* Payment schedule */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                  Plan de pagos
                </summary>
                <div className="mt-3 space-y-2">
                  {contract.schedule.map(inst => {
                    const s = INSTALLMENT_STATUS[inst.status] || INSTALLMENT_STATUS.pending;
                    return (
                      <div key={inst.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                        <div>
                          <span className="font-medium">Cuota #{inst.installment_number}</span>
                          <span className="text-muted-foreground ml-2">
                            {format(new Date(inst.due_date), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{fmt(inst.total_amount)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
