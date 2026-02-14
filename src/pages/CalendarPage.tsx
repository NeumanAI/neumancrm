import { useState } from 'react';
import { useCalendar, CalendarItem } from '@/hooks/useCalendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';
import { GoogleCalendarSettings } from '@/components/calendar/GoogleCalendarSettings';
import { 
  ChevronLeft, ChevronRight, Plus, Settings, RefreshCw,
  CalendarDays, CheckSquare, Target
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function CalendarPage() {
  const {
    currentDate, goToNextMonth, goToPrevMonth, goToToday,
    filters, setFilters, calendarItems, isLoading, deleteEvent, googleSync,
  } = useCalendar();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Build calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getItemsForDay = (day: Date) =>
    calendarItems.filter(item => {
      const start = parseISO(item.start_time);
      const end = parseISO(item.end_time);
      return isSameDay(start, day) || (start <= day && end >= day);
    });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync' },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      toast.success('Sincronización completada');
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setCreateOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-8 bg-muted/30 min-h-screen space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Calendario</h2>
          <p className="text-muted-foreground text-sm mt-1">Agenda comercial unificada</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filters */}
          <Button
            variant={filters.events ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters(f => ({ ...f, events: !f.events }))}
          >
            <CalendarDays className="h-4 w-4 mr-1" /> Eventos
          </Button>
          <Button
            variant={filters.tasks ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters(f => ({ ...f, tasks: !f.tasks }))}
          >
            <CheckSquare className="h-4 w-4 mr-1" /> Tareas
          </Button>
          <Button
            variant={filters.goals ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilters(f => ({ ...f, goals: !f.goals }))}
          >
            <Target className="h-4 w-4 mr-1" /> Metas
          </Button>
          <div className="w-px h-6 bg-border" />
          {googleSync?.is_connected && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} /> Sync
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={() => { setSelectedDate(new Date()); setCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h3>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>Hoy</Button>
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-xl" />
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground bg-muted/50">
                {day}
              </div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const dayItems = getItemsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[100px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/30 transition-colors",
                    !inMonth && "bg-muted/20"
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                    today && "bg-primary text-primary-foreground",
                    !inMonth && "text-muted-foreground/50"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => (
                      <div
                        key={item.id}
                        onClick={e => { e.stopPropagation(); setDetailItem(item); }}
                        className="text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: item.color + '20', color: item.color, borderLeft: `2px solid ${item.color}` }}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-muted-foreground px-1.5">
                        +{dayItems.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} defaultDate={selectedDate} />
      <EventDetailDialog
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
        item={detailItem}
        onDelete={(id) => deleteEvent.mutate(id)}
      />
      <GoogleCalendarSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        syncConfig={googleSync}
      />
    </motion.div>
  );
}
