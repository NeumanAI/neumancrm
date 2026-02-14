import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarItem } from '@/hooks/useCalendar';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Video, CheckSquare, Target, Trash2, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CalendarItem | null;
  onDelete?: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunión', call: 'Llamada', demo: 'Demo',
  follow_up: 'Seguimiento', closing: 'Cierre', other: 'Otro',
};

export function EventDetailDialog({ open, onOpenChange, item, onDelete }: EventDetailDialogProps) {
  if (!item) return null;

  const isEvent = item.item_type === 'event';
  const isTask = item.item_type === 'task';
  const isGoal = item.item_type === 'goal';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <DialogTitle className="text-lg">{item.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type badge */}
          <div className="flex items-center gap-2">
            {isEvent && <Badge variant="secondary">{TYPE_LABELS[item.metadata?.event_type] || 'Evento'}</Badge>}
            {isTask && <Badge variant="outline" className="border-amber-500 text-amber-600"><CheckSquare className="h-3 w-3 mr-1" />Tarea</Badge>}
            {isGoal && <Badge variant="outline" className="border-emerald-500 text-emerald-600"><Target className="h-3 w-3 mr-1" />Meta</Badge>}
            {item.metadata?.synced_with_google && <Badge variant="outline">Google Calendar</Badge>}
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {item.all_day ? (
              <span>{format(parseISO(item.start_time), 'dd MMM yyyy', { locale: es })}</span>
            ) : (
              <span>
                {format(parseISO(item.start_time), 'dd MMM yyyy HH:mm', { locale: es })} - {format(parseISO(item.end_time), 'HH:mm', { locale: es })}
              </span>
            )}
          </div>

          {/* Location */}
          {isEvent && item.metadata?.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{item.metadata.location}</span>
            </div>
          )}

          {/* Meeting URL */}
          {isEvent && item.metadata?.meeting_url && (
            <div className="flex items-center gap-2 text-sm">
              <Video className="h-4 w-4 text-muted-foreground" />
              <a href={item.metadata.meeting_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Unirse a la reunión
              </a>
            </div>
          )}

          {/* Description */}
          {item.metadata?.description && (
            <p className="text-sm text-muted-foreground">{item.metadata.description}</p>
          )}

          {/* Task priority */}
          {isTask && item.metadata?.priority && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Prioridad:</span>
              <Badge variant={item.metadata.priority === 'urgent' ? 'destructive' : 'outline'}>
                {item.metadata.priority}
              </Badge>
            </div>
          )}

          {/* Goal progress */}
          {isGoal && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso</span>
                <span className="font-medium">{item.metadata?.progress_percentage || 0}%</span>
              </div>
              <Progress value={Number(item.metadata?.progress_percentage) || 0} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Actual: {Number(item.metadata?.current_value || 0).toLocaleString()}</span>
                <span>Meta: {Number(item.metadata?.target_value || 0).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {isEvent && onDelete && (
            <Button variant="destructive" size="sm" onClick={() => { onDelete(item.id); onOpenChange(false); }}>
              <Trash2 className="h-4 w-4 mr-1" /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
