import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  enabledModules: Record<string, boolean>;
  onSaved: () => void;
}

export function ModulesDialog({ open, onOpenChange, organizationId, organizationName, enabledModules, onSaved }: Props) {
  const [modules, setModules] = useState<Record<string, boolean>>(enabledModules || {});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ enabled_modules: modules } as any)
        .eq('id', organizationId);
      if (error) throw error;
      toast.success('Módulos actualizados');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Módulos - {organizationName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
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
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
