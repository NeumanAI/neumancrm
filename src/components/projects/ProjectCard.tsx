import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Folder, 
  Building2, 
  HardHat, 
  Briefcase, 
  Users2, 
  Tag, 
  Package, 
  MapPin,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Project, ProjectType, ProjectStatus } from '@/types/crm';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

const typeIcons: Record<ProjectType, typeof Folder> = {
  project: Folder,
  real_estate: Building2,
  construction: HardHat,
  business_unit: Briefcase,
  department: Users2,
  brand: Tag,
  product_line: Package,
  location: MapPin,
  other: Folder,
};

const typeLabels: Record<ProjectType, string> = {
  project: 'Proyecto',
  real_estate: 'Inmobiliario',
  construction: 'Construcción',
  business_unit: 'Unidad de Negocio',
  department: 'Departamento',
  brand: 'Marca',
  product_line: 'Línea de Producto',
  location: 'Ubicación',
  other: 'Otro',
};

const statusColors: Record<ProjectStatus, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  inactive: 'bg-muted text-muted-foreground border-muted',
  completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusLabels: Record<ProjectStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();
  const Icon = typeIcons[project.type] || Folder;

  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4"
      style={{ borderLeftColor: project.color || '#3B82F6' }}
      onClick={() => navigate(`/segmentos/${project.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${project.color}20` || '#3B82F620' }}
            >
              <Icon 
                className="h-5 w-5" 
                style={{ color: project.color || '#3B82F6' }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-foreground line-clamp-1">
                {project.name}
              </h3>
              {project.code && (
                <p className="text-xs text-muted-foreground">{project.code}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                navigate(`/segmentos/${project.id}`);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {typeLabels[project.type]}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn('text-xs', statusColors[project.status])}
          >
            {statusLabels[project.status]}
          </Badge>
        </div>
        {(project.location || project.city) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {project.location || project.city}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { typeLabels, statusLabels, statusColors, typeIcons };