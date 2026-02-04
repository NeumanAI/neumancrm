import { useNavigate } from 'react-router-dom';
import { Notification } from '@/types/integrations';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Mail, 
  Calendar, 
  TrendingUp, 
  UserPlus,
  Bell,
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotifications();

  const getIcon = () => {
    switch (notification.type) {
      case 'task_due':
        return <Calendar className="h-5 w-5 text-orange-500" />;
      case 'deal_update':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'new_contact':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'email_sync':
        return <Mail className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose?.();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification.mutateAsync(notification.id);
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: es,
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "text-sm line-clamp-1",
            !notification.is_read && "font-medium"
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {timeAgo}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
        onClick={handleDelete}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
