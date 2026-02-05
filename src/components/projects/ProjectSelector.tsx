import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import { Folder } from 'lucide-react';

interface ProjectSelectorProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProjectSelector({ 
  value, 
  onChange, 
  placeholder = 'Seleccionar proyecto',
  disabled = false
}: ProjectSelectorProps) {
  const { projects, isLoading } = useProjects({ status: 'active' });

  return (
    <Select 
      value={value || ''} 
      onValueChange={(val) => onChange(val || undefined)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Sin proyecto</SelectItem>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: project.color || '#3B82F6' }}
              />
              {project.name}
              {project.code && (
                <span className="text-muted-foreground text-xs">
                  ({project.code})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}