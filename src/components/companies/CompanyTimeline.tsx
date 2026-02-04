import { useState } from 'react';
import { useTimelineEntries } from '@/hooks/useTimelineEntries';
import { TimelineEntryItem } from '@/components/contacts/TimelineEntryItem';
import { TimelineEntry } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Clock, 
  Plus, 
  Filter,
  Mail,
  Phone,
  Calendar,
  StickyNote,
  MessageCircle,
  CheckSquare
} from 'lucide-react';

interface CompanyTimelineProps {
  companyId: string;
}

const filterOptions: { value: TimelineEntry['entry_type'] | 'all'; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Todos', icon: Clock },
  { value: 'email', label: 'Emails', icon: Mail },
  { value: 'call', label: 'Llamadas', icon: Phone },
  { value: 'meeting', label: 'Reuniones', icon: Calendar },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'note', label: 'Notas', icon: StickyNote },
  { value: 'task', label: 'Tareas', icon: CheckSquare },
];

export function CompanyTimeline({ companyId }: CompanyTimelineProps) {
  const { entries, isLoading, createEntry } = useTimelineEntries({ companyId });
  const [filter, setFilter] = useState<TimelineEntry['entry_type'] | 'all'>('all');
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredEntries = filter === 'all' 
    ? entries 
    : entries.filter(e => e.entry_type === filter);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      await createEntry.mutateAsync({
        company_id: companyId,
        entry_type: 'note',
        subject: 'Nota',
        body: noteContent,
        source: 'manual',
        occurred_at: new Date().toISOString(),
      });
      setNoteContent('');
      setIsAddNoteOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {filterOptions.map((option) => (
            <Badge
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => setFilter(option.value)}
            >
              <option.icon className="mr-1 h-3 w-3" />
              {option.label}
            </Badge>
          ))}
        </div>
        <Button size="sm" onClick={() => setIsAddNoteOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar nota
        </Button>
      </div>

      {/* Timeline */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-8 w-8" />}
          title="Sin interacciones"
          description={
            filter === 'all'
              ? "No hay interacciones registradas con esta empresa aún."
              : `No hay ${filterOptions.find(f => f.value === filter)?.label.toLowerCase()} registrados.`
          }
          actionLabel="Agregar nota"
          onAction={() => setIsAddNoteOpen(true)}
        />
      ) : (
        <div className="relative">
          {filteredEntries.map((entry) => (
            <TimelineEntryItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Add Note Dialog */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar nota</DialogTitle>
            <DialogDescription>
              Añade una nota al historial de esta empresa
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Escribe tu nota aquí..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddNote} 
              disabled={!noteContent.trim() || isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar nota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
