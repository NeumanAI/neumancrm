import { useState, useEffect, useMemo } from 'react';
import { useOpportunities, usePipeline } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useTeam } from '@/hooks/useTeam';
import { Opportunity, Stage } from '@/types/crm';
import { ContactType, CONTACT_TYPE_LABELS, CONTACT_TYPE_COLORS } from '@/lib/contactTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { TrendingUp, Plus, Building2, User, Calendar, DollarSign, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ConversationalForm } from '@/components/ai/ConversationalForm';
import { useActionTracking } from '@/hooks/useActionTracking';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { TeamMember } from '@/hooks/useTeam';

// Opportunity Card Component
function OpportunityCard({ 
  opportunity, 
  isDragging,
  assignedMember 
}: { 
  opportunity: Opportunity; 
  isDragging?: boolean;
  assignedMember?: TeamMember;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: opportunity.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card className={cn(
      'border shadow-card cursor-grab active:cursor-grabbing transition-all',
      isDragging && 'opacity-50 rotate-3 scale-105 shadow-lg'
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{opportunity.title}</h4>
          {assignedMember && (
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarImage src={assignedMember.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(assignedMember.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        
        <div className="text-xl font-bold text-primary">
          {formatCurrency(Number(opportunity.value))}
        </div>
        
        {opportunity.companies && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span className="truncate">{opportunity.companies.name}</span>
          </div>
        )}
        
        {opportunity.contacts && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">
              {opportunity.contacts.first_name} {opportunity.contacts.last_name}
            </span>
            {(opportunity.contacts as any)?.contact_type === 'comprador' && (
              <Badge variant="outline" className="text-[10px] bg-teal-100 text-teal-800 border-teal-200 ml-1">
                Comprador
              </Badge>
            )}
          </div>
        )}
        
        {opportunity.expected_close_date && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(parseISO(opportunity.expected_close_date), 'dd MMM', { locale: es })}</span>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Probabilidad</span>
            <Badge variant="secondary" className="text-xs">
              {opportunity.probability}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sortable Opportunity Card
function SortableOpportunityCard({ 
  opportunity,
  assignedMember 
}: { 
  opportunity: Opportunity;
  assignedMember?: TeamMember;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OpportunityCard opportunity={opportunity} isDragging={isDragging} assignedMember={assignedMember} />
    </div>
  );
}

// Stage Column Component
function StageColumn({ 
  stage, 
  opportunities, 
  onAddClick,
  teamMembers
}: { 
  stage: Stage; 
  opportunities: Opportunity[];
  onAddClick: (stageId: string) => void;
  teamMembers: TeamMember[];
}) {
  const totalValue = opportunities.reduce((sum, o) => sum + Number(o.value || 0), 0);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const getMemberForOpportunity = (opp: Opportunity) => {
    if (!opp.assigned_to) return undefined;
    return teamMembers.find(m => m.user_id === opp.assigned_to);
  };

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-muted/30 rounded-xl p-3 max-h-[calc(100vh-250px)]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {opportunities.length}
          </Badge>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {formatCurrency(totalValue)}
        </span>
      </div>

      {/* Opportunities */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
        <SortableContext
          items={opportunities.map(o => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map((opp) => (
            <SortableOpportunityCard 
              key={opp.id} 
              opportunity={opp} 
              assignedMember={getMemberForOpportunity(opp)}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Button */}
      <Button 
        variant="ghost" 
        className="w-full mt-3 border-2 border-dashed hover:border-primary/50"
        onClick={() => onAddClick(stage.id)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Añadir
      </Button>
    </div>
  );
}

export default function Pipeline() {
  const { opportunities, isLoading: oppsLoading, createOpportunity, updateOpportunity } = useOpportunities();
  const { pipeline, stages, isLoading: pipelineLoading, createPipeline } = usePipeline();
  const { companies } = useCompanies();
  const { contacts, convertContactType } = useContacts();
  const { teamMembers } = useTeam();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showNLI, setShowNLI] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [advisorFilter, setAdvisorFilter] = useState<string>('all');
  const { trackAction } = useActionTracking();
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    company_id: '',
    contact_id: '',
    expected_close_date: '',
    description: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  // Create pipeline if it doesn't exist
  useEffect(() => {
    if (!pipelineLoading && !pipeline) {
      createPipeline.mutate();
    }
  }, [pipelineLoading, pipeline]);

  const openCreateDialog = (stageId: string) => {
    setSelectedStageId(stageId);
    setFormData({
      title: '',
      value: '',
      company_id: '',
      contact_id: '',
      expected_close_date: '',
      description: '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('El título es requerido');
      return;
    }

    try {
      await createOpportunity.mutateAsync({
        title: formData.title,
        value: parseFloat(formData.value) || 0,
        company_id: formData.company_id || undefined,
        contact_id: formData.contact_id || undefined,
        pipeline_id: pipeline?.id,
        stage_id: selectedStageId,
        expected_close_date: formData.expected_close_date || undefined,
        description: formData.description || undefined,
      });
      setIsDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeOpp = opportunities.find(o => o.id === active.id);
    if (!activeOpp) return;

    // Check if dropped on a stage
    const targetStage = stages.find(s => s.id === over.id);
    if (targetStage && activeOpp.stage_id !== targetStage.id) {
      updateOpportunity.mutate({
        id: activeOpp.id,
        stage_id: targetStage.id,
        probability: targetStage.probability,
      });
      toast.success(`Movido a ${targetStage.name}`);

      // If moved to won stage and contact is prospecto, suggest conversion
      if (targetStage.is_closed_won && activeOpp.contact_id) {
        const contact = contacts.find(c => c.id === activeOpp.contact_id);
        if (contact && ((contact as any).contact_type || 'prospecto') === 'prospecto') {
          toast('¿Convertir contacto a Comprador?', {
            description: `${contact.first_name} ${contact.last_name} ganó un deal.`,
            action: {
              label: 'Convertir',
              onClick: () => convertContactType.mutate({
                contactId: contact.id,
                newType: 'comprador',
                reason: `Deal "${activeOpp.title}" ganado`,
              }),
            },
            duration: 10000,
          });
        }
      }
      return;
    }

    // Check if dropped on another opportunity
    const targetOpp = opportunities.find(o => o.id === over.id);
    if (targetOpp && activeOpp.stage_id !== targetOpp.stage_id) {
      updateOpportunity.mutate({
        id: activeOpp.id,
        stage_id: targetOpp.stage_id,
      });
    }
  };

  const activeOpportunity = activeId ? opportunities.find(o => o.id === activeId) : null;

  const isLoading = oppsLoading || pipelineLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const advisors = teamMembers.filter(m => m.is_active && ['admin', 'manager', 'sales_rep'].includes(m.role));

  const openOpportunities = useMemo(() => {
    let result = opportunities.filter(o => o.status === 'open');
    if (advisorFilter !== 'all') {
      result = result.filter(o => o.assigned_to === advisorFilter);
    }
    return result;
  }, [opportunities, advisorFilter]);

  // Calculate total pipeline value
  const totalValue = openOpportunities.reduce((sum, o) => sum + Number(o.value || 0), 0);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 h-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            {formatCurrency(totalValue)} total · {openOpportunities.length} oportunidades
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => stages[0] && openCreateDialog(stages[0].id)} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Oportunidad
          </Button>
          <Button
            onClick={() => setShowNLI(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Crear con IA
          </Button>
        </div>
      </div>

      {/* Advisor Filter */}
      {advisors.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
            <SelectTrigger className="w-56">
              <UserCheck className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por asesor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los asesores</SelectItem>
              {advisors.map(a => (
                <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || a.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Kanban Board */}
      {stages.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-8 w-8" />}
          title="Configurando pipeline..."
          description="Tu pipeline se está creando. Por favor espera un momento."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.filter(s => !s.is_closed_lost).map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                opportunities={openOpportunities.filter(o => o.stage_id === stage.id)}
                onAddClick={openCreateDialog}
                teamMembers={teamMembers}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOpportunity && (
              <OpportunityCard 
                opportunity={activeOpportunity} 
                isDragging 
                assignedMember={teamMembers.find(m => m.user_id === activeOpportunity.assigned_to)}
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Oportunidad</DialogTitle>
            <DialogDescription>
              Añade una nueva oportunidad a tu pipeline
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Proyecto de implementación"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="50000"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp_company">Empresa</Label>
              <Select
                value={formData.company_id}
                onValueChange={(value) => setFormData({ ...formData, company_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp_contact">Contacto</Label>
              <Select
                value={formData.contact_id}
                onValueChange={(value) => setFormData({ ...formData, contact_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un contacto" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Fecha esperada de cierre</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp_description">Descripción</Label>
              <Textarea
                id="opp_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalles de la oportunidad..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gradient-primary">
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* NLI Dialog */}
      <Dialog open={showNLI} onOpenChange={setShowNLI}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <ConversationalForm
            entity="opportunity"
            onComplete={async (data) => {
              const startTime = Date.now();
              try {
                await createOpportunity.mutateAsync({
                  title: data.title as string || 'Sin título',
                  value: parseFloat(String(data.value)) || 0,
                  pipeline_id: pipeline?.id,
                  stage_id: stages[0]?.id,
                  description: data.description as string || '',
                  expected_close_date: data.expected_close_date as string || undefined,
                });
                trackAction({
                  action_type: 'create',
                  entity_type: 'opportunity',
                  method: 'nli',
                  duration_ms: Date.now() - startTime,
                });
                setShowNLI(false);
                toast.success('Oportunidad creada con IA');
              } catch (error) {
                toast.error('Error al crear oportunidad');
              }
            }}
            onCancel={() => setShowNLI(false)}
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
