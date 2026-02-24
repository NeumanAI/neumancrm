

# Plan: Modulo Cartera Inmobiliaria (4 prompts consolidados)

Este es un modulo completo de gestion de cartera inmobiliaria: contratos de financiamiento directo, plan de pagos, registro de cobros y gestion de mora. Se implementa todo de una vez.

---

## Fase 1: Base de datos (SQL Migration)

Crear 4 tablas con RLS:

- **portfolio_contracts**: Contratos de cartera con estructura financiera (precio total, separacion, cuota inicial, subsidio, monto financiado, tasa de interes, plazo, dia de pago). Estados: active, completed, defaulted, cancelled. Incluye campo `fiducia_number` opcional.
- **portfolio_payment_schedule**: Plan de pagos generado automaticamente (cuota fija sistema frances). Cada cuota tiene capital, interes, saldo, estado (pending/paid/partial/overdue/waived), mora acumulada.
- **portfolio_payments**: Log de pagos recibidos con metodo (transferencia, efectivo, cheque, PSE, otro) y referencia bancaria.
- **portfolio_collection_actions**: Historial de gestiones de cobro (WhatsApp, email, llamada, visita, acuerdo de pago, nota) con resultado y promesas de pago.

Indices en organization_id, project_id, contact_id, status, due_date, contract_id. RLS basado en `team_members` con organizacion activa. Lectura para todos los miembros activos, escritura para owner/admin/manager/sales_rep.

---

## Fase 2: Feature flag y navegacion

### `src/components/admin/ModulesDialog.tsx`
- Agregar toggle "Cartera Inmobiliaria" con icono Wallet despues del toggle de Proyectos Inmobiliarios

### `src/components/layout/AppLayout.tsx`
- Agregar `const hasPortfolio = useHasModule('real_estate_portfolio')`
- Pasar `hasPortfolio` al Sidebar

### `src/components/layout/Sidebar.tsx`
- Agregar prop `hasPortfolio` a la interfaz
- Importar `Wallet` de lucide-react
- Insertar item "Cartera" con ruta `/cartera` e icono Wallet condicionalmente despues del item de Proyectos

### `src/components/layout/Header.tsx`
- Agregar `'/cartera': 'Cartera'` al mapa PAGE_NAMES

### `src/App.tsx`
- Agregar rutas `/cartera` y `/cartera/:contractId`
- Importar las nuevas paginas Portfolio y PortfolioContractDetail

---

## Fase 3: Hooks (4 archivos nuevos)

### `src/hooks/usePortfolioContracts.ts`
- Interface `PortfolioContract` con todos los campos financieros + joins a contacts y real_estate_projects
- Interface `ContractSummary` extendida con metricas calculadas
- Constantes de labels y colores por estado
- Funcion `generatePaymentSchedule()`: calcula cuota fija (sistema frances) o sin intereses, genera array de cuotas con capital, interes, saldo
- Hook `usePortfolioContracts(projectId?)`: lista contratos con filtro opcional por proyecto
- Mutation `createContract`: crea contrato + genera plan de pagos en lotes de 50
- Mutation `updateContract`
- Hook `usePortfolioContract(contractId)`: contrato individual con joins

### `src/hooks/usePortfolioSchedule.ts`
- Interface `PortfolioInstallment`
- Constantes de labels y colores por estado de cuota
- Hook con query del plan de pagos ordenado por numero de cuota
- Mutation `registerPayment`: actualiza cuota (paid/partial) + inserta en portfolio_payments
- Metricas calculadas: totalPaid, totalPending, overdueAmount, overdueInstallments, nextPending, paidCount

### `src/hooks/usePortfolioPayments.ts`
- Interface `PortfolioPayment` con metodo de pago y referencia
- Hook de solo lectura: lista pagos por contrato

### `src/hooks/usePortfolioActions.ts`
- Interface `CollectionAction` con tipos (whatsapp, email, call, etc.) y resultados
- Hook con query + mutation `addAction`

---

## Fase 4: UI (3 archivos nuevos + 1 modificado)

### `src/pages/Portfolio.tsx` (nuevo)
Dashboard global de cartera:
- KPIs: cartera activa (monto), contratos al dia, en mora, completados
- Filtros: busqueda por nombre/contrato/fiducia, filtro por estado, filtro por proyecto
- Lista de contratos como cards con avatar, nombre, proyecto, unidad, monto financiado, numero de contrato, fiducia, estado
- Click navega a `/cartera/:contractId`

### `src/pages/PortfolioContractDetail.tsx` (nuevo)
Detalle de un contrato con 3 tabs:
- Header: info del comprador (nombre, email, telefono), info del contrato (numero, fiducia, fecha firma, precio total, monto financiado)
- KPIs: saldo pendiente, total pagado, en mora, avance del credito
- Card "Proxima cuota" con boton rapido de registrar pago
- **Tab Plan de pagos**: tabla con N°, vencimiento, capital, intereses, cuota total, saldo, estado, boton "Pagar" en cada cuota pendiente. Cuotas en mora resaltadas en rojo.
- **Tab Pagos recibidos**: tabla con fecha, monto, metodo, referencia, notas. Total al pie.
- **Tab Gestion de cobro**: historial de gestiones con tipo, resultado, promesas de pago. Boton "Agregar gestion".
- Dialogs: RegisterPaymentDialog y AddActionDialog integrados

### `src/components/portfolio/CreateContractDialog.tsx` (nuevo)
Dialog wizard de 3 pasos para crear contrato:
- Paso 1 (Contrato): numero de contrato, numero de fiducia (opcional), unidad, fecha de firma, notas
- Paso 2 (Financiacion): precio total, separacion, cuota inicial, subsidio, monto financiado (calculado automaticamente), tasa de interes mensual
- Paso 3 (Cuotas): plazo en meses, dia de pago, fecha primera cuota, vista previa del plan de pagos (primeras 3 + ultima cuota)
- Al crear: inserta contrato + genera plan de pagos automaticamente

### `src/pages/RealEstateProjectDetail.tsx` (modificar)
En el tab de Compradores, agregar boton "Cartera" para leads con status signed/reserved/delivered (solo si modulo esta activo). Al hacer clic abre CreateContractDialog.

---

## Fase 5: AI Tools (edge function)

### `supabase/functions/chat/index.ts`
Agregar 8 tools de cartera al AI Assistant:

1. **get_portfolio_summary**: Resumen global (contratos activos, monto en mora, forecast 30 dias)
2. **get_contract_detail**: Detalle de contrato por nombre de comprador (saldo, cuotas pagadas, mora, fiducia)
3. **list_overdue_contracts**: Lista morosos ordenados por dias en mora, con filtro por proyecto
4. **list_upcoming_payments**: Cuotas que vencen en los proximos N dias
5. **register_portfolio_payment**: Registrar pago via chat (busca contrato activo, aplica FIFO si no se especifica cuota)
6. **get_cashflow_forecast**: Proyeccion de ingresos por mes (este mes, siguiente, o YYYY-MM)
7. **add_collection_action**: Documentar gestion de cobro via chat
8. **get_contract_statement**: Estado de cuenta completo con plan de pagos y pagos recibidos

Incluye: definicion de tools, contexto en fetchCRMContext, handlers en executeTool, sistema prompt actualizado.

---

## Resumen tecnico

```text
Archivos nuevos (8):
  src/hooks/usePortfolioContracts.ts
  src/hooks/usePortfolioSchedule.ts
  src/hooks/usePortfolioPayments.ts
  src/hooks/usePortfolioActions.ts
  src/pages/Portfolio.tsx
  src/pages/PortfolioContractDetail.tsx
  src/components/portfolio/CreateContractDialog.tsx
  (migration SQL)

Archivos modificados (6):
  src/components/admin/ModulesDialog.tsx  (toggle cartera)
  src/components/layout/AppLayout.tsx     (hasPortfolio prop)
  src/components/layout/Sidebar.tsx       (nav item cartera)
  src/components/layout/Header.tsx        (page name)
  src/App.tsx                             (2 rutas)
  src/pages/RealEstateProjectDetail.tsx   (boton cartera en compradores)
  supabase/functions/chat/index.ts        (8 AI tools)
```

