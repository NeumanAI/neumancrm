import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeam, TeamRole } from '@/hooks/useTeam';
import { UserPlus, Mail, Shield, User, Eye } from 'lucide-react';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleOptions: { value: TeamRole; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'sales_rep', label: 'Vendedor', icon: <User className="h-4 w-4" />, description: 'Puede ver todo y editar lo propio' },
  { value: 'manager', label: 'Manager', icon: <Shield className="h-4 w-4" />, description: 'Puede editar datos del equipo' },
  { value: 'viewer', label: 'Visor', icon: <Eye className="h-4 w-4" />, description: 'Solo puede ver información' },
];

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { inviteMember, organization, teamMembers } = useTeam();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<TeamRole>('sales_rep');

  const activeMembers = teamMembers.filter(m => m.is_active).length;
  const canInvite = organization ? activeMembers < organization.max_users : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    inviteMember.mutate(
      { email, role, fullName: fullName || undefined },
      {
        onSuccess: () => {
          setEmail('');
          setFullName('');
          setRole('sales_rep');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invitar Miembro
          </DialogTitle>
          <DialogDescription>
            {organization && (
              <span className="text-sm">
                Miembros: {activeMembers} / {organization.max_users} (Plan {organization.plan})
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              placeholder="Juan Pérez"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!canInvite && (
            <p className="text-sm text-destructive">
              Has alcanzado el límite de usuarios de tu plan. Actualiza tu plan para invitar más miembros.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!canInvite || inviteMember.isPending || !email}
            >
              {inviteMember.isPending ? 'Invitando...' : 'Enviar Invitación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
