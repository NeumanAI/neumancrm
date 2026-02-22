import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdmin, OrganizationWithAdmin, OrganizationType } from '@/hooks/useSuperAdmin';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Palette,
  ChevronDown,
  UserPlus,
  DollarSign,
  Search,
  ClipboardList,
  HardHat
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EditOrganizationDialog } from '@/components/admin/EditOrganizationDialog';
import { CreateOrganizationDialog } from '@/components/admin/CreateOrganizationDialog';
import { AssignAdminDialog } from '@/components/admin/AssignAdminDialog';
import { DomainsTab } from '@/components/admin/DomainsTab';
import { PricingAdminPanel } from '@/components/admin/PricingAdminPanel';
import { ModulesDialog } from '@/components/admin/ModulesDialog';

function OrganizationTypeBadge({ type }: { type: OrganizationType }) {
  if (type === 'whitelabel') {
    return (
      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
        <Palette className="h-3 w-3 mr-1" />
        Marca Blanca
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
      <Building2 className="h-3 w-3 mr-1" />
      Directo
    </Badge>
  );
}

function OrganizationRow({ 
  org, 
  onApprove, 
  onReject,
  onEdit,
  onAssignAdmin,
  onModules,
  isApproving,
  isRejecting,
  isSubClient = false,
  subClients = [],
}: { 
  org: OrganizationWithAdmin;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onAssignAdmin: () => void;
  onModules: () => void;
  isApproving: boolean;
  isRejecting: boolean;
  isSubClient?: boolean;
  subClients?: OrganizationWithAdmin[];
}) {
  return (
    <>
      <TableRow className={isSubClient ? 'bg-muted/30' : ''}>
        <TableCell>
          <div className={cn("flex items-center gap-3", isSubClient && "pl-8")}>
            {isSubClient && (
              <span className="text-muted-foreground">└</span>
            )}
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
                {isSubClient ? (
                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700">
                    Sub-cliente
                  </Badge>
                ) : (
                  <OrganizationTypeBadge type={org.organization_type} />
                )}
              </div>
              {org.custom_domain && (
                <p className="text-xs text-muted-foreground">{org.custom_domain}</p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          {org.admin_email ? (
            <span className="text-sm text-muted-foreground">
              {org.admin_email}
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={onAssignAdmin}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Asignar admin
            </Button>
          )}
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
              onClick={onModules}
              title="Módulos"
            >
              <HardHat className="h-4 w-4" />
            </Button>
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
      {/* Render sub-clients inline if this is a whitelabel */}
      {!isSubClient && subClients.map((subClient) => (
        <OrganizationRow
          key={subClient.id}
          org={subClient}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          onAssignAdmin={onAssignAdmin}
          onModules={onModules}
          isApproving={isApproving}
          isRejecting={isRejecting}
          isSubClient={true}
        />
      ))}
    </>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { 
    isSuperAdmin, 
    isLoading, 
    pendingOrganizations, 
    approvedOrganizations,
    directOrganizations,
    whitelabelOrganizations,
    subClientOrganizations,
    getSubClientsOf,
    approveOrganization,
    rejectOrganization,
    updateOrganization,
    createOrganization,
    assignAdmin,
    refetchOrgs,
    domains,
    domainsLoading,
    deleteDomain,
  } = useSuperAdmin();

  const [editingOrg, setEditingOrg] = useState<OrganizationWithAdmin | null>(null);
  const [createDialogType, setCreateDialogType] = useState<OrganizationType | null>(null);
  const [assigningAdminOrg, setAssigningAdminOrg] = useState<OrganizationWithAdmin | null>(null);
  const [modulesOrg, setModulesOrg] = useState<{ id: string; name: string; modules: Record<string, boolean> } | null>(null);

  // Redirect if not super-admin
  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSuperAdmin, isLoading, navigate]);

  const handleOpenModules = (org: OrganizationWithAdmin) => {
    const modules = ((org as any).enabled_modules as Record<string, boolean>) || {};
    setModulesOrg({ id: org.id, name: org.name, modules });
  };

  const handleSaveOrg = async (data: any) => {
    await updateOrganization.mutateAsync(data);
    setEditingOrg(null);
  };

  const handleCreateOrg = async (data: any) => {
    await createOrganization.mutateAsync(data);
    setCreateDialogType(null);
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva empresa
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem 
                  onClick={() => setCreateDialogType('direct')}
                  className="flex items-start gap-3 p-3"
                >
                  <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Cliente directo</p>
                    <p className="text-xs text-muted-foreground">Usa tu marca NeumanCRM</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setCreateDialogType('whitelabel')}
                  className="flex items-start gap-3 p-3"
                >
                  <Palette className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Marca blanca</p>
                    <p className="text-xs text-muted-foreground">Reseller con su propia marca</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              <CardDescription>Clientes directos</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {directOrganizations.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Marca blanca</CardDescription>
              <CardTitle className="text-3xl text-purple-600">
                {whitelabelOrganizations.length}
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
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Todas
                  <Badge variant="secondary" className="ml-1">
                    {pendingOrganizations.length + approvedOrganizations.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="direct" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Directos
                  <Badge variant="secondary" className="ml-1">
                    {directOrganizations.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="whitelabel" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Marca Blanca
                  <Badge variant="secondary" className="ml-1">
                    {whitelabelOrganizations.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="subclients" className="gap-2">
                  <Users className="h-4 w-4" />
                  Sub-clientes
                  <Badge variant="secondary" className="ml-1">
                    {subClientOrganizations.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pendientes
                  {pendingOrganizations.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {pendingOrganizations.length}
                    </Badge>
                  )}
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
                <TabsTrigger value="pricing" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing & Billing
                </TabsTrigger>
                <TabsTrigger value="registrations" className="gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Registros
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <OrganizationsTable 
                  organizations={[...pendingOrganizations, ...approvedOrganizations]}
                  onApprove={(id) => approveOrganization.mutate(id)}
                  onReject={(id) => rejectOrganization.mutate(id)}
                  onEdit={setEditingOrg}
                  onAssignAdmin={setAssigningAdminOrg}
                  onModules={handleOpenModules}
                  isApproving={approveOrganization.isPending}
                  isRejecting={rejectOrganization.isPending}
                  emptyMessage="No hay empresas registradas"
                  emptyIcon={Building2}
                />
              </TabsContent>

              <TabsContent value="direct">
                <OrganizationsTable 
                  organizations={directOrganizations}
                  onApprove={(id) => approveOrganization.mutate(id)}
                  onReject={(id) => rejectOrganization.mutate(id)}
                  onEdit={setEditingOrg}
                  onAssignAdmin={setAssigningAdminOrg}
                  onModules={handleOpenModules}
                  isApproving={approveOrganization.isPending}
                  isRejecting={rejectOrganization.isPending}
                  emptyMessage="No hay clientes directos"
                  emptyIcon={Building2}
                />
              </TabsContent>

              <TabsContent value="whitelabel">
                <OrganizationsTable 
                  organizations={whitelabelOrganizations}
                  onApprove={(id) => approveOrganization.mutate(id)}
                  onReject={(id) => rejectOrganization.mutate(id)}
                  onEdit={setEditingOrg}
                  onAssignAdmin={setAssigningAdminOrg}
                  onModules={handleOpenModules}
                  isApproving={approveOrganization.isPending}
                  isRejecting={rejectOrganization.isPending}
                  emptyMessage="No hay empresas de marca blanca"
                  emptyIcon={Palette}
                  getSubClientsOf={getSubClientsOf}
                  showHierarchy={true}
                />
              </TabsContent>

              <TabsContent value="subclients">
                <OrganizationsTable 
                  organizations={subClientOrganizations}
                  onApprove={(id) => approveOrganization.mutate(id)}
                  onReject={(id) => rejectOrganization.mutate(id)}
                  onEdit={setEditingOrg}
                  onAssignAdmin={setAssigningAdminOrg}
                  onModules={handleOpenModules}
                  isApproving={approveOrganization.isPending}
                  isRejecting={rejectOrganization.isPending}
                  emptyMessage="No hay sub-clientes registrados"
                  emptyIcon={Users}
                />
              </TabsContent>

              <TabsContent value="pending">
                <OrganizationsTable 
                  organizations={pendingOrganizations}
                  onApprove={(id) => approveOrganization.mutate(id)}
                  onReject={(id) => rejectOrganization.mutate(id)}
                  onEdit={setEditingOrg}
                  onAssignAdmin={setAssigningAdminOrg}
                  onModules={handleOpenModules}
                  isApproving={approveOrganization.isPending}
                  isRejecting={rejectOrganization.isPending}
                  emptyMessage="No hay empresas pendientes de aprobación"
                  emptyIcon={Clock}
                />
              </TabsContent>

              <TabsContent value="domains">
                <DomainsTab
                  domains={domains}
                  isLoading={domainsLoading}
                  onDeleteDomain={(id) => deleteDomain.mutate(id)}
                  isDeleting={deleteDomain.isPending}
                />
              </TabsContent>

              <TabsContent value="pricing">
                <PricingAdminPanel />
              </TabsContent>

              <TabsContent value="registrations">
                <RegistrationsPanel />
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
      {createDialogType && (
        <CreateOrganizationDialog
          open={!!createDialogType}
          onOpenChange={(open) => !open && setCreateDialogType(null)}
          onCreate={handleCreateOrg}
          isCreating={createOrganization.isPending}
          organizationType={createDialogType}
        />
      )}

      {/* Assign Admin Dialog */}
      <AssignAdminDialog
        open={!!assigningAdminOrg}
        onOpenChange={(open) => !open && setAssigningAdminOrg(null)}
        organizationName={assigningAdminOrg?.name || ''}
        onAssign={async (data) => {
          if (!assigningAdminOrg) return;
          await assignAdmin.mutateAsync({
            organizationId: assigningAdminOrg.id,
            email: data.email,
            fullName: data.fullName,
          });
          setAssigningAdminOrg(null);
        }}
        isAssigning={assignAdmin.isPending}
      />

      {/* Modules Dialog */}
      {modulesOrg && (
        <ModulesDialog
          open={!!modulesOrg}
          onOpenChange={(open) => !open && setModulesOrg(null)}
          organizationId={modulesOrg.id}
          organizationName={modulesOrg.name}
          enabledModules={modulesOrg.modules}
          onSaved={() => refetchOrgs()}
        />
      )}
    </div>
  );
}

// ── Hook para registros de onboarding ──────────────────────────
function useAdminRegistrations() {
  return useQuery({
    queryKey: ['admin_registrations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_registrations');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

// ── Panel de registros ─────────────────────────────────────────
function RegistrationsPanel() {
  const { data: registrations = [], isLoading } = useAdminRegistrations();
  const [search, setSearch] = useState('');

  const filtered = registrations.filter((r: any) =>
    !search ||
    r.preferred_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.country?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-lg">Nuevos registros</h3>
          <p className="text-sm text-muted-foreground">
            Usuarios que se han registrado en NeumanCRM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {registrations.length} registros
          </Badge>
          <Badge variant="outline" className="text-sm text-green-600 border-green-200">
            {registrations.filter((r: any) => r.completed).length} completados
          </Badge>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, empresa..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>No hay registros aún</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Usuario</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>País</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Industria</TableHead>
                <TableHead>Primera meta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r.user_id} className="hover:bg-muted/20">
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{r.preferred_name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.whatsapp ? (
                      <a
                        href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-green-600 hover:underline"
                      >
                        {r.whatsapp}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{r.country ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{r.company_name ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{r.industry ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{r.first_goal ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={r.completed
                        ? 'text-xs text-green-700 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-300'
                        : 'text-xs text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'}
                    >
                      {r.completed ? '✅ Completo' : '⏳ En progreso'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {r.registered_at
                        ? format(new Date(r.registered_at), "d MMM yyyy, HH:mm", { locale: es })
                        : '—'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function OrganizationsTable({
  organizations,
  onApprove,
  onReject,
  onEdit,
  onAssignAdmin,
  onModules,
  isApproving,
  isRejecting,
  emptyMessage,
  emptyIcon: EmptyIcon,
  getSubClientsOf,
  showHierarchy = false,
}: {
  organizations: OrganizationWithAdmin[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (org: OrganizationWithAdmin) => void;
  onAssignAdmin: (org: OrganizationWithAdmin) => void;
  onModules: (org: OrganizationWithAdmin) => void;
  isApproving: boolean;
  isRejecting: boolean;
  emptyMessage: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  getSubClientsOf?: (parentId: string) => OrganizationWithAdmin[];
  showHierarchy?: boolean;
}) {
  if (organizations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <EmptyIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empresa</TableHead>
          <TableHead>Email Admin</TableHead>
          <TableHead>Usuarios</TableHead>
          <TableHead>Registrada</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((org) => (
          <OrganizationRow
            key={org.id}
            org={org}
            onApprove={() => onApprove(org.id)}
            onReject={() => onReject(org.id)}
            onEdit={() => onEdit(org)}
            onAssignAdmin={() => onAssignAdmin(org)}
            onModules={() => onModules(org)}
            isApproving={isApproving}
            isRejecting={isRejecting}
            subClients={showHierarchy && getSubClientsOf ? getSubClientsOf(org.id) : []}
          />
        ))}
      </TableBody>
    </Table>
  );
}
