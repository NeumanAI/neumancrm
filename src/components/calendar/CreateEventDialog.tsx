import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCalendar } from '@/hooks/useCalendar';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
}

const EVENT_TYPES = [
  { value: 'meeting', label: 'Reunión' },
  { value: 'call', label: 'Llamada' },
  { value: 'demo', label: 'Demo' },
  { value: 'follow_up', label: 'Seguimiento' },
  { value: 'closing', label: 'Cierre' },
  { value: 'other', label: 'Otro' },
];

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4',
];

export function CreateEventDialog({ open, onOpenChange, defaultDate }: CreateEventDialogProps) {
  const { createEvent } = useCalendar();
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(defaultDate ? defaultDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const handleSubmit = () => {
    if (!title.trim()) return;
    const start = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
    const end = allDay ? `${startDate}T23:59:59` : `${startDate}T${endTime}:00`;

    createEvent.mutate({
      title,
      description: description || undefined,
      event_type: eventType,
      start_time: start,
      end_time: end,
      all_day: allDay,
      location: location || undefined,
      meeting_url: meetingUrl || undefined,
      color,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setTitle('');
        setDescription('');
        setLocation('');
        setMeetingUrl('');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre del evento" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-1 mt-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={allDay} onCheckedChange={setAllDay} />
            <Label>Todo el día</Label>
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hora inicio</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>Hora fin</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <Label>Ubicación</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Oficina, dirección..." />
          </div>
          <div>
            <Label>URL de reunión</Label>
            <Input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/..." />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createEvent.isPending}>
            {createEvent.isPending ? 'Creando...' : 'Crear Evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
