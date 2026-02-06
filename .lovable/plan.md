
# Plan: Rediseno del Dashboard AI-Native Premium

## Resumen del Objetivo

Transformar el Dashboard del CRM en una experiencia premium estilo Nexo Co, donde la IA sea el protagonista absoluto de la interfaz, con:
- Saludo personalizado segun hora del dia
- Cards de metricas con mini-charts integrados
- Seccion destacada de AI Insights con gradientes y diseno premium
- Layout limpio y moderno con paleta naranja/purpura/azul

---

## Estructura del Nuevo Dashboard

```text
+---------------------------------------------------------------+
|  HEADER: Saludo personalizado + Busqueda global + Avatar      |
+---------------------------------------------------------------+
|                                                               |
|  TITULO: "Resumen de Ventas y Negocio"  [Filtro] [+ Widget]  |
|                                                               |
|  +----------+ +----------+ +----------+ +----------+         |
|  | Ingresos | | Clientes | | Pipeline | | Campanas |         |
|  | $2.8M    | | 5,477    | | 2.4%     | | $5,320   |         |
|  | [chart]  | | [chart]  | | [chart]  | | [chart]  |         |
|  +----------+ +----------+ +----------+ +----------+         |
|                                                               |
|  +------------------------+ +------------------------+        |
|  | Patron de Crecimiento  | | Fuentes de Trafico     |        |
|  | [Area Chart naranja]   | | [Progress bars]        |        |
|  +------------------------+ +------------------------+        |
|  +------------------------+ +------------------------+        |
|  | Demanda de Producto    | | Rendimiento Campanas   |        |
|  | [Line Chart]           | | [Area Chart]           |        |
|  +------------------------+ +------------------------+        |
|                                                               |
|  +----------------------------------------------------------+|
|  | AI INSIGHTS DESTACADO (gradiente purpura/azul)           ||
|  | [Deals en Riesgo] [Oportunidades Hot] [Proximas Acciones]||
|  | [Recomendaciones de IA con botones de accion]            ||
|  +----------------------------------------------------------+|
|                                                               |
+---------------------------------------------------------------+
```

---

## Archivos a Crear

| Archivo | Proposito |
|---------|-----------|
| `src/components/dashboard/MetricCard.tsx` | Card de metrica premium con mini-chart integrado |
| `src/components/dashboard/AnalysisCard.tsx` | Card contenedor para graficos de analisis |
| `src/components/dashboard/MiniCharts.tsx` | Componentes MiniAreaChart y MiniLineChart |
| `src/components/dashboard/TrafficSourceChart.tsx` | Grafico de barras horizontales para fuentes de trafico |
| `src/lib/mockDashboardData.ts` | Datos de ejemplo para testing visual |

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/layout/Header.tsx` | Saludo personalizado con hora del dia + quick insight de IA |
| `src/pages/Dashboard.tsx` | Layout completo nuevo con grid de metricas, graficos y AI Insights |
| `src/components/dashboard/AIInsightsCard.tsx` | Rediseno premium con gradiente purpura, estado expandible, botones de accion |
| `src/index.css` | Nuevas variables CSS para colores metric-orange, metric-purple, metric-blue |

---

## Seccion Tecnica

### 1. MetricCard - Nuevo Componente

```typescript
// src/components/dashboard/MetricCard.tsx
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  miniChart?: React.ReactNode;
  color?: 'orange' | 'blue' | 'green' | 'red';
}

export function MetricCard({ title, value, subtitle, trend, trendValue, miniChart, color = 'orange' }: MetricCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow border-0 shadow-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <TrendBadge trend={trend} value={trendValue} />
      </div>
      {miniChart && (
        <div className="h-16 -mx-2 mt-2">
          {miniChart}
        </div>
      )}
    </Card>
  );
}
```

### 2. Header - Saludo Personalizado

```typescript
// Agregar a src/components/layout/Header.tsx
const getGreeting = () => {
  const hour = new Date().getHours();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 
                   user?.email?.split('@')[0] || 'Usuario';
  
  if (hour < 12) return `Buenos dias, ${userName}`;
  if (hour < 18) return `Buenas tardes, ${userName}`;
  return `Buenas noches, ${userName}`;
};

// En el render del Header:
<div className="flex items-center justify-between px-6 py-4 bg-card/95 backdrop-blur border-b">
  <div>
    <h1 className="text-2xl font-semibold">{getGreeting()}</h1>
    <p className="text-sm text-muted-foreground mt-1">
      Tu asistente IA esta listo para ayudarte
    </p>
  </div>
  
  <div className="flex-1 max-w-xl mx-8">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Buscar contactos, empresas, deals... (Ctrl+K)"
        className="pl-10 pr-4"
      />
    </div>
  </div>
  
  {/* Avatar y notificaciones */}
</div>
```

### 3. MiniCharts - Graficos Pequenos

```typescript
// src/components/dashboard/MiniCharts.tsx
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from 'recharts';

export function MiniAreaChart({ data, color = 'orange' }: { data: any[], color?: string }) {
  const colorMap = {
    orange: '#f97316',
    blue: '#3b82f6',
    green: '#22c55e',
    red: '#ef4444',
    purple: '#9333ea'
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`mini-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colorMap[color]} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={colorMap[color]} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={colorMap[color]} 
          strokeWidth={2}
          fill={`url(#mini-gradient-${color})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### 4. AIInsightsCard - Rediseno Premium

```typescript
// Mejoras en src/components/dashboard/AIInsightsCard.tsx
<Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden">
  {/* Decorativo */}
  <div className="absolute top-0 right-0 w-64 h-64 bg-purple-300 rounded-full blur-3xl opacity-20" />
  
  <CardContent className="p-8 relative z-10">
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-600 rounded-xl">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Insights Inteligentes de IA</h3>
          <p className="text-sm text-muted-foreground">
            Analisis automatico de tu pipeline y recomendaciones proactivas
          </p>
        </div>
      </div>
      
      <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Ver menos' : 'Ver mas'}
        <ChevronDown className={cn("h-4 w-4 ml-2 transition-transform", isExpanded && "rotate-180")} />
      </Button>
    </div>

    {/* Grid de 3 columnas con Deals en Riesgo, Oportunidades Hot, Proximas Acciones */}
    <div className="grid grid-cols-3 gap-4">
      <InsightBox color="red" icon={AlertTriangle} title="Deals en Riesgo" count={3} value="$77K en riesgo" />
      <InsightBox color="orange" icon={Flame} title="Oportunidades Hot" count={5} value="$164K potencial" />
      <InsightBox color="green" icon={CheckCircle} title="Proximas Acciones" count={8} value="acciones recomendadas" />
    </div>

    {/* Seccion expandible con recomendaciones detalladas */}
    {isExpanded && (
      <div className="mt-6 space-y-4">
        {/* Lista de recomendaciones con botones de accion */}
      </div>
    )}

    {/* CTA para chat IA */}
    <div className="flex items-center justify-between pt-4 border-t border-purple-200 mt-6">
      <p className="text-sm text-muted-foreground">Quieres analisis mas profundo?</p>
      <Button className="bg-purple-600 hover:bg-purple-700 text-white">
        <MessageSquare className="h-4 w-4 mr-2" />
        Preguntale a la IA
      </Button>
    </div>
  </CardContent>
</Card>
```

### 5. Dashboard.tsx - Nuevo Layout Completo

```typescript
// Estructura principal del nuevo Dashboard
<div className="p-8 bg-muted/30 min-h-screen space-y-8">
  {/* Titulo y filtros */}
  <div className="flex items-center justify-between">
    <div>
      <h2 className="text-2xl font-semibold">Resumen de Ventas y Negocio</h2>
      <p className="text-muted-foreground text-sm mt-1">
        Monitorea el rendimiento con insights en tiempo real
      </p>
    </div>
    
    <div className="flex items-center gap-3">
      <Select defaultValue="this-year">
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this-week">Esta Semana</SelectItem>
          <SelectItem value="this-month">Este Mes</SelectItem>
          <SelectItem value="this-year">Este Ano</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>

  {/* Grid de 4 MetricCards */}
  <div className="grid grid-cols-4 gap-6">
    <MetricCard title="Ingresos Totales" value="$2,864,679" trend="up" trendValue="+2.4%" miniChart={<MiniAreaChart data={revenueData} color="orange" />} />
    <MetricCard title="Clientes Activos" value="5,477" trend="up" trendValue="+3.5%" color="blue" />
    <MetricCard title="Tasa de Conversion" value="2.4%" trend="down" trendValue="-1.3%" miniChart={<MiniLineChart data={conversionData} color="red" />} />
    <MetricCard title="Resultado Campanas" value="$5,320" trend="up" trendValue="+6.7%" miniChart={<MiniAreaChart data={campaignData} color="orange" />} />
  </div>

  {/* Grid de 4 AnalysisCards (2x2) */}
  <div className="grid grid-cols-2 gap-6">
    <AnalysisCard title="Patron de Crecimiento" description="Cambios diarios de ingresos" chart={<RevenueAreaChart />} />
    <AnalysisCard title="Fuentes de Trafico" description="Canales con mas engagement" chart={<TrafficSourceChart />} />
    <AnalysisCard title="Demanda de Producto" description="Tendencias de productos" chart={<ProductDemandChart />} />
    <AnalysisCard title="Rendimiento Campanas" description="Performance de marketing" chart={<CampaignPerformanceChart />} />
  </div>

  {/* AI Insights Card destacado */}
  <AIInsightsCard />

  {/* Seccion de Tareas y Deals (ya existe, mantener pero estilizar) */}
  <div className="grid grid-cols-3 gap-6">
    {/* Tareas de Hoy, Deals Proximos, Actividad Reciente */}
  </div>
</div>
```

---

## Paleta de Colores

| Variable | Valor | Uso |
|----------|-------|-----|
| `--metric-orange` | `#f97316` | Ingresos, campanas, tendencias positivas |
| `--metric-purple` | `#9333ea` | AI Insights, premium features |
| `--metric-blue` | `#3b82f6` | Clientes, datos, informacion |
| `--metric-green` | `#22c55e` | Exitos, acciones completadas |
| `--metric-red` | `#ef4444` | Alertas, riesgos, tendencias negativas |

---

## Orden de Implementacion

1. **Crear componentes base**: `MiniCharts.tsx`, `MetricCard.tsx`, `AnalysisCard.tsx`
2. **Actualizar Header**: Saludo personalizado con hora del dia
3. **Redisenar AIInsightsCard**: Gradiente premium, estado expandible, grid de 3 columnas
4. **Reescribir Dashboard.tsx**: Nuevo layout con todas las secciones
5. **Actualizar CSS**: Variables de colores metric-*
6. **Testing visual**: Verificar responsividad y animaciones

---

## Consideraciones de Performance

- Mantener lazy loading del `AIInsightsCard` (ya implementado)
- Los `MiniCharts` usan datos locales/cached, no queries adicionales
- El nuevo layout no agrega queries, solo reorganiza los datos existentes
- Las animaciones usan Framer Motion con `initial=false` para evitar re-renders

---

## Resultado Esperado

- Dashboard premium que refleja la naturaleza AI-Native del CRM
- Saludo contextual que humaniza la experiencia
- AI Insights como elemento central y destacado visualmente
- Metricas con mini-charts que muestran tendencias de un vistazo
- Paleta de colores moderna y coherente (naranja/purpura/azul)
- Layout limpio inspirado en Nexo Co pero con identidad propia
