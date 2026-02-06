import { lazy, Suspense } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useActivities } from '@/hooks/useActivities';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, TrendingUp, CheckSquare, Calendar, ArrowRight } from 'lucide-react';
import { forwardRef } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Lazy load del componente de AI para no bloquear el render inicial
const AIInsightsCard = lazy(() => 
  import('@/components/dashboard/AIInsightsCard').then(module => ({ 
    default: module.AIInsightsCard 
  }))
);

export default function Dashboard() {
  // Usar versiones limitadas de los hooks para el dashboard
  const { contacts } = useContacts({ limit: 10 });
  const { companiesCount } = useCompanies({ countOnly: true });
  const { opportunities } = useOpportunities({ limit: 10 });
  const { activities, toggleComplete } = useActivities({ limit: 15, onlyPending: true });

  // Calculate stats
  const totalPipelineValue = opportunities
    .filter(o => o.status === 'open')
    .reduce((sum, o) => sum + Number(o.value || 0), 0);

  const pendingTasks = activities.filter(a => !a.completed);
  const todayTasks = pendingTasks.filter(a => a.due_date && isToday(parseISO(a.due_date)));

  // Mock data for charts
  const pipelineData = [
    { month: 'Ago', value: 120000 },
    { month: 'Sep', value: 180000 },
    { month: 'Oct', value: 220000 },
    { month: 'Nov', value: 280000 },
    { month: 'Dic', value: 350000 },
    { month: 'Ene', value: totalPipelineValue || 450000 },
  ];

  const stageDistribution = [
    { name: 'Lead', value: 30, color: '#94A3B8' },
    { name: 'Calificado', value: 25, color: '#3B82F6' },
    { name: 'Propuesta', value: 20, color: '#F59E0B' },
    { name: 'Negociación', value: 15, color: '#EC4899' },
    { name: 'Ganado', value: 10, color: '#10B981' },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu actividad comercial</p>
        </div>
      </div>

      {/* AI Insights - Lazy loaded */}
      <motion.div variants={item}>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <AIInsightsCard />
        </Suspense>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Contactos"
          value={contacts.length}
          change={12}
          changeLabel="este mes"
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Empresas"
          value={companiesCount}
          change={5}
          changeLabel="este mes"
          icon={<Building2 className="h-6 w-6" />}
        />
        <StatCard
          title="Pipeline"
          value={formatCurrency(totalPipelineValue)}
          change={23}
          changeLabel="vs mes pasado"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatCard
          title="Tareas Pendientes"
          value={pendingTasks.length}
          icon={<CheckSquare className="h-6 w-6" />}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={item} className="grid gap-6 md:grid-cols-2">
        {/* Pipeline Chart */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Pipeline (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pipelineData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stage Distribution */}
        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Distribución por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Porcentaje']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {stageDistribution.map((stage) => (
                <div key={stage.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stage.color }} 
                  />
                  <span className="text-sm text-muted-foreground">{stage.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Section */}
      <motion.div variants={item} className="grid gap-6 md:grid-cols-3">
        {/* Today's Tasks */}
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Tareas de Hoy</CardTitle>
            <Link to="/tasks" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay tareas para hoy
                </p>
              ) : (
                todayTasks.slice(0, 5).map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) => 
                        toggleComplete.mutate({ id: task.id, completed: checked as boolean })
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={
                            task.priority === 'urgent' ? 'border-destructive text-destructive' :
                            task.priority === 'high' ? 'border-warning text-warning' :
                            'border-muted-foreground/50'
                          }
                        >
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deals */}
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Deals Próximos</CardTitle>
            <Link to="/pipeline" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunities.filter(o => o.status === 'open').length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay oportunidades abiertas
                </p>
              ) : (
                opportunities
                  .filter(o => o.status === 'open')
                  .slice(0, 5)
                  .map((opp) => (
                    <div 
                      key={opp.id} 
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{opp.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {opp.companies?.name || 'Sin empresa'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(Number(opp.value))}</p>
                        {opp.expected_close_date && (
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(opp.expected_close_date), 'dd MMM', { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contacts.slice(0, 5).map((contact) => (
                <div 
                  key={contact.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {contact.first_name?.[0]}{contact.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.companies?.name || contact.email}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {format(parseISO(contact.created_at), 'dd MMM', { locale: es })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
