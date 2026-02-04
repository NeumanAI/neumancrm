import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin, OrganizationWithAdmin } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Building2, 
  Check, 
  Clock, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  Users, 
  X,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function OrganizationRow({ 
  org, 
  onApprove, 
  onReject,
  isApproving,
  isRejecting,
}: { 
  org: OrganizationWithAdmin;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{org.name}</p>
            <p className="text-xs text-muted-foreground">
              {org.admin_email || 'Sin admin'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{org.member_count}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {format(new Date(org.created_at), "d MMM yyyy", { locale: es })}
        </span>
      </TableCell>
      <TableCell>
        {org.is_approved ? (
          <Badge variant="default" className="bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {org.is_approved ? (
          <Button 
            size="sm" 
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onReject}
            disabled={isRejecting}
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Revocar
              </>
            )}
          </Button>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button 
              size="sm" 
              variant="default"
              onClick={onApprove}
              disabled={isApproving}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Aprobar
                </>
              )}
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { 
    isSuperAdmin, 
    isLoading, 
    pendingOrganizations, 
    approvedOrganizations,
    approveOrganization,
    rejectOrganization,
    refetchOrgs,
  } = useSuperAdmin();

  // Redirect if not super-admin
  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSuperAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Panel de Administración</h1>
                <p className="text-sm text-muted-foreground">Gestión de empresas</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchOrgs()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendientes</CardDescription>
              <CardTitle className="text-3xl text-amber-600">
                {pendingOrganizations.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Aprobadas</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {approvedOrganizations.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total empresas</CardDescription>
              <CardTitle className="text-3xl">
                {pendingOrganizations.length + approvedOrganizations.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
            <CardDescription>
              Gestiona las empresas registradas en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pendientes
                  {pendingOrganizations.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {pendingOrganizations.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <Check className="h-4 w-4" />
                  Aprobadas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending">
                {pendingOrganizations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay empresas pendientes de aprobación</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Usuarios</TableHead>
                        <TableHead>Registrada</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingOrganizations.map((org) => (
                        <OrganizationRow
                          key={org.id}
                          org={org}
                          onApprove={() => approveOrganization.mutate(org.id)}
                          onReject={() => rejectOrganization.mutate(org.id)}
                          isApproving={approveOrganization.isPending}
                          isRejecting={rejectOrganization.isPending}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="approved">
                {approvedOrganizations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay empresas aprobadas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Usuarios</TableHead>
                        <TableHead>Registrada</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedOrganizations.map((org) => (
                        <OrganizationRow
                          key={org.id}
                          org={org}
                          onApprove={() => approveOrganization.mutate(org.id)}
                          onReject={() => rejectOrganization.mutate(org.id)}
                          isApproving={approveOrganization.isPending}
                          isRejecting={rejectOrganization.isPending}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
