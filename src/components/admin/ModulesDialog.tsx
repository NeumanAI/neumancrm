import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Wallet, Settings2 } from 'lucide-react';
import { VERTICALS, getVerticalModules, VerticalId, getAvailableVerticals } from '@/config/verticals';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  enabledModules: Record<string, boolean>;
  currentVertical?: string;
  onSaved: () => void;
}

export function ModulesDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  enabledModules,
  currentVertical,
  onSaved,
}: Props) {
  const [modules, setModules] = useState<Record<string, boolean>>(enabledModules || {});
  const [vertical, setVertical] = useState<VerticalId>((currentVertical as VerticalId) || 'general');
  const [saving, setSaving] = useState(false);

  const handleVerticalChange = (newVertical: VerticalId) => {
    setVertical(newVertical);
    const verticalModules = getVerticalModules(newVertical);
    // Merge: activate vertical modules, keep others
    setModules((prev) => ({ ...prev, ...verticalModules }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          enabled_modules: modules,
          industry_vertical: vertical,
        } as any)
        .eq('id', organizationId);
      if (error) throw error;
      toast.success('Configuración actualizada');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const verticalList = getAvailableVerticals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configuración — {organizationName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vertical selector */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Vertical de negocio</Label>
            <div className="grid grid-cols-3 gap-2">
              {verticalList.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVerticalChange(v.id)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    vertical === v.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <span className="text-xl">{v.icon}</span>
                  <p className="text-xs font-semibold mt-1">{v.brandName}</p>
                  {v.comingSoon && (
                    <Badge variant="secondary" className="text-[9px] mt-1 px-1 py-0">
                      Pronto
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Module toggles */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Módulos activos</Label>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-base">Proyectos Inmobiliarios</Label>
                    <p className="text-sm text-muted-foreground">Gestión de desarrollos, unidades y compradores</p>
                  </div>
                </div>
                <Switch
                  checked={!!modules.real_estate}
                  onCheckedChange={(checked) => setModules({ ...modules, real_estate: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="text-base">Cartera Inmobiliaria</Label>
                    <p className="text-sm text-muted-foreground">Contratos de financiamiento, plan de pagos y gestión de cobro</p>
                  </div>
                </div>
                <Switch
                  checked={!!modules.real_estate_portfolio}
                  onCheckedChange={(checked) => setModules({ ...modules, real_estate_portfolio: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
