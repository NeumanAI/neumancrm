import { useState } from 'react';
import { useAdvisors, useContactAdvisorHistory, useAssignAdvisor } from '@/hooks/useAdvisorAttribution';
import { useTeam } from '@/hooks/useTeam';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { UserCheck, ArrowRightLeft, ChevronDown, Clock, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  contactId: string;
  assignedAdvisorId?: string | null;
  captureAdvisorId?: string | null;
}

export function AdvisorAssignmentSection({ contactId, assignedAdvisorId, captureAdvisorId }: Props) {
  const { advisors } = useAdvisors();
  const { teamMembers } = useTeam();
  const { history, isLoading: historyLoading } = useContactAdvisorHistory(contactId);
  const { assignAdvisor } = useAssignAdvisor();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [reason, setReason] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);

  const currentAdvisor = teamMembers.find((m) => m.user_id === assignedAdvisorId);
  const captureAdvisor = teamMembers.find((m) => m.user_id === captureAdvisorId);

  const getInitials = (name: string | null | undefined) =>
    name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const handleAssign = () => {
    if (!selectedAdvisor) return;
    assignAdvisor.mutate(
      {
        contactId,
        newAdvisorId: selectedAdvisor,
        previousAdvisorId: assignedAdvisorId,
        reason,
      },
      {
        onSuccess: () => {
          setShowDialog(false);
          setSelectedAdvisor('');
          setReason('');
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          Asesor Comercial
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowDialog(true)}
          className="gap-1.5"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          {currentAdvisor ? 'Traspasar' : 'Asignar'}
        </Button>
      </div>

      {/* Current advisor */}
      {currentAdvisor ? (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentAdvisor.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{getInitials(currentAdvisor.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentAdvisor.full_name || currentAdvisor.email}</p>
            <p className="text-xs text-muted-foreground">{currentAdvisor.email}</p>
          </div>
          <Badge variant="secondary" className="text-[10px]">Actual</Badge>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed">
          <User className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Sin asesor asignado</p>
        </div>
      )}

      {/* Capture advisor (if different) */}
      {captureAdvisor && captureAdvisorId !== assignedAdvisorId && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Captura:</span>
          <span className="font-medium">{captureAdvisor.full_name || captureAdvisor.email}</span>
        </div>
      )}

      {/* History collapsible */}
      {history.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            <Clock className="h-3.5 w-3.5" />
            <span>Historial ({history.length})</span>
            <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="text-xs p-2 rounded bg-muted/30 space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {entry.previous_advisor_name || 'Sin asesor'} → {entry.new_advisor_name || '?'}
                  </span>
                  <span className="text-muted-foreground">
                    {format(parseISO(entry.created_at), 'dd MMM yyyy', { locale: es })}
                  </span>
                </div>
                {entry.reason && <p className="text-muted-foreground">{entry.reason}</p>}
                <p className="text-muted-foreground">Por: {entry.transferred_by_name || 'Sistema'}</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Assign dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentAdvisor ? 'Traspasar Asesor' : 'Asignar Asesor'}</DialogTitle>
            <DialogDescription>
              {currentAdvisor
                ? `Traspasar de ${currentAdvisor.full_name || currentAdvisor.email}`
                : 'Selecciona un asesor comercial'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asesor</Label>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar asesor" />
                </SelectTrigger>
                <SelectContent>
                  {advisors
                    .filter((a) => a.user_id !== assignedAdvisorId)
                    .map((a) => (
                      <SelectItem key={a.user_id} value={a.user_id}>
                        {a.full_name || a.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Razón del traspaso..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={!selectedAdvisor || assignAdvisor.isPending}>
              {assignAdvisor.isPending ? 'Asignando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
