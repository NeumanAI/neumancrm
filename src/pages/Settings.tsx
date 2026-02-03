import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Branding } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Palette, User, Shield, Mail, Slack, Calendar, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Settings() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();

  // Fetch branding
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branding')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Branding | null;
    },
  });

  const [brandingForm, setBrandingForm] = useState({
    company_name: branding?.company_name || 'Mi CRM',
    primary_color: branding?.primary_color || '#3B82F6',
    secondary_color: branding?.secondary_color || '#8B5CF6',
  });

  // Update branding
  const updateBranding = useMutation({
    mutationFn: async (updates: Partial<Branding>) => {
      if (!user) throw new Error('No authenticated user');

      if (branding) {
        const { error } = await supabase
          .from('branding')
          .update(updates)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branding')
          .insert({ ...updates, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Configuración guardada');
      
      // Apply colors dynamically
      document.documentElement.style.setProperty('--primary', hexToHsl(brandingForm.primary_color));
      document.documentElement.style.setProperty('--secondary', hexToHsl(brandingForm.secondary_color));
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
    updateBranding.mutate(brandingForm);
  };

  const userInitials = user?.email?.split('@')[0].slice(0, 2).toUpperCase() || 'U';

  const integrations = [
    { id: 'gmail', name: 'Gmail', icon: Mail, connected: false, description: 'Sincroniza tus emails automáticamente' },
    { id: 'calendar', name: 'Google Calendar', icon: Calendar, connected: false, description: 'Conecta tu calendario de reuniones' },
    { id: 'slack', name: 'Slack', icon: Slack, connected: false, description: 'Recibe notificaciones en Slack' },
    { id: 'zoom', name: 'Zoom', icon: Video, connected: false, description: 'Graba y analiza tus reuniones' },
  ];

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
              <CardDescription>Personaliza la apariencia de tu CRM (White-label)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nombre de la Empresa</Label>
                <Input
                  id="company_name"
                  value={brandingForm.company_name}
                  onChange={(e) => setBrandingForm({ ...brandingForm, company_name: e.target.value })}
                  placeholder="Mi Empresa"
                />
              </div>

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
                    />
                    <Input
                      value={brandingForm.primary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, primary_color: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1"
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
                    />
                    <Input
                      value={brandingForm.secondary_color}
                      onChange={(e) => setBrandingForm({ ...brandingForm, secondary_color: e.target.value })}
                      placeholder="#8B5CF6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

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

              <Button onClick={handleSaveBranding} className="gradient-primary">
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="grid gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id} className="border-0 shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <integration.icon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <Button variant={integration.connected ? 'outline' : 'default'}>
                      {integration.connected ? 'Desconectar' : 'Conectar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
