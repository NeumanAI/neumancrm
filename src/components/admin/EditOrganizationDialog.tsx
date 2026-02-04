import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Palette, Globe, Image } from 'lucide-react';

interface OrganizationBranding {
  id: string;
  name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  custom_domain: string | null;
}

interface EditOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: OrganizationBranding | null;
  onSave: (data: Partial<OrganizationBranding>) => Promise<void>;
  isSaving: boolean;
}

export function EditOrganizationDialog({
  open,
  onOpenChange,
  organization,
  onSave,
  isSaving,
}: EditOrganizationDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    custom_domain: '',
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        logo_url: organization.logo_url || '',
        favicon_url: organization.favicon_url || '',
        primary_color: organization.primary_color || '#3B82F6',
        secondary_color: organization.secondary_color || '#8B5CF6',
        custom_domain: organization.custom_domain || '',
      });
    }
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      id: organization?.id,
      name: formData.name,
      logo_url: formData.logo_url || null,
      favicon_url: formData.favicon_url || null,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      custom_domain: formData.custom_domain || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Marca Blanca</DialogTitle>
          <DialogDescription>
            Personaliza el branding y dominio de esta organización
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la empresa</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Mi Empresa"
              required
            />
          </div>

          {/* URLs de imágenes */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Image className="h-4 w-4" />
              Imágenes
            </div>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://ejemplo.com/logo.png"
                />
                {formData.logo_url && (
                  <div className="h-12 w-auto p-2 bg-muted rounded flex items-center justify-center">
                    <img src={formData.logo_url} alt="Logo preview" className="h-full object-contain" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="favicon_url">URL del Favicon</Label>
                <Input
                  id="favicon_url"
                  type="url"
                  value={formData.favicon_url}
                  onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                  placeholder="https://ejemplo.com/favicon.ico"
                />
              </div>
            </div>
          </div>

          {/* Colores */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="h-4 w-4" />
              Colores de marca
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Color primario</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
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
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Color secundario</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
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
                    placeholder="#8B5CF6"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dominio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4" />
              Dominio personalizado
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom_domain">Dominio</Label>
              <Input
                id="custom_domain"
                value={formData.custom_domain}
                onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                placeholder="crm.miempresa.com"
              />
              <p className="text-xs text-muted-foreground">
                El cliente debe configurar un CNAME apuntando a tu dominio principal
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
