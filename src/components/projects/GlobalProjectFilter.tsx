import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects, useActiveProject } from '@/hooks/useProjects';
import { Folder } from 'lucide-react';

export function GlobalProjectFilter() {
  const { projects, isLoading } = useProjects({ status: 'active' });
  const { activeProjectId, setActiveProject } = useActiveProject();

  if (isLoading || projects.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Folder className="h-4 w-4 text-muted-foreground" />
      <Select 
        value={activeProjectId || 'all'} 
        onValueChange={(value) => setActiveProject(value === 'all' ? null : value)}
      >
        <SelectTrigger className="w-[180px] h-9 bg-muted/50 border-0">
          <SelectValue placeholder="Todos los segmentos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los segmentos</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                />
                {project.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}