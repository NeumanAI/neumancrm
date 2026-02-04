import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useActivityFeed, ActivityFeedItem } from '@/hooks/useActivityFeed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  ArrowRightLeft, 
  MessageSquare,
  Users,
  Building2,
  TrendingUp
} from 'lucide-react';

interface ActivityFeedListProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

const actionIcons: Record<string, React.ReactNode> = {
  created: <Plus className="h-4 w-4 text-green-500" />,
  updated: <Edit className="h-4 w-4 text-blue-500" />,
  deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  assigned: <UserPlus className="h-4 w-4 text-purple-500" />,
  stage_changed: <ArrowRightLeft className="h-4 w-4 text-orange-500" />,
  commented: <MessageSquare className="h-4 w-4 text-cyan-500" />,
};

const entityIcons: Record<string, React.ReactNode> = {
  contacts: <Users className="h-4 w-4" />,
  companies: <Building2 className="h-4 w-4" />,
  opportunities: <TrendingUp className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  created: 'creó',
  updated: 'actualizó',
  deleted: 'eliminó',
  assigned: 'asignó',
  stage_changed: 'cambió etapa de',
  commented: 'comentó en',
};

const entityLabels: Record<string, string> = {
  contacts: 'contacto',
  companies: 'empresa',
  opportunities: 'oportunidad',
  activities: 'tarea',
};

export function ActivityFeedList({ entityType, entityId, limit = 20 }: ActivityFeedListProps) {
  const { activities, isLoading } = useActivityFeed({ entityType, entityId, limit });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No hay actividad reciente</p>
      </div>
    );
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} getInitials={getInitials} />
      ))}
    </div>
  );
}

function ActivityItem({ 
  activity, 
  getInitials 
}: { 
  activity: ActivityFeedItem; 
  getInitials: (name: string | null) => string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="h-8 w-8">
        <AvatarImage src={activity.user_avatar || undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(activity.user_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {activity.user_name || 'Usuario'}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground text-sm">
            {actionIcons[activity.action]}
            {actionLabels[activity.action] || activity.action}
          </span>
          <span className="flex items-center gap-1 text-sm">
            {entityIcons[activity.entity_type]}
            {entityLabels[activity.entity_type] || activity.entity_type}
          </span>
          {activity.entity_name && (
            <span className="font-medium text-sm text-primary truncate max-w-[150px]">
              "{activity.entity_name}"
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(activity.created_at), { 
            addSuffix: true, 
            locale: es 
          })}
        </p>

        {/* Show what changed for updates */}
        {activity.action === 'updated' && activity.new_values && (
          <div className="mt-2 text-xs text-muted-foreground">
            {Object.entries(activity.new_values).slice(0, 2).map(([key, value]) => (
              <span key={key} className="mr-2">
                <span className="text-foreground">{key}:</span> {String(value)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
