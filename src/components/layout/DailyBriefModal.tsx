import { useEffect, useState } from 'react';
import { useDailyBrief } from '@/hooks/useDailyBrief';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Calendar,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DAILY_BRIEF_KEY = 'crm_daily_brief_last_seen';

function shouldShowBrief(): boolean {
  const lastSeen = localStorage.getItem(DAILY_BRIEF_KEY);
  if (!lastSeen) return true;
  
  const today = format(new Date(), 'yyyy-MM-dd');
  return lastSeen !== today;
}

function markBriefAsSeen() {
  const today = format(new Date(), 'yyyy-MM-dd');
  localStorage.setItem(DAILY_BRIEF_KEY, today);
}

export function DailyBriefModal() {
  const [open, setOpen] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(false);
  
  const { data: brief, isLoading, error } = useDailyBrief(shouldFetch);

  useEffect(() => {
    // Check if we should show the brief (first visit of the day)
    const timer = setTimeout(() => {
      if (shouldShowBrief()) {
        setShouldFetch(true);
        setOpen(true);
      }
    }, 1500); // Small delay after login

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setOpen(false);
    markBriefAsSeen();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-destructive border-destructive';
      case 'high': return 'text-warning border-warning';
      default: return 'text-muted-foreground border-muted-foreground/50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {brief?.greeting || 'Buenos días'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>No se pudo cargar el resumen</p>
            <Button variant="ghost" size="sm" onClick={handleClose} className="mt-2">
              Cerrar
            </Button>
          </div>
        ) : brief ? (
          <div className="space-y-6 py-4">
            {/* AI Summary */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm leading-relaxed">{brief.ai_summary}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-destructive">
                  {brief.overdue_tasks.length}
                </p>
                <p className="text-xs text-muted-foreground">Vencidas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">
                  {brief.today_tasks.length}
                </p>
                <p className="text-xs text-muted-foreground">Para Hoy</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-600">
                  {brief.new_interactions}
                </p>
                <p className="text-xs text-muted-foreground">Nuevas</p>
              </div>
            </div>

            {/* Overdue Tasks */}
            {brief.overdue_tasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-destructive" />
                  <h4 className="font-medium text-sm">Tareas Vencidas</h4>
                </div>
                <div className="space-y-2">
                  {brief.overdue_tasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                      </div>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Tasks */}
            {brief.today_tasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Para Hoy</h4>
                </div>
                <div className="space-y-2">
                  {brief.today_tasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                      </div>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deals Alert */}
            {brief.deals_alert.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h4 className="font-medium text-sm">Deals sin Actividad</h4>
                </div>
                <div className="space-y-2">
                  {brief.deals_alert.slice(0, 2).map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-warning/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.days_inactive} días sin contacto
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(deal.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            {brief.suggested_actions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-sm">Acciones Sugeridas</h4>
                </div>
                <ul className="space-y-2">
                  {brief.suggested_actions.map((action, index) => (
                    <li 
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button asChild variant="default" className="flex-1">
                <Link to="/tasks" onClick={handleClose}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Ir a Tareas
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/pipeline" onClick={handleClose}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Ver Pipeline
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
