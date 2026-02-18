
# Problema: El Dashboard Muestra Datos Ficticios en Todas las Cuentas

## Diagnóstico

El problema tiene dos causas concretas en `src/pages/Dashboard.tsx` y `src/lib/mockDashboardData.ts`:

**1. Fallback falso en "Ingresos Totales":**
```ts
value={formatCurrency(totalPipelineValue || 2864679)}
```
El `|| 2864679` hace que cuando no hay oportunidades, se muestre "246.4 MUS$" inventado.

**2. Métricas 100% hardcodeadas:**
- `value="2.4%"` (Tasa de Conversión) — siempre fijo
- `value="$5,320"` (Resultado Campañas) — siempre fijo
- `trendValue="+2.4%"`, `"+3.5%"`, etc. — todos inventados

**3. Los 4 gráficos de análisis usan exclusivamente datos del archivo mock:**
- "Patrón de Crecimiento" → `growthPatternData` (valores inventados)
- "Fuentes de Tráfico" → `trafficSourceData` (inventado)
- "Demanda de Producto" → `productDemandData` (inventado)
- "Rendimiento Campañas" → `growthPatternData` (inventado)

**4. Los mini-gráficos de las tarjetas de métricas también usan datos mock:**
- `revenueChartData`, `clientsChartData`, `conversionChartData`, `campaignChartData`

## Solución

### Tarjetas de Métricas (4 cambios directos)

Calcular todo desde los datos reales ya disponibles en los hooks existentes:

| Tarjeta | Antes | Después |
|---|---|---|
| Ingresos Totales | `totalPipelineValue \|\| 2864679` | `totalPipelineValue` (muestra $0 si no hay datos) |
| Clientes Activos | `contacts.length \|\| companiesCount` | `contacts.length + companiesCount` (total real) |
| Tasa de Conversión | `"2.4%"` hardcoded | Oportunidades ganadas / total × 100 (de datos reales) |
| Resultado Campañas | `"$5,320"` hardcoded | Valor total de oportunidades ganadas este mes |

Los mini-gráficos de las tarjetas se generarán desde datos reales: se construirán arrays de `{value}` a partir de las oportunidades agrupadas por mes.

### Gráficos de Análisis (reemplazo por datos reales o estado vacío)

Los 4 gráficos se reemplazan por visualizaciones construidas desde los datos reales de oportunidades:

- **"Pipeline por Etapa"** (reemplaza "Patrón de Crecimiento"): barras con el valor total de oportunidades en cada etapa del pipeline. Datos reales inmediatos.
- **"Fuentes de Contactos"** (reemplaza "Fuentes de Tráfico"): distribución de contactos por campo `source` (manual, whatsapp, import, etc.) — dato real de la tabla `contacts`.
- **"Oportunidades por Mes"** (reemplaza "Demanda de Producto"): cantidad de oportunidades creadas en los últimos 4 meses, calculado desde `opportunities.created_at`. Si no hay datos, muestra estado vacío elegante.
- **"Pipeline Activo vs Ganado"** (reemplaza "Rendimiento Campañas"): comparativa de valor de oportunidades abiertas vs ganadas. Datos reales.

Cuando no hay datos, cada gráfico muestra un estado vacío con ícono y mensaje descriptivo en lugar de datos falsos.

### Hooks: ampliar `useOpportunities`

El hook ya devuelve todas las oportunidades. Se aprovechan para:
- Agrupar por `stage_id` → valor por etapa
- Agrupar por `created_at` mes → tendencia temporal
- Calcular `won` vs `open`

El hook `useContacts` ya devuelve el campo `source` de cada contacto, suficiente para el gráfico de fuentes.

## Archivos a Modificar

1. **`src/pages/Dashboard.tsx`**: Reemplazar todos los valores mock y hardcoded con cálculos reales. Reemplazar los 4 gráficos.
2. **`src/lib/mockDashboardData.ts`**: Eliminar todas las exportaciones que ya no se usen (o conservar solo las que sean claramente "demo").
3. **`src/hooks/useOpportunities.ts`** (opcional): Agregar un hook `useOpportunitiesAll` sin límite para los cálculos de gráficos si el límite actual de 10 afecta la precisión.

## Comportamiento con Cuentas Vacías

Una cuenta sin datos verá:
- Ingresos Totales: **$0**
- Clientes Activos: **0**
- Tasa de Conversión: **0%**
- Resultado Campañas: **$0**
- Gráficos con estado vacío: "Sin datos disponibles. Comienza agregando oportunidades."

No más datos falsos en ninguna cuenta.
