import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Palette, User, Shield, Bell, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { IntegrationsTab } from '@/components/settings/IntegrationsTab';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { organization, isAdmin, updateOrganization } = useTeam();
  const queryClient = useQueryClient();

  const [brandingForm, setBrandingForm] = useState({
    name: '',
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
  });

  // Initialize form when organization loads
  useEffect(() => {
    if (organization) {
      setBrandingForm({
        name: organization.name || '',
        primary_color: organization.primary_color || '#3B82F6',
        secondary_color: organization.secondary_color || '#8B5CF6',
      });
    }
  }, [organization]);

  // Update organization branding
  const updateBranding = useMutation({
    mutationFn: async (updates: { name?: string; primary_color: string; secondary_color: string }) => {
      if (!organization) throw new Error('No organization found');

      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organization.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Configuración guardada');
      
      // Apply colors dynamically
      document.documentElement.style.setProperty('--primary', hexToHsl(brandingForm.primary_color));
      document.documentElement.style.setProperty('--accent', hexToHsl(brandingForm.secondary_color));
    },
    onError: (error) => {
      toast.error('Error al guardar: ' + error.message);
    },
  });

  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '217 91% 60%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleSaveBranding = () => {
    updateBranding.mutate({
      name: brandingForm.name,
      primary_color: brandingForm.primary_color,
      secondary_color: brandingForm.secondary_color,
    });
  };

  const userInitials = user?.email?.split('@')[0].slice(0, 2).toUpperCase() || 'U';

  // Only admins can edit branding
  const canEditBranding = isAdmin;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Gestiona tu cuenta y preferencias</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Cuenta
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Marca
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Integraciones
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account">
          <div className="space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Información de Cuenta</CardTitle>
                <CardDescription>Tu información personal y de acceso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Miembro desde {new Date(user?.created_at || '').toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Shield className="h-5 w-5" />
                  Zona de Peligro
                </CardTitle>
                <CardDescription>Acciones irreversibles de la cuenta</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => signOut()}>
                  Cerrar Sesión
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle>Personalización de Marca</CardTitle>
              <CardDescription>
                {canEditBranding 
                  ? 'Personaliza la apariencia de tu CRM (White-label)' 
                  : 'Solo los administradores pueden modificar el branding'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Organization Name - editable by admins */}
              <div className="space-y-2">
                <Label htmlFor="org_name">Nombre de la Organización</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="org_name"
                    value={brandingForm.name}
                    onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                    disabled={!canEditBranding}
                    className="flex-1"
                  />
                  {!canEditBranding && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Solo lectura
                    </span>
                  )}
                </div>
              </div>

              {/* Custom Domain (read-only) */}
              {organization?.custom_domain && (
                <div className="space-y-2">
                  <Label>Dominio Personalizado</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={organization.custom_domain}
                      disabled
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Asignado por Super Admin
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Color Primario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                      disabled={!canEditBranding}
                    />
                    <Input
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1"
                      disabled={!canEditBranding}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Color Secundario</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                      disabled={!canEditBranding}
                    />
                    <Input
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                      placeholder="#8B5CF6"
                      className="flex-1"
                      disabled={!canEditBranding}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {/* Preview */}
              <div className="p-6 rounded-lg bg-muted/50 space-y-4">
                <p className="text-sm font-medium text-muted-foreground">Vista Previa</p>
                <div className="flex items-center gap-4">
                  <Button 
                    style={{ background: `linear-gradient(135deg, ${brandingForm.primary_color}, ${brandingForm.secondary_color})` }}
                    className="text-white"
                  >
                    Botón Principal
                  </Button>
                  <Button 
                    variant="outline"
                    style={{ borderColor: brandingForm.primary_color, color: brandingForm.primary_color }}
                  >
                    Botón Secundario
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleSaveBranding} 
                className="gradient-primary"
                disabled={!canEditBranding}
              >
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
