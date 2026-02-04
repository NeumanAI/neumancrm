import { useEffect, useState } from 'react';
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
  ArrowLeft,
  Pencil,
  Plus,
  Globe,
  Palette
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EditOrganizationDialog } from '@/components/admin/EditOrganizationDialog';
import { CreateOrganizationDialog } from '@/components/admin/CreateOrganizationDialog';
import { DomainsTab } from '@/components/admin/DomainsTab';

function OrganizationRow({ 
  org, 
  onApprove, 
  onReject,
  onEdit,
  isApproving,
  isRejecting,
}: { 
  org: OrganizationWithAdmin;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const hasCustomBranding = org.logo_url || org.custom_domain;
  
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            {org.logo_url ? (
              <img src={org.logo_url} alt={org.name} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{org.name}</p>
              {hasCustomBranding && (
                <Badge variant="outline" className="text-xs">
                  <Palette className="h-3 w-3 mr-1" />
                  Marca blanca
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {org.custom_domain || org.admin_email || 'Sin admin'}
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
        <div className="flex gap-2 justify-end">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
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
          )}
        </div>
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
    updateOrganization,
    createOrganization,
    refetchOrgs,
    domains,
    domainsLoading,
    deleteDomain,
  } = useSuperAdmin();

  const [editingOrg, setEditingOrg] = useState<OrganizationWithAdmin | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Redirect if not super-admin
  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSuperAdmin, isLoading, navigate]);

  const handleSaveOrg = async (data: any) => {
    await updateOrganization.mutateAsync(data);
    setEditingOrg(null);
  };

  const handleCreateOrg = async (data: any) => {
    await createOrganization.mutateAsync(data);
    setShowCreateDialog(false);
  };

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

  const whitelabelCount = [...pendingOrganizations, ...approvedOrganizations].filter(
    org => org.logo_url || org.custom_domain
  ).length;

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
                <p className="text-sm text-muted-foreground">Gestión de empresas y marca blanca</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchOrgs()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button 
              size="sm"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva empresa
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
              <CardDescription>Marca blanca</CardDescription>
              <CardTitle className="text-3xl text-primary">
                {whitelabelCount}
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
              Gestiona las empresas registradas y configura marca blanca
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
                <TabsTrigger value="domains" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Dominios
                  {domains.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {domains.length}
                    </Badge>
                  )}
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
                          onEdit={() => setEditingOrg(org)}
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
                          onEdit={() => setEditingOrg(org)}
                          isApproving={approveOrganization.isPending}
                          isRejecting={rejectOrganization.isPending}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="domains">
                <DomainsTab
                  domains={domains}
                  isLoading={domainsLoading}
                  onDeleteDomain={(id) => deleteDomain.mutate(id)}
                  isDeleting={deleteDomain.isPending}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Organization Dialog */}
      <EditOrganizationDialog
        open={!!editingOrg}
        onOpenChange={(open) => !open && setEditingOrg(null)}
        organization={editingOrg}
        onSave={handleSaveOrg}
        isSaving={updateOrganization.isPending}
      />

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateOrg}
        isCreating={createOrganization.isPending}
      />
    </div>
  );
}
