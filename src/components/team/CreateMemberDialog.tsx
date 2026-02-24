import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamRole } from '@/hooks/useTeam';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Crown, Shield, User, Eye, Loader2 } from 'lucide-react';

const roleOptions: { value: TeamRole; label: string; icon: React.ReactNode }[] = [
  { value: 'admin', label: 'Admin', icon: <Crown className="h-4 w-4" /> },
  { value: 'manager', label: 'Manager', icon: <Shield className="h-4 w-4" /> },
  { value: 'sales_rep', label: 'Vendedor', icon: <User className="h-4 w-4" /> },
  { value: 'viewer', label: 'Visor', icon: <Eye className="h-4 w-4" /> },
];

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMemberDialog({ open, onOpenChange }: CreateMemberDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<TeamRole>('sales_rep');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setPassword('');
    setConfirmPassword('');
    setRole('sales_rep');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-team-member', {
        body: { email, password, fullName, role },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Miembro creado',
        description: `${fullName || email} puede iniciar sesión inmediatamente.`,
      });

      queryClient.invalidateQueries({ queryKey: ['team_members'] });
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Error al crear miembro',
        description: err.message || 'Error desconocido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Miembro</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario con acceso inmediato. No se enviará invitación por correo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-name">Nombre completo</Label>
            <Input
              id="create-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">Contraseña</Label>
            <Input
              id="create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-confirm">Confirmar contraseña</Label>
            <Input
              id="create-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetir contraseña"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Miembro
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
