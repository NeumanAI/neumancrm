
# Plan: Atribucion Comercial por Asesor

Implementar el sistema completo de atribucion comercial que vincula cada contacto, unidad y contrato a su asesor comercial, con dashboard gerencial, historial de traspasos y AI tools.

---

## Fase 1: Migracion SQL

Ejecutar una migracion de base de datos con:

1. **3 columnas nuevas en `contacts`**: `assigned_advisor_id`, `capture_advisor_id`, `assigned_at`
2. **2 columnas nuevas en `real_estate_unit_types`**: `closing_advisor_id`, `closing_advisor_at`
3. **Tabla nueva `contact_advisor_history`**: historial de traspasos con RLS
4. **Indices** para las nuevas columnas
5. **Migracion de datos**: asignar `created_by` como asesor inicial en contactos existentes

**Nota**: Se omite `portfolio_contracts` porque esa tabla no existe en el proyecto. Las referencias a cartera en los hooks retornaran datos vacios.

**Nota sobre FK**: El documento original usa `REFERENCES auth.users(id)` pero seguiremos las directrices del proyecto de no referenciar `auth.users` directamente. Usaremos UUID sin FK explicitamente a auth.users.

---

## Fase 2: Hook de Atribucion (`src/hooks/useAdvisorAttribution.ts`)

Crear un nuevo hook con:

- **`useAdvisors()`**: lista de asesores activos de la organizacion (team_members con roles owner/admin/manager/sales_rep)
- **`useContactAdvisorHistory(contactId)`**: historial de traspasos de un contacto
- **`useAssignAdvisor()`**: mutacion para asignar/traspasar asesor con registro en historial
  - Incluye `bulkTransfer` para traspasos masivos
- **`useAdvisorMetrics(period)`**: metricas por asesor (unidades vendidas, prospectos, compradores, tasa de conversion)

Diferencias vs documento:
- No se consultan `auth.users` directamente; se usan datos de `team_members` (full_name, email, avatar_url)
- Se omiten queries a `portfolio_contracts` y `deals` (no existen como tal)

---

## Fase 3: Modificar `src/hooks/useContacts.ts`

- Agregar auto-asignacion de asesor al crear contacto (capture + assigned)
- Registrar en `contact_advisor_history` al crear

---

## Fase 4: UI - Componente de Asignacion

### Crear `src/components/contacts/AdvisorAssignmentSection.tsx`
- Muestra asesor actual con avatar e info
- Boton "Traspasar" o "Asignar"
- Dialog con selector de asesor y campo de motivo
- Historial de traspasos colapsable

### Integrar en `src/pages/ContactDetail.tsx`
- Agregar seccion "Asesor comercial" en la ficha del contacto

---

## Fase 5: Filtros por Asesor

### En `src/pages/Contacts.tsx`
- Agregar selector de asesor en los filtros
- Mostrar nombre del asesor en cada fila

### En `src/pages/Pipeline.tsx`
- Agregar filtro por asesor en los filtros del pipeline

---

## Fase 6: Dashboard Gerencial

### Crear `src/pages/AdvisorDashboard.tsx`
- KPIs globales del equipo (unidades vendidas, valor ventas, prospectos activos)
- Tabla de ranking de asesores por periodo (mes/trimestre/anio)
- Cards de detalle por asesor

### Ruta y menu
- Agregar ruta `/gestion-comercial` en `src/App.tsx`
- Agregar item "Gestion Comercial" con icono Trophy en `src/components/layout/Sidebar.tsx` (visible solo para owner/admin/manager)

---

## Fase 7: AI Tools (4 herramientas)

Agregar en `supabase/functions/chat/index.ts`:

1. **`get_advisor_performance`**: Metricas individuales o ranking completo del equipo
2. **`get_advisor_contacts`**: Lista prospectos/compradores de un asesor
3. **`assign_contact_to_advisor`**: Asignar/traspasar contacto con historial
4. **`bulk_transfer_contacts`**: Traspaso masivo entre asesores

Actualizar system prompt con seccion de gestion comercial.

---

## Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| Migracion SQL | Crear (3 cols contacts, 2 cols units, tabla historial) |
| `src/hooks/useAdvisorAttribution.ts` | Crear |
| `src/hooks/useContacts.ts` | Modificar (auto-asignacion al crear) |
| `src/components/contacts/AdvisorAssignmentSection.tsx` | Crear |
| `src/pages/ContactDetail.tsx` | Modificar (agregar seccion asesor) |
| `src/pages/Contacts.tsx` | Modificar (filtro + columna asesor) |
| `src/pages/Pipeline.tsx` | Modificar (filtro por asesor) |
| `src/pages/AdvisorDashboard.tsx` | Crear |
| `src/App.tsx` | Modificar (nueva ruta) |
| `src/components/layout/Sidebar.tsx` | Modificar (nuevo item menu) |
| `supabase/functions/chat/index.ts` | Modificar (4 tools + system prompt) |
