import { useState } from 'react';
import { TimelineEntry } from '@/types/crm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Phone, 
  Calendar, 
  StickyNote, 
  MessageCircle, 
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineEntryItemProps {
  entry: TimelineEntry;
}

const entryTypeConfig: Record<TimelineEntry['entry_type'], { icon: React.ElementType; color: string; label: string }> = {
  email: { icon: Mail, color: 'text-blue-500 bg-blue-500/10', label: 'Email' },
  call: { icon: Phone, color: 'text-green-500 bg-green-500/10', label: 'Llamada' },
  meeting: { icon: Calendar, color: 'text-purple-500 bg-purple-500/10', label: 'Reunión' },
  note: { icon: StickyNote, color: 'text-yellow-500 bg-yellow-500/10', label: 'Nota' },
  whatsapp: { icon: MessageCircle, color: 'text-green-600 bg-green-600/10', label: 'WhatsApp' },
  task: { icon: CheckSquare, color: 'text-muted-foreground bg-muted', label: 'Tarea' },
};

const sourceLabels: Record<string, string> = {
  gmail: 'Gmail',
  whatsapp: 'WhatsApp',
  manual: 'Manual',
  system: 'Sistema',
};

export function TimelineEntryItem({ entry }: TimelineEntryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = entryTypeConfig[entry.entry_type] || entryTypeConfig.note;
  const Icon = config.icon;

  const occurredAt = parseISO(entry.occurred_at);
  const timeAgo = formatDistanceToNow(occurredAt, { addSuffix: true, locale: es });
  const fullDate = format(occurredAt, "d 'de' MMMM 'a las' HH:mm", { locale: es });

  const hasBody = entry.body && entry.body.length > 0;
  const hasActionItems = entry.action_items && entry.action_items.length > 0;

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-5 top-10 bottom-0 w-px bg-border last:hidden" />
      
      {/* Icon */}
      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.color}`}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                {entry.subject || config.label}
              </span>
              {entry.source && (
                <Badge variant="outline" className="text-xs font-normal">
                  {sourceLabels[entry.source] || entry.source}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground" title={fullDate}>
              {timeAgo}
            </p>
          </div>
        </div>

        {/* Summary */}
        {entry.summary && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {entry.summary}
          </p>
        )}

        {/* Participants */}
        {entry.participants && entry.participants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.participants.map((p, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {p.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Expand/Collapse for body */}
        {(hasBody || hasActionItems) && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-3 w-3" />
                  Ocultar detalles
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-3 w-3" />
                  Ver detalles
                </>
              )}
            </Button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3">
                    {/* Body content */}
                    {hasBody && (
                      <div className="rounded-lg bg-muted/50 p-3 text-sm">
                        <p className="whitespace-pre-wrap">{entry.body}</p>
                      </div>
                    )}

                    {/* Action items */}
                    {hasActionItems && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Acciones
                        </p>
                        <ul className="space-y-1">
                          {entry.action_items!.map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                              <CheckSquare 
                                className={`h-4 w-4 ${item.completed ? 'text-success' : 'text-muted-foreground'}`} 
                              />
                              <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                                {item.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
