import { useState } from 'react';
import { useClinicalNotes, ClinicalNote } from '@/hooks/useClinicalNotes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Mic, PenLine, Search, ChevronDown, ChevronUp,
  Plus, CheckCircle2, Clock, Stethoscope,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClinicalNoteRecorder } from './ClinicalNoteRecorder';

interface Props {
  contactId: string;
  contactName?: string;
}

const INPUT_MODE_ICONS: Record<string, React.ReactNode> = {
  recording: <Mic className="h-3 w-3" />,
  dictation: <PenLine className="h-3 w-3" />,
  text: <FileText className="h-3 w-3" />,
};

const INPUT_MODE_LABELS: Record<string, string> = {
  recording: 'Grabación',
  dictation: 'Dictado',
  text: 'Texto',
};

export function ClinicalNoteViewer({ contactId, contactName }: Props) {
  const { data: notes, isLoading, refetch } = useClinicalNotes(contactId);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);

  const filtered = (notes || []).filter((n) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      n.subjective?.toLowerCase().includes(q) ||
      n.objective?.toLowerCase().includes(q) ||
      n.analysis?.toLowerCase().includes(q) ||
      n.plan?.toLowerCase().includes(q) ||
      n.full_note?.toLowerCase().includes(q) ||
      n.raw_transcript?.toLowerCase().includes(q)
    );
  });

  if (showRecorder) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setShowRecorder(false)}>
          ← Volver a notas
        </Button>
        <ClinicalNoteRecorder
          contactId={contactId}
          contactName={contactName}
          onSaved={() => {
            setShowRecorder(false);
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en notas clínicas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowRecorder(true)} className="gap-2">
          <Plus className="h-4 w-4" />Nueva Nota Clínica
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Stethoscope className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No hay notas clínicas</p>
          <p className="text-sm text-muted-foreground mt-1">Crea la primera nota clínica de este paciente</p>
          <Button onClick={() => setShowRecorder(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />Nueva Nota Clínica
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isExpanded={expandedId === note.id}
              onToggle={() => setExpandedId(expandedId === note.id ? null : note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, isExpanded, onToggle }: { note: ClinicalNote; isExpanded: boolean; onToggle: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={onToggle}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium">
                {format(new Date(note.consultation_date), "d MMM yyyy, HH:mm", { locale: es })}
              </span>
              <Badge variant={note.is_signed ? 'default' : 'secondary'} className="text-[10px] gap-1">
                {note.is_signed ? <><CheckCircle2 className="h-3 w-3" />Firmada</> : <><Clock className="h-3 w-3" />Borrador</>}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                {INPUT_MODE_ICONS[note.input_mode]}
                {INPUT_MODE_LABELS[note.input_mode]}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase">
                {note.template_used}
              </Badge>
            </div>
            {!isExpanded && (
              <p className="text-sm text-muted-foreground truncate">
                {note.template_used === 'soap'
                  ? note.subjective?.slice(0, 120) || 'Sin contenido'
                  : note.full_note?.slice(0, 120) || 'Sin contenido'}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            {note.template_used === 'soap' ? (
              <>
                {note.subjective && <SoapSection label="S — Subjetivo" content={note.subjective} color="border-l-blue-500" />}
                {note.objective && <SoapSection label="O — Objetivo" content={note.objective} color="border-l-green-500" />}
                {note.analysis && <SoapSection label="A — Análisis" content={note.analysis} color="border-l-amber-500" />}
                {note.plan && <SoapSection label="P — Plan" content={note.plan} color="border-l-purple-500" />}
              </>
            ) : (
              <div className="text-sm whitespace-pre-wrap">{note.full_note}</div>
            )}
            {note.raw_transcript && (
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Ver transcripción original</summary>
                <p className="mt-2 text-muted-foreground whitespace-pre-wrap border rounded p-3 bg-muted/30">{note.raw_transcript}</p>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SoapSection({ label, content, color }: { label: string; content: string; color: string }) {
  return (
    <div className={`border-l-4 ${color} pl-3`}>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{content}</p>
    </div>
  );
}
