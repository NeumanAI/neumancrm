import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResellerAdmin, SubClient } from '@/hooks/useResellerAdmin';
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
  Users, 
  X,
  ArrowLeft,
  Plus,
  Store
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CreateSubClientDialog } from '@/components/reseller/CreateSubClientDialog';

function SubClientRow({ 
  subClient, 
  onApprove, 
  onRevoke,
  isApproving,
  isRevoking,
}: { 
  subClient: SubClient;
  onApprove: () => void;
  onRevoke: () => void;
  isApproving: boolean;
  isRevoking: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{subClient.name}</p>
            <p className="text-xs text-muted-foreground">
              {subClient.admin_email || 'Sin admin asignado'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{subClient.member_count}</span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {format(new Date(subClient.created_at), "d MMM yyyy", { locale: es })}
        </span>
      </TableCell>
      <TableCell>
        {subClient.is_approved ? (
          <Badge variant="default" className="bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            Activo
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
          {subClient.is_approved ? (
            <Button 
              size="sm" 
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? (
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
                  Activar
                </>
              )}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function SubClientsTable({
  subClients,
  onApprove,
  onRevoke,
  isApproving,
  isRevoking,
  emptyMessage,
}: {
  subClients: SubClient[];
  onApprove: (id: string) => void;
  onRevoke: (id: string) => void;
  isApproving: boolean;
  isRevoking: boolean;
  emptyMessage: string;
}) {
  if (subClients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Empresa</TableHead>
          <TableHead>Usuarios</TableHead>
          <TableHead>Creada</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subClients.map((subClient) => (
          <SubClientRow
            key={subClient.id}
            subClient={subClient}
            onApprove={() => onApprove(subClient.id)}
            onRevoke={() => onRevoke(subClient.id)}
            isApproving={isApproving}
            isRevoking={isRevoking}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export default function ResellerAdmin() {
  const navigate = useNavigate();
  const { 
    isResellerAdmin, 
    isLoading, 
    resellerOrg,
    subClients,
    pendingSubClients,
    approvedSubClients,
    createSubClient,
    approveSubClient,
    revokeSubClient,
    refetchSubClients,
  } = useResellerAdmin();

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Redirect if not reseller admin
  useEffect(() => {
    if (!isLoading && !isResellerAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isResellerAdmin, isLoading, navigate]);

  const handleCreateSubClient = async (data: { name: string; admin_email: string; admin_name?: string; is_approved?: boolean }) => {
    await createSubClient.mutateAsync(data);
    setShowCreateDialog(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isResellerAdmin) {
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
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden">
                {resellerOrg?.logo_url ? (
                  <img src={resellerOrg.logo_url} alt={resellerOrg.name} className="h-full w-full object-contain" />
                ) : (
                  <Store className="h-5 w-5 text-primary-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">Mis Clientes</h1>
                <p className="text-sm text-muted-foreground">{resellerOrg?.name}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchSubClients()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button 
              size="sm"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo cliente
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendientes</CardDescription>
              <CardTitle className="text-3xl text-amber-600">
                {pendingSubClients.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Activos</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {approvedSubClients.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total clientes</CardDescription>
              <CardTitle className="text-3xl">
                {subClients.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>
              Gestiona los clientes de tu organización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Todos
                  <Badge variant="secondary" className="ml-1">
                    {subClients.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  <Check className="h-4 w-4" />
                  Activos
                  <Badge variant="secondary" className="ml-1">
                    {approvedSubClients.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Pendientes
                  {pendingSubClients.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {pendingSubClients.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <SubClientsTable 
                  subClients={subClients}
                  onApprove={(id) => approveSubClient.mutate(id)}
                  onRevoke={(id) => revokeSubClient.mutate(id)}
                  isApproving={approveSubClient.isPending}
                  isRevoking={revokeSubClient.isPending}
                  emptyMessage="No tienes clientes registrados"
                />
              </TabsContent>

              <TabsContent value="active">
                <SubClientsTable 
                  subClients={approvedSubClients}
                  onApprove={(id) => approveSubClient.mutate(id)}
                  onRevoke={(id) => revokeSubClient.mutate(id)}
                  isApproving={approveSubClient.isPending}
                  isRevoking={revokeSubClient.isPending}
                  emptyMessage="No tienes clientes activos"
                />
              </TabsContent>

              <TabsContent value="pending">
                <SubClientsTable 
                  subClients={pendingSubClients}
                  onApprove={(id) => approveSubClient.mutate(id)}
                  onRevoke={(id) => revokeSubClient.mutate(id)}
                  isApproving={approveSubClient.isPending}
                  isRevoking={revokeSubClient.isPending}
                  emptyMessage="No tienes clientes pendientes"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Create Sub-Client Dialog */}
      <CreateSubClientDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateSubClient}
        isCreating={createSubClient.isPending}
      />
    </div>
  );
}
