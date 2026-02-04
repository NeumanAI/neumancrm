import { useState } from 'react';
import { useTeam, TeamMember, TeamRole } from '@/hooks/useTeam';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { InviteMemberDialog } from '@/components/team/InviteMemberDialog';
import { SetQuotaDialog } from '@/components/team/SetQuotaDialog';
import { ActivityFeedList } from '@/components/team/ActivityFeedList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  Eye,
  MoreHorizontal,
  Target,
  UserMinus,
  Users,
  Activity,
  Building2
} from 'lucide-react';

const roleConfig: Record<TeamRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <Crown className="h-4 w-4" />, color: 'bg-amber-500' },
  manager: { label: 'Manager', icon: <Shield className="h-4 w-4" />, color: 'bg-blue-500' },
  sales_rep: { label: 'Vendedor', icon: <User className="h-4 w-4" />, color: 'bg-green-500' },
  viewer: { label: 'Visor', icon: <Eye className="h-4 w-4" />, color: 'bg-gray-500' },
};

export default function Team() {
  const { 
    organization, 
    teamMembers, 
    currentMember,
    isLoading, 
    isAdmin,
    canSetQuotas,
    updateMemberRole,
    removeMember
  } = useTeam();
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [removeMemberDialog, setRemoveMemberDialog] = useState<TeamMember | null>(null);

  const activeMembers = teamMembers.filter(m => m.is_active);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRoleChange = (memberId: string, role: TeamRole) => {
    updateMemberRole.mutate({ memberId, role });
  };

  const handleRemoveMember = () => {
    if (removeMemberDialog) {
      removeMember.mutate(removeMemberDialog.id);
      setRemoveMemberDialog(null);
    }
  };

  const openQuotaDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setQuotaDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{organization?.name || 'Mi Equipo'}</h1>
              <p className="text-muted-foreground">
                Plan <span className="capitalize font-medium">{organization?.plan}</span> • {' '}
                {activeMembers.length} / {organization?.max_users} usuarios
              </p>
            </div>
          </div>
        </div>
        
        {isAdmin && (
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invitar Miembro
          </Button>
        )}
      </div>

      {/* Progress bar for user limit */}
      {organization && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Uso de usuarios</span>
              <span className="text-sm font-medium">
                {activeMembers.length} de {organization.max_users}
              </span>
            </div>
            <Progress 
              value={(activeMembers.length / organization.max_users) * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Miembros
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Miembros del Equipo</CardTitle>
              <CardDescription>
                Gestiona los miembros de tu organización, sus roles y cuotas de ventas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Cuota Mensual</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMembers.map((member) => {
                    const quotaProgress = member.quota_monthly > 0 
                      ? (member.deals_closed_value / member.quota_monthly) * 100 
                      : 0;
                    const isCurrentUser = member.user_id === currentMember?.user_id;
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback>
                                {getInitials(member.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {member.full_name || member.email.split('@')[0]}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">Tú</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isAdmin && !isCurrentUser ? (
                            <Select 
                              value={member.role} 
                              onValueChange={(v) => handleRoleChange(member.id, v as TeamRole)}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(roleConfig).map(([role, config]) => (
                                  <SelectItem key={role} value={role}>
                                    <div className="flex items-center gap-2">
                                      {config.icon}
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              {roleConfig[member.role].icon}
                              {roleConfig[member.role].label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.quota_monthly > 0 ? (
                            <span className="font-medium">
                              ${member.quota_monthly.toLocaleString('es-MX')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sin cuota</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.quota_monthly > 0 ? (
                            <div className="space-y-1 w-[150px]">
                              <Progress value={Math.min(quotaProgress, 100)} className="h-2" />
                              <div className="text-xs text-muted-foreground">
                                ${member.deals_closed_value.toLocaleString('es-MX')} / ${member.quota_monthly.toLocaleString('es-MX')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(isAdmin || canSetQuotas) && !isCurrentUser && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canSetQuotas && (
                                  <DropdownMenuItem onClick={() => openQuotaDialog(member)}>
                                    <Target className="h-4 w-4 mr-2" />
                                    Establecer Cuota
                                  </DropdownMenuItem>
                                )}
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => setRemoveMemberDialog(member)}
                                      className="text-destructive"
                                    >
                                      <UserMinus className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>
                Historial de cambios realizados por los miembros del equipo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeedList limit={50} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteMemberDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen} 
      />
      
      <SetQuotaDialog
        open={quotaDialogOpen}
        onOpenChange={setQuotaDialogOpen}
        member={selectedMember}
      />

      <AlertDialog open={!!removeMemberDialog} onOpenChange={() => setRemoveMemberDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a <strong>{removeMemberDialog?.full_name || removeMemberDialog?.email}</strong> del equipo. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
