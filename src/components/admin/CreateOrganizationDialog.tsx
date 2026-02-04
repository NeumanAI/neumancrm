import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

interface CreateOrganizationData {
  name: string;
  admin_email: string;
  admin_name: string;
  is_approved: boolean;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  custom_domain?: string;
}

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: CreateOrganizationData) => Promise<void>;
  isCreating: boolean;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: CreateOrganizationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    admin_email: '',
    admin_name: '',
    is_approved: true,
    logo_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    custom_domain: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({
      name: formData.name,
      admin_email: formData.admin_email,
      admin_name: formData.admin_name,
      is_approved: formData.is_approved,
      logo_url: formData.logo_url || undefined,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      custom_domain: formData.custom_domain || undefined,
    });
    
    // Reset form
    setFormData({
      name: '',
      admin_email: '',
      admin_name: '',
      is_approved: true,
      logo_url: '',
      primary_color: '#3B82F6',
      secondary_color: '#8B5CF6',
      custom_domain: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Organización</DialogTitle>
          <DialogDescription>
            Crea una cuenta para un nuevo cliente. El administrador recibirá las credenciales de acceso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nombre de la empresa *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Empresa XYZ"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-admin-email">Email del administrador *</Label>
              <Input
                id="create-admin-email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                placeholder="admin@empresa.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Se creará una cuenta con este email. El usuario deberá registrarse con este correo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-admin-name">Nombre del administrador</Label>
              <Input
                id="create-admin-name"
                value={formData.admin_name}
                onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
          </div>

          {/* Branding opcional */}
          <div className="space-y-4 border-t pt-4">
            <p className="text-sm font-medium">Branding (opcional)</p>
            
            <div className="space-y-2">
              <Label htmlFor="create-logo">URL del Logo</Label>
              <Input
                id="create-logo"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-primary">Color primario</Label>
                <div className="flex gap-2">
                  <Input
                    id="create-primary"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-secondary">Color secundario</Label>
                <div className="flex gap-2">
                  <Input
                    id="create-secondary"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-domain">Dominio personalizado</Label>
              <Input
                id="create-domain"
                value={formData.custom_domain}
                onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                placeholder="crm.micliente.com"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <Label htmlFor="create-approved">Aprobar inmediatamente</Label>
              <p className="text-xs text-muted-foreground">
                Si desactivas esto, la cuenta quedará pendiente de aprobación
              </p>
            </div>
            <Switch
              id="create-approved"
              checked={formData.is_approved}
              onCheckedChange={(checked) => setFormData({ ...formData, is_approved: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || !formData.name || !formData.admin_email}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear organización
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
