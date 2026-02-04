import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Building2 } from 'lucide-react';

interface CreateSubClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; admin_email: string; admin_name?: string; is_approved?: boolean }) => Promise<void>;
  isCreating: boolean;
}

export function CreateSubClientDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateSubClientDialogProps) {
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isApproved, setIsApproved] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({
      name,
      admin_email: adminEmail,
      admin_name: adminName || undefined,
      is_approved: isApproved,
    });
    // Reset form
    setName('');
    setAdminEmail('');
    setAdminName('');
    setIsApproved(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Nuevo cliente</DialogTitle>
              <DialogDescription>
                Crea un nuevo cliente para tu organización
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la empresa *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Empresa ABC"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email del administrador *</Label>
            <Input
              id="adminEmail"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@empresa.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              Este usuario será el administrador de la empresa
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminName">Nombre del administrador</Label>
            <Input
              id="adminName"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Nombre completo (opcional)"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isApproved"
              checked={isApproved}
              onCheckedChange={(checked) => setIsApproved(checked === true)}
            />
            <Label htmlFor="isApproved" className="text-sm font-normal cursor-pointer">
              Activar inmediatamente
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || !name || !adminEmail}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
