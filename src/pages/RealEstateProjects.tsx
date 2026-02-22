import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, Search, MapPin, Home, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useRealEstateProjects, RealEstateProject } from '@/hooks/useRealEstateProjects';
import { CreateRealEstateProjectDialog } from '@/components/realestate/CreateRealEstateProjectDialog';

const statusLabels: Record<string, string> = {
  planning: 'Planeación',
  presale: 'Preventa',
  construction: 'Construcción',
  delivery: 'Entrega',
  completed: 'Completado',
};

const statusColors: Record<string, string> = {
  planning: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  presale: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  construction: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  delivery: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const formatCurrency = (value: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 0 }).format(value);

export default function RealEstateProjects() {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { projects, isLoading } = useRealEstateProjects({ status: statusFilter });

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = projects.reduce((s, p) => s + (p.total_units || 0), 0);
  const soldUnits = projects.reduce((s, p) => s + (p.sold_units || 0), 0);
  const availableUnits = projects.reduce((s, p) => s + (p.available_units || 0), 0);
  const activeCount = projects.filter(p => ['presale', 'construction'].includes(p.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proyectos Inmobiliarios</h1>
          <p className="text-muted-foreground">Gestiona tus desarrollos y unidades</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Home className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{totalUnits}</p>
                <p className="text-xs text-muted-foreground">Total Unidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{soldUnits}</p>
                <p className="text-xs text-muted-foreground">Vendidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><TrendingUp className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-2xl font-bold">{availableUnits}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proyectos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay proyectos inmobiliarios</h3>
            <p className="text-muted-foreground mb-4">Crea tu primer proyecto para empezar</p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Crear Proyecto</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={() => navigate(`/proyectos/${project.id}`)} />
          ))}
        </div>
      )}

      <CreateRealEstateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: RealEstateProject; onClick: () => void }) {
  const progressPercent = project.total_units > 0
    ? Math.round((project.sold_units / project.total_units) * 100)
    : 0;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      {project.cover_image_url && (
        <div className="h-40 overflow-hidden rounded-t-lg">
          <img src={project.cover_image_url} alt={project.name} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className={project.cover_image_url ? 'pt-4' : 'pt-6'}>
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">{project.name}</h3>
              {project.city && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {project.city}{project.state ? `, ${project.state}` : ''}
                </p>
              )}
            </div>
            <Badge variant="outline" className={statusColors[project.status] || ''}>
              {statusLabels[project.status] || project.status}
            </Badge>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{project.sold_units} vendidas de {project.total_units}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Construction progress */}
          {project.construction_progress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Avance de obra</span>
                <span>{project.construction_progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${project.construction_progress}%` }} />
              </div>
            </div>
          )}

          {/* Prices */}
          {(project.price_from || project.price_to) && (
            <p className="text-sm font-medium">
              {project.price_from && project.price_to
                ? `${formatCurrency(project.price_from, project.currency)} - ${formatCurrency(project.price_to, project.currency)}`
                : project.price_from
                  ? `Desde ${formatCurrency(project.price_from, project.currency)}`
                  : `Hasta ${formatCurrency(project.price_to!, project.currency)}`
              }
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
