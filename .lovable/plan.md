

# Plan: Mejoras al Módulo de Cartera Inmobiliaria

10 cambios aditivos que corrigen KPIs, agregan detección de mora automática, panel de mora, acciones rápidas, exportación CSV, tab de cartera en ContactDetail, e integración con el AI Assistant.

---

## Fase 1: Migración SQL

Crear función `update_overdue_installments()` y vista `portfolio_kpis`:

- Función SQL `SECURITY DEFINER` que actualiza cuotas `pending`/`partial` con `due_date < CURRENT_DATE` a `overdue`
- Vista `portfolio_kpis` con KPIs agregados por organización
- `GRANT SELECT ON portfolio_kpis TO authenticated`

---

## Fase 2: Nuevo hook `usePortfolioOverdue.ts`

Crear `src/hooks/usePortfolioOverdue.ts` con:

- `usePortfolioOverdue()` — llama `update_overdue_installments` vía RPC, luego consulta cuotas `overdue` con joins a `portfolio_contracts → contacts + real_estate_projects`. Calcula `days_overdue`, `pending_amount`, agrupa por contrato. Refresca cada 5 min.
- `usePortfolioUpcoming(daysAhead)` — cuotas `pending` en los próximos N días con misma estructura de datos.

---

## Fase 3: Modificar hooks existentes para detectar mora

**`usePortfolioContracts.ts`**: Agregar `await supabase.rpc('update_overdue_installments').catch(() => {})` al inicio del `queryFn`. Agregar `whatsapp_number` al select de `contacts` en ambas queries (lista y detalle).

**`usePortfolioSchedule.ts`**: Agregar misma llamada RPC al inicio del `queryFn`.

---

## Fase 4: Corregir KPIs y agregar Panel de Mora en `Portfolio.tsx`

- Importar `usePortfolioOverdue`, `usePortfolioUpcoming`
- Reemplazar KPIs: "Al día" = activos sin mora, "En mora" = contratos con cuotas vencidas + monto COP
- Agregar sección `OverduePanelSection` (colapsable, lista de compradores en mora agrupados por contrato con botones WhatsApp/teléfono)
- Agregar `UpcomingAlertSection` (alerta de cuotas próximas a vencer en 7 días)
- Nuevos imports: `Phone, MessageCircle, ChevronDown, ChevronUp, Clock`

---

## Fase 5: Acciones rápidas en `PortfolioContractDetail.tsx`

- Agregar botones "Llamar" y "WhatsApp" con mensaje precargado en el header del contrato
- Agregar función `exportScheduleCSV` y botón "Exportar CSV" junto a los tabs
- Imports: `MessageCircle, Download`

---

## Fase 6: Tab "Cartera" en `ContactDetail.tsx`

- Importar `usePortfolioContracts`, `Wallet`, `CONTRACT_STATUS_LABELS/COLORS`
- Agregar hook para filtrar contratos del contacto actual
- Agregar `TabsTrigger` y `TabsContent` condicionales para `contactType === 'comprador'`
- Mostrar lista de contratos con navegación al detalle
- Actualizar `grid-cols` del TabsList dinámicamente

---

## Fase 7: Integrar cartera al AI Assistant (`chat/index.ts`)

### 7a. Agregar 3 tool definitions (antes de `];` en línea 1659):
- `get_portfolio_summary` — resumen global de cartera
- `get_overdue_installments` — lista compradores en mora
- `get_contact_portfolio` — contrato y pagos de un comprador por email

### 7b. Agregar 3 case handlers (después de `get_real_estate_master_report` en línea 3849):
- Handler `get_portfolio_summary`: KPIs de cartera + cuotas próximas
- Handler `get_overdue_installments`: lista detallada de mora
- Handler `get_contact_portfolio`: estado completo del contrato de un comprador

### 7c. Reemplazar `cartera: { nota: 'Módulo de cartera no disponible aún' }` en el reporte maestro por datos reales de contratos activos y mora.

### 7d. Agregar línea de capacidades de cartera al system prompt y `/cartera` al routeMap.

---

## Archivos nuevos (1)

| Archivo | Tipo |
|---------|------|
| `src/hooks/usePortfolioOverdue.ts` | Hook |

## Archivos modificados (6)

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Función + vista de mora |
| `src/hooks/usePortfolioContracts.ts` | RPC mora + whatsapp_number en select |
| `src/hooks/usePortfolioSchedule.ts` | RPC mora al cargar |
| `src/pages/Portfolio.tsx` | KPIs corregidos + panel mora + alertas |
| `src/pages/PortfolioContractDetail.tsx` | Botones contacto + exportar CSV |
| `src/pages/ContactDetail.tsx` | Tab Cartera condicional |
| `supabase/functions/chat/index.ts` | 3 tools + handlers + reporte maestro |

