import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckSquare, 
  Phone, 
  Mail, 
  Calendar, 
  StickyNote,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface ContactActivitiesProps {
  contactId: string;
}

const activityTypeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  task: { icon: CheckSquare, color: 'text-muted-foreground' },
  call: { icon: Phone, color: 'text-green-500' },
  email: { icon: Mail, color: 'text-blue-500' },
  meeting: { icon: Calendar, color: 'text-purple-500' },
  note: { icon: StickyNote, color: 'text-yellow-500' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-warning/20 text-warning',
  urgent: 'bg-destructive/20 text-destructive',
};

export function ContactActivities({ contactId }: ContactActivitiesProps) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['contact-activities', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contactId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data as Activity[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        icon={<CheckSquare className="h-8 w-8" />}
        title="Sin actividades"
        description="No hay actividades asignadas a este contacto."
      />
    );
  }

  const pendingActivities = activities.filter(a => !a.completed);
  const completedActivities = activities.filter(a => a.completed);

  return (
    <div className="space-y-6">
      {/* Pending activities */}
      {pendingActivities.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Pendientes ({pendingActivities.length})
          </h3>
          <div className="space-y-2">
            {pendingActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}

      {/* Completed activities */}
      {completedActivities.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Completadas ({completedActivities.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {completedActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const config = activityTypeConfig[activity.type] || activityTypeConfig.task;
  const Icon = config.icon;
  
  const dueDate = activity.due_date ? parseISO(activity.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !activity.completed && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
      isOverdue ? 'border-destructive/50 bg-destructive/5' : 'hover:bg-muted/50'
    }`}>
      <Checkbox checked={activity.completed} disabled className="mt-0.5" />
      
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className={`font-medium ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>
            {activity.title}
          </span>
          <Badge variant="outline" className={priorityColors[activity.priority]}>
            {activity.priority}
          </Badge>
        </div>
        
        {activity.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {activity.description}
          </p>
        )}
        
        {dueDate && (
          <div className="flex items-center gap-1 text-xs">
            {isOverdue && <AlertCircle className="h-3 w-3 text-destructive" />}
            <span className={`${isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-warning font-medium' : 'text-muted-foreground'}`}>
              {isOverdue ? 'Vencida: ' : isDueToday ? 'Hoy: ' : ''}
              {format(dueDate, "d 'de' MMM, HH:mm", { locale: es })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
