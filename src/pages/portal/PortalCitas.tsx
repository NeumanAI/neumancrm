import { useOutletContext } from 'react-router-dom';
import { usePortalAppointments, type PortalSession } from '@/hooks/useClientPortal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarDays, MapPin, Video, Clock } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PortalCitas() {
  const session = useOutletContext<PortalSession>();
  const { data: appointments = [], isLoading } = usePortalAppointments(session.contact_id, session.organization_id);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (!appointments.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <p className="font-medium">No tienes citas próximas</p>
        <p className="text-sm text-muted-foreground">Cuando tu asesor agende una cita, aparecerá aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Mis Citas</h2>

      <div className="space-y-3">
        {appointments.map(apt => (
          <Card key={apt.id}>
            <CardContent className="py-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{apt.title}</h3>
                {(isToday(new Date(apt.start_time)) || isTomorrow(new Date(apt.start_time))) && (
                  <Badge variant={isToday(new Date(apt.start_time)) ? 'default' : 'secondary'}>
                    {isToday(new Date(apt.start_time)) ? 'Hoy' : 'Mañana'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(apt.start_time), "EEEE d 'de' MMMM", { locale: es })} ·{' '}
                  {format(new Date(apt.start_time), 'h:mm a')} – {format(new Date(apt.end_time), 'h:mm a')}
                </span>
              </div>
              {apt.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{apt.location}</span>
                </div>
              )}
              {apt.meeting_url && (
                <a href={apt.meeting_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <Video className="h-3.5 w-3.5" />
                  Unirse a la reunión virtual
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
