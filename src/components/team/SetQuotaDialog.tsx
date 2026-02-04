import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTeam, TeamMember } from '@/hooks/useTeam';
import { Target, DollarSign } from 'lucide-react';

interface SetQuotaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember | null;
}

export function SetQuotaDialog({ open, onOpenChange, member }: SetQuotaDialogProps) {
  const { updateQuota } = useTeam();
  const [quotaMonthly, setQuotaMonthly] = useState('');
  const [quotaQuarterly, setQuotaQuarterly] = useState('');

  useEffect(() => {
    if (member) {
      setQuotaMonthly(member.quota_monthly?.toString() || '');
      setQuotaQuarterly(member.quota_quarterly?.toString() || '');
    }
  }, [member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    updateQuota.mutate(
      {
        memberId: member.id,
        quotaMonthly: parseFloat(quotaMonthly) || 0,
        quotaQuarterly: parseFloat(quotaQuarterly) || 0,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('es-MX');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Establecer Cuota
          </DialogTitle>
          <DialogDescription>
            Configurar cuotas de ventas para{' '}
            <span className="font-medium text-foreground">{member?.full_name || member?.email}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quotaMonthly">Cuota Mensual (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="quotaMonthly"
                type="number"
                placeholder="10,000"
                value={quotaMonthly}
                onChange={(e) => setQuotaMonthly(e.target.value)}
                className="pl-10"
                min="0"
                step="100"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivo de ventas mensual
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotaQuarterly">Cuota Trimestral (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="quotaQuarterly"
                type="number"
                placeholder="30,000"
                value={quotaQuarterly}
                onChange={(e) => setQuotaQuarterly(e.target.value)}
                className="pl-10"
                min="0"
                step="100"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivo de ventas trimestral
            </p>
          </div>

          {member && member.deals_closed_value > 0 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm">
                <span className="text-muted-foreground">Ventas cerradas: </span>
                <span className="font-medium">${member.deals_closed_value.toLocaleString('es-MX')}</span>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateQuota.isPending}>
              {updateQuota.isPending ? 'Guardando...' : 'Guardar Cuota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
