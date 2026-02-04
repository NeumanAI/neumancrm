import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCheck, Bell, Loader2 } from 'lucide-react';

interface NotificationCenterProps {
  onClose?: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAllAsRead, isLoading } = useNotifications();

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {unreadCount} nuevas
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Marcar todas
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <ScrollArea className="max-h-[400px]">
        {notifications.length > 0 ? (
          <div className="divide-y">
            {notifications.slice(0, 10).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={onClose}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No tienes notificaciones
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 10 && (
        <div className="p-3 border-t text-center">
          <Button variant="ghost" size="sm" className="text-primary">
            Ver todas las notificaciones
          </Button>
        </div>
      )}
    </div>
  );
}
