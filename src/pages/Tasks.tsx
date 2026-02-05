import { useState } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { Activity } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CheckSquare, Plus, Calendar, Trash2, Phone, Mail, Users, FileText } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isThisWeek, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const typeIcons = {
  task: CheckSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
};

const typeLabels = {
  task: 'Tarea',
  call: 'Llamada',
  email: 'Email',
  meeting: 'Reunión',
  note: 'Nota',
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export default function Tasks() {
  const { activities, isLoading, createActivity, toggleComplete, deleteActivity } = useActivities();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [formData, setFormData] = useState({
    title: '',
    type: 'task' as Activity['type'],
    priority: 'medium' as Activity['priority'],
    due_date: '',
    description: '',
  });

  const filterActivities = (filter: string) => {
    switch (filter) {
      case 'pending':
        return activities.filter(a => !a.completed);
      case 'today':
        return activities.filter(a => !a.completed && a.due_date && isToday(parseISO(a.due_date)));
      case 'week':
        return activities.filter(a => !a.completed && a.due_date && isThisWeek(parseISO(a.due_date)));
      case 'completed':
        return activities.filter(a => a.completed);
      default:
        return activities;
    }
  };

  const openCreateDialog = () => {
    setFormData({
      title: '',
      type: 'task',
      priority: 'medium',
      due_date: '',
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
      await createActivity.mutateAsync({
        title: formData.title,
        type: formData.type,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        description: formData.description || undefined,
      });
      setIsDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggle = (id: string, completed: boolean) => {
    toggleComplete.mutate({ id, completed });
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta tarea?')) {
      await deleteActivity.mutateAsync(id);
    }
  };

  const getDueDateLabel = (dueDate: string) => {
    const date = parseISO(dueDate);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Mañana';
    if (isPast(date)) return 'Vencido';
    return format(date, 'dd MMM', { locale: es });
  };

  const getDueDateColor = (dueDate: string, completed: boolean) => {
    if (completed) return 'text-muted-foreground';
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-warning';
    return 'text-muted-foreground';
  };

  const filteredActivities = filterActivities(activeTab);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground">Gestiona tus actividades y pendientes</p>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pendientes
            <Badge variant="secondary" className="ml-2">
              {activities.filter(a => !a.completed).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="week">Esta Semana</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredActivities.length === 0 ? (
            <EmptyState
              icon={<CheckSquare className="h-8 w-8" />}
              title={activeTab === 'completed' ? 'No hay tareas completadas' : 'No hay tareas pendientes'}
              description={activeTab === 'completed' 
                ? 'Las tareas que completes aparecerán aquí'
                : 'Crea una nueva tarea para empezar a organizar tu trabajo'
              }
              actionLabel={activeTab !== 'completed' ? 'Nueva Tarea' : undefined}
              onAction={activeTab !== 'completed' ? openCreateDialog : undefined}
            />
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const Icon = typeIcons[activity.type];
                return (
                  <Card key={activity.id} className={cn(
                    'border-0 shadow-card transition-all',
                    activity.completed && 'opacity-60'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={activity.completed}
                          onCheckedChange={(checked) => handleToggle(activity.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={cn(
                                'font-medium',
                                activity.completed && 'line-through text-muted-foreground'
                              )}>
                                {activity.title}
                              </p>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {activity.description}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(activity.id)}
                              className="text-muted-foreground hover:text-destructive flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <Badge variant="outline" className="gap-1">
                              <Icon className="h-3 w-3" />
                              {typeLabels[activity.type]}
                            </Badge>
                            
                            <Badge className={priorityColors[activity.priority]}>
                              {activity.priority === 'urgent' ? 'Urgente' :
                               activity.priority === 'high' ? 'Alta' :
                               activity.priority === 'medium' ? 'Media' : 'Baja'}
                            </Badge>
                            
                            {activity.due_date && (
                              <span className={cn(
                                'flex items-center gap-1 text-sm',
                                getDueDateColor(activity.due_date, activity.completed)
                              )}>
                                <Calendar className="h-3.5 w-3.5" />
                                {getDueDateLabel(activity.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Tarea</DialogTitle>
            <DialogDescription>
              Crea una nueva tarea o actividad
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task_title">Título *</Label>
              <Input
                id="task_title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Llamar a cliente..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task_type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: Activity['type']) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tarea</SelectItem>
                    <SelectItem value="call">Llamada</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Reunión</SelectItem>
                    <SelectItem value="note">Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task_priority">Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: Activity['priority']) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_due_date">Fecha límite</Label>
              <Input
                id="task_due_date"
                type="date"
                value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_description">Descripción</Label>
              <Textarea
                id="task_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalles de la tarea..."
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
    </motion.div>
  );
}
