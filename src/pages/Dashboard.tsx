import { lazy, Suspense, useMemo } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useActivities } from '@/hooks/useActivities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, TrendingUp, Target, Calendar, ArrowRight, BarChart3, PieChart, LineChart as LineChartIcon, Activity } from 'lucide-react';
import { format, isToday, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
  BarChart,
  Bar,
  Cell,
} from 'recharts';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { TodayAgenda } from '@/components/calendar/TodayAgenda';
import { AnalysisCard } from '@/components/dashboard/AnalysisCard';
import { TrafficSourceChart } from '@/components/dashboard/TrafficSourceChart';
import { MiniAreaChart, MiniLineChart } from '@/components/dashboard/MiniCharts';

// Lazy load AI component with retry for stale chunk errors
const lazyRetry = (fn: () => Promise<any>, retries = 2): Promise<any> =>
  fn().catch((err: Error) => {
    if (retries > 0 && err.message.includes('Failed to fetch dynamically imported module')) {
      return new Promise(r => setTimeout(r, 1000)).then(() => lazyRetry(fn, retries - 1));
    }
    window.location.reload();
    throw err;
  });

const AIInsightsCard = lazy(() => 
  lazyRetry(() => import('@/components/dashboard/AIInsightsCard').then(module => ({ 
    default: module.AIInsightsCard 
  })))
);

const STAGE_COLORS = [
  'hsl(217 91% 60%)',
  'hsl(263 70% 50%)',
  'hsl(24 95% 53%)',
  'hsl(142 76% 36%)',
  'hsl(38 92% 50%)',
  'hsl(0 84% 60%)',
];

const SOURCE_COLORS: Record<string, string> = {
  manual: 'hsl(217 91% 60%)',
  whatsapp: 'hsl(142 76% 36%)',
  import: 'hsl(24 95% 53%)',
  email: 'hsl(263 70% 50%)',
  webchat: 'hsl(38 92% 50%)',
  otro: 'hsl(0 84% 60%)',
};

function EmptyChartState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm text-center max-w-48">{message}</p>
    </div>
  );
}

export default function Dashboard() {
  const { contacts } = useContacts({ limit: 200 });
  const { companiesCount } = useCompanies({ countOnly: true });
  const { opportunities } = useOpportunities();
  const { activities, toggleComplete } = useActivities({ limit: 15, onlyPending: true });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  // ── Metric calculations ──────────────────────────────────────────────────────
  const openOpportunities = useMemo(() => opportunities.filter(o => o.status === 'open'), [opportunities]);
  const wonOpportunities = useMemo(() => opportunities.filter(o => o.status === 'won'), [opportunities]);

  const totalPipelineValue = useMemo(
    () => openOpportunities.reduce((sum, o) => sum + Number(o.value || 0), 0),
    [openOpportunities]
  );

  const totalActiveClients = contacts.length + companiesCount;

  const conversionRate = opportunities.length > 0
    ? ((wonOpportunities.length / opportunities.length) * 100).toFixed(1)
    : '0.0';

  // Won value this month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const wonThisMonth = useMemo(
    () => wonOpportunities
      .filter(o => o.closed_at && new Date(o.closed_at) >= monthStart)
      .reduce((sum, o) => sum + Number(o.value || 0), 0),
    [wonOpportunities, monthStart]
  );

  // ── Mini chart data from real opportunities ──────────────────────────────────
  const revenueChartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    return months.map(m => ({
      value: openOpportunities
        .filter(o => {
          if (!o.created_at) return false;
          const d = new Date(o.created_at);
          return d >= startOfMonth(m) && d <= endOfMonth(m);
        })
        .reduce((sum, o) => sum + Number(o.value || 0), 0)
    }));
  }, [openOpportunities]);

  const clientsChartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    let cumulative = 0;
    return months.map(m => {
      const count = contacts.filter(c => {
        if (!c.created_at) return false;
        const d = new Date(c.created_at);
        return d >= startOfMonth(m) && d <= endOfMonth(m);
      }).length;
      cumulative += count;
      return { value: cumulative };
    });
  }, [contacts]);

  const conversionChartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    return months.map(m => {
      const monthOpps = opportunities.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d >= startOfMonth(m) && d <= endOfMonth(m);
      });
      const monthWon = monthOpps.filter(o => o.status === 'won').length;
      return { value: monthOpps.length > 0 ? (monthWon / monthOpps.length) * 100 : 0 };
    });
  }, [opportunities]);

  const wonChartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    return months.map(m => ({
      value: wonOpportunities
        .filter(o => {
          if (!o.closed_at) return false;
          const d = new Date(o.closed_at);
          return d >= startOfMonth(m) && d <= endOfMonth(m);
        })
        .reduce((sum, o) => sum + Number(o.value || 0), 0)
    }));
  }, [wonOpportunities]);

  // ── Analysis chart data ──────────────────────────────────────────────────────

  // Chart 1: Pipeline por Etapa
  const pipelineByStageData = useMemo(() => {
    const stageMap: Record<string, { name: string; value: number }> = {};
    openOpportunities.forEach(o => {
      const stageName = (o.stages as any)?.name || 'Sin etapa';
      const stageId = o.stage_id || 'none';
      if (!stageMap[stageId]) stageMap[stageId] = { name: stageName, value: 0 };
      stageMap[stageId].value += Number(o.value || 0);
    });
    return Object.values(stageMap).sort((a, b) => b.value - a.value);
  }, [openOpportunities]);

  // Chart 2: Fuentes de Contactos
  const contactSourceData = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    contacts.forEach(c => {
      const source = c.source || 'manual';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });
    return Object.entries(sourceMap)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: SOURCE_COLORS[name.toLowerCase()] || 'hsl(217 91% 60%)',
      }))
      .sort((a, b) => b.value - a.value);
  }, [contacts]);

  // Chart 3: Oportunidades por Mes
  const oppsByMonthData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    return months.map(m => ({
      month: format(m, 'MMM', { locale: es }),
      abiertas: openOpportunities.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d >= startOfMonth(m) && d <= endOfMonth(m);
      }).length,
      ganadas: wonOpportunities.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d >= startOfMonth(m) && d <= endOfMonth(m);
      }).length,
    }));
  }, [openOpportunities, wonOpportunities]);

  // Chart 4: Pipeline Activo vs Ganado
  const activeVsWonData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
    return months.map(m => ({
      month: format(m, 'MMM', { locale: es }),
      activo: openOpportunities
        .filter(o => {
          if (!o.created_at) return false;
          const d = new Date(o.created_at);
          return d >= startOfMonth(m) && d <= endOfMonth(m);
        })
        .reduce((sum, o) => sum + Number(o.value || 0), 0),
      ganado: wonOpportunities
        .filter(o => {
          if (!o.closed_at) return false;
          const d = new Date(o.closed_at);
          return d >= startOfMonth(m) && d <= endOfMonth(m);
        })
        .reduce((sum, o) => sum + Number(o.value || 0), 0),
    }));
  }, [openOpportunities, wonOpportunities]);

  const hasOpportunities = opportunities.length > 0;
  const hasContacts = contacts.length > 0;

  // ── Tasks ────────────────────────────────────────────────────────────────────
  const pendingTasks = activities.filter(a => !a.completed);
  const todayTasks = pendingTasks.filter(a => a.due_date && isToday(parseISO(a.due_date)));

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="bg-muted/30 min-h-screen space-y-6 md:space-y-8"
    >
      {/* Title and Filters */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Resumen de Ventas y Negocio</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Monitorea el rendimiento con insights en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="this-year">
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">Esta Semana</SelectItem>
              <SelectItem value="this-month">Este Mes</SelectItem>
              <SelectItem value="this-year">Este Año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Metric Cards Grid */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Pipeline Activo"
          value={formatCurrency(totalPipelineValue)}
          trend={totalPipelineValue > 0 ? 'up' : 'neutral'}
          trendValue={totalPipelineValue > 0 ? `${openOpportunities.length} oport.` : 'Sin datos'}
          color="orange"
          icon={<DollarSign className="h-5 w-5" />}
          miniChart={<MiniAreaChart data={revenueChartData} color="orange" />}
        />
        <MetricCard
          title="Clientes Activos"
          value={totalActiveClients.toLocaleString()}
          trend={totalActiveClients > 0 ? 'up' : 'neutral'}
          trendValue={totalActiveClients > 0 ? `${contacts.length} contactos` : 'Sin datos'}
          color="blue"
          icon={<Users className="h-5 w-5" />}
          miniChart={<MiniAreaChart data={clientsChartData} color="blue" />}
        />
        <MetricCard
          title="Tasa de Conversión"
          value={`${conversionRate}%`}
          trend={Number(conversionRate) > 0 ? 'up' : 'neutral'}
          trendValue={wonOpportunities.length > 0 ? `${wonOpportunities.length} ganadas` : 'Sin datos'}
          color="purple"
          icon={<TrendingUp className="h-5 w-5" />}
          miniChart={<MiniLineChart data={conversionChartData} color="purple" />}
        />
        <MetricCard
          title="Ganado este Mes"
          value={formatCurrency(wonThisMonth)}
          trend={wonThisMonth > 0 ? 'up' : 'neutral'}
          trendValue={wonThisMonth > 0 ? 'Este mes' : 'Sin datos'}
          color="green"
          icon={<Target className="h-5 w-5" />}
          miniChart={<MiniAreaChart data={wonChartData} color="green" />}
        />
      </motion.div>

      {/* Analysis Charts Grid */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Pipeline por Etapa */}
        <AnalysisCard title="Pipeline por Etapa" description="Valor total de oportunidades abiertas por etapa">
          {pipelineByStageData.length === 0 ? (
            <EmptyChartState
              icon={<BarChart3 className="h-6 w-6" />}
              message="Sin datos. Agrega oportunidades al pipeline para ver su distribución."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineByStageData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pipelineByStageData.map((_, index) => (
                      <Cell key={index} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalysisCard>

        {/* Chart 2: Fuentes de Contactos */}
        <AnalysisCard title="Fuentes de Contactos" description="Distribución de contactos por origen">
          {contactSourceData.length === 0 ? (
            <EmptyChartState
              icon={<PieChart className="h-6 w-6" />}
              message="Sin contactos registrados. Importa o crea contactos para ver sus fuentes."
            />
          ) : (
            <div className="h-64 flex items-center">
              <TrafficSourceChart data={contactSourceData} />
            </div>
          )}
        </AnalysisCard>

        {/* Chart 3: Oportunidades por Mes */}
        <AnalysisCard title="Oportunidades por Mes" description="Nuevas oportunidades en los últimos 6 meses">
          {!hasOpportunities ? (
            <EmptyChartState
              icon={<LineChartIcon className="h-6 w-6" />}
              message="Sin oportunidades. Crea deals en el pipeline para ver su evolución mensual."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={oppsByMonthData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="abiertas" name="Abiertas" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ganadas" name="Ganadas" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalysisCard>

        {/* Chart 4: Pipeline Activo vs Ganado */}
        <AnalysisCard title="Activo vs Ganado" description="Valor de pipeline abierto vs cerrado por mes">
          {!hasOpportunities ? (
            <EmptyChartState
              icon={<Activity className="h-6 w-6" />}
              message="Sin oportunidades. Agrega deals al pipeline para comparar activo vs ganado."
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeVsWonData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActivo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGanado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), '']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="activo" name="Activo" stroke="hsl(217 91% 60%)" strokeWidth={2} fill="url(#colorActivo)" />
                  <Area type="monotone" dataKey="ganado" name="Ganado" stroke="hsl(142 76% 36%)" strokeWidth={2} fill="url(#colorGanado)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </AnalysisCard>
      </motion.div>

      {/* AI Insights Card - Featured */}
      <motion.div variants={item}>
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
          <AIInsightsCard />
        </Suspense>
      </motion.div>

      {/* Bottom Section - Tasks, Agenda and Deals */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Today's Agenda */}
        <TodayAgenda />
        {/* Today's Tasks */}
        <Card className="border-0 shadow-sm bg-card">
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
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Deals Próximos</CardTitle>
            <Link to="/pipeline" className="text-sm text-primary hover:underline flex items-center gap-1">
              Ver pipeline <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {openOpportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay oportunidades abiertas
                </p>
              ) : (
                openOpportunities.slice(0, 5).map((opp) => (
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
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sin contactos recientes
                </p>
              ) : (
                contacts.slice(0, 5).map((contact) => (
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
                      {format(parseISO(contact.created_at!), 'dd MMM', { locale: es })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
