import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTodayAgenda } from '@/hooks/useCalendar';
import { CalendarDays, ArrowRight, Clock, CheckSquare, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export function TodayAgenda() {
  const { todayItems, isLoading } = useTodayAgenda();

  const getIcon = (type: string) => {
    switch (type) {
      case 'event': return <CalendarDays className="h-4 w-4" />;
      case 'task': return <CheckSquare className="h-4 w-4" />;
      case 'goal': return <Target className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-card">
        <CardHeader className="pb-2"><Skeleton className="h-6 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Agenda Hoy
        </CardTitle>
        <Link to="/calendar" className="text-sm text-primary hover:underline flex items-center gap-1">
          Ver calendario <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {todayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay eventos para hoy
            </p>
          ) : (
            todayItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: item.color }} />
                <div className="text-muted-foreground">{getIcon(item.item_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.all_day ? 'Todo el día' : format(parseISO(item.start_time), 'HH:mm', { locale: es })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
