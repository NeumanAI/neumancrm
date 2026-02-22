import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  Target,
  UserPlus,
  MoreHorizontal,
  Trash2,
  Edit,
} from 'lucide-react';
import { useProject } from '@/hooks/useProjects';
import { useProjectMetrics } from '@/hooks/useProjectMetrics';
import { useProjectContacts, useContactProjects } from '@/hooks/useContactProjects';
import { AddContactToProjectDialog } from '@/components/projects/AddContactToProjectDialog';
import { statusLabels, statusColors, typeLabels, typeIcons } from '@/components/projects/ProjectCard';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactProjectStatus } from '@/types/crm';

const contactStatusLabels: Record<ContactProjectStatus, string> = {
  lead: 'Lead',
  qualified: 'Calificado',
  customer: 'Cliente',
  inactive: 'Inactivo',
};

const contactStatusColors: Record<ContactProjectStatus, string> = {
  lead: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  qualified: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  customer: 'bg-green-500/10 text-green-500 border-green-500/20',
  inactive: 'bg-muted text-muted-foreground border-muted',
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [addContactOpen, setAddContactOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: metrics, isLoading: metricsLoading } = useProjectMetrics(projectId);
  const { projectContacts, isLoading: contactsLoading } = useProjectContacts(projectId);
  const { removeFromProject } = useContactProjects();

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Segmento no encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/segmentos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Segmentos
        </Button>
      </div>
    );
  }

  const Icon = typeIcons[project.type];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/segmentos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div 
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${project.color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: project.color }} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              {project.code && (
                <Badge variant="outline">{project.code}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{typeLabels[project.type]}</Badge>
              <Badge 
                variant="outline" 
                className={cn(statusColors[project.status])}
              >
                {statusLabels[project.status]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold">{metrics?.total_contacts || 0}</p>
                <p className="text-xs text-muted-foreground">Contactos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold">{metrics?.total_companies || 0}</p>
                <p className="text-xs text-muted-foreground">Empresas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold">{metrics?.total_opportunities || 0}</p>
                <p className="text-xs text-muted-foreground">Oportunidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xl font-bold">{formatCurrency(metrics?.pipeline_value || 0)}</p>
                <p className="text-xs text-muted-foreground">Pipeline</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xl font-bold">{formatCurrency(metrics?.won_deals_value || 0)}</p>
                <p className="text-xs text-muted-foreground">Ganados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold">{metrics?.conversion_rate || 0}%</p>
                <p className="text-xs text-muted-foreground">Conversión</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contactos</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">
                Contactos del Proyecto ({projectContacts.length})
              </CardTitle>
              <Button size="sm" onClick={() => setAddContactOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar Contacto
              </Button>
            </CardHeader>
            <CardContent>
              {contactsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : projectContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay contactos en este proyecto</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => setAddContactOpen(true)}
                  >
                    Agregar primer contacto
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectContacts.map((cp) => {
                    const contact = cp.contacts as any;
                    if (!contact) return null;
                    const initials = `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase() || 'C';

                    return (
                      <div
                        key={cp.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/contacts/${contact.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {contact.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', contactStatusColors[cp.status])}
                          >
                            {contactStatusLabels[cp.status]}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromProject.mutate({
                                    contactId: contact.id,
                                    projectId: projectId!,
                                  });
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover del proyecto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información del Proyecto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Descripción</p>
                  <p>{project.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {project.location && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Ubicación</p>
                    <p>{project.location}</p>
                  </div>
                )}
                {project.budget && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Presupuesto</p>
                    <p>{formatCurrency(project.budget)}</p>
                  </div>
                )}
                {project.revenue_target && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Meta de Ingresos</p>
                    <p>{formatCurrency(project.revenue_target)}</p>
                  </div>
                )}
                {project.start_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Fecha de Inicio</p>
                    <p>{new Date(project.start_date).toLocaleDateString('es-MX')}</p>
                  </div>
                )}
                {project.end_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Fecha de Fin</p>
                    <p>{new Date(project.end_date).toLocaleDateString('es-MX')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Contact Dialog */}
      {projectId && (
        <AddContactToProjectDialog
          open={addContactOpen}
          onOpenChange={setAddContactOpen}
          projectId={projectId}
        />
      )}
    </div>
  );
}