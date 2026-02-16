import { lazy, Suspense } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useActivities } from '@/hooks/useActivities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, TrendingUp, Target, Calendar, ArrowRight } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
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
  LineChart,
  Line
} from 'recharts';

import { MetricCard } from '@/components/dashboard/MetricCard';
import { TodayAgenda } from '@/components/calendar/TodayAgenda';
import { AnalysisCard } from '@/components/dashboard/AnalysisCard';
import { TrafficSourceChart } from '@/components/dashboard/TrafficSourceChart';
import { MiniAreaChart, MiniLineChart } from '@/components/dashboard/MiniCharts';
import {
  revenueChartData,
  clientsChartData,
  conversionChartData,
  campaignChartData,
  growthPatternData,
  trafficSourceData,
  productDemandData,
} from '@/lib/mockDashboardData';

// Lazy load AI component
const AIInsightsCard = lazy(() => 
  import('@/components/dashboard/AIInsightsCard').then(module => ({ 
    default: module.AIInsightsCard 
  }))
);

export default function Dashboard() {
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
      transition: { staggerChildren: 0.08 }
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
          title="Ingresos Totales"
          value={formatCurrency(totalPipelineValue || 2864679)}
          trend="up"
          trendValue="+2.4%"
          color="orange"
          icon={<DollarSign className="h-5 w-5" />}
          miniChart={<MiniAreaChart data={revenueChartData} color="orange" />}
        />
        <MetricCard
          title="Clientes Activos"
          value={contacts.length > 0 ? contacts.length.toLocaleString() : companiesCount.toLocaleString()}
          trend="up"
          trendValue="+3.5%"
          color="blue"
          icon={<Users className="h-5 w-5" />}
          miniChart={<MiniAreaChart data={clientsChartData} color="blue" />}
        />
        <MetricCard
          title="Tasa de Conversión"
          value="2.4%"
          trend="down"
          trendValue="-1.3%"
          color="purple"
          icon={<TrendingUp className="h-5 w-5" />}
          miniChart={<MiniLineChart data={conversionChartData} color="red" />}
        />
        <MetricCard
          title="Resultado Campañas"
          value="$5,320"
          trend="up"
          trendValue="+6.7%"
          color="green"
          icon={<Target className="h-5 w-5" />}
          miniChart={<MiniAreaChart data={campaignChartData} color="green" />}
        />
      </motion.div>

      {/* Analysis Charts Grid */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalysisCard title="Patrón de Crecimiento" description="Cambios diarios de ingresos">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthPatternData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24 95% 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(24 95% 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
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
                  dataKey="ingresos" 
                  stroke="hsl(24 95% 53%)" 
                  strokeWidth={2}
                  fill="url(#colorIngresos)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </AnalysisCard>

        <AnalysisCard title="Fuentes de Tráfico" description="Canales con más engagement">
          <div className="h-64 flex items-center">
            <TrafficSourceChart data={trafficSourceData} />
          </div>
        </AnalysisCard>

        <AnalysisCard title="Demanda de Producto" description="Tendencias de productos">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productDemandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="producto_a" stroke="hsl(24 95% 53%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="producto_b" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="producto_c" stroke="hsl(263 70% 50%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnalysisCard>

        <AnalysisCard title="Rendimiento Campañas" description="Performance de marketing">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthPatternData}>
                <defs>
                  <linearGradient id="colorCampanas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(263 70% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(263 70% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
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
                  dataKey="gastos" 
                  stroke="hsl(263 70% 50%)" 
                  strokeWidth={2}
                  fill="url(#colorCampanas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
        <Card className="border-0 shadow-sm bg-card">
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