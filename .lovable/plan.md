
# Calendario Integrado con Google Calendar

## Resumen

Implementar un modulo completo de calendario que unifique eventos de agenda comercial, tareas con fecha de vencimiento y metas con fechas limite, con integracion bidireccional con Google Calendar, vistas mensuales, y widget "Agenda Hoy" en el Dashboard.

## Adaptaciones al Proyecto Existente

El prompt original tiene varias referencias que no coinciden con el esquema actual y deben adaptarse:

- **No existe tabla `tasks`**: el CRM usa `activities` para tareas. Se agregaran campos `show_in_calendar` y `calendar_color` a `activities` en lugar de `tasks`.
- **No existe tabla `deals`**: se usa `opportunities`. Las referencias a `deal_id` se cambiaran a `opportunity_id` y el trigger de progreso de metas se adaptara para usar `opportunities.status = 'won'`.
- **CHECK constraints**: se reemplazaran por validation triggers segun las guias del proyecto.
- **Foreign keys a `auth.users`**: se usara `UUID NOT NULL` sin FK directo a `auth.users` (patron existente del proyecto).

## Detalles Tecnicos

### 1. Migracion SQL

Crear 3 tablas nuevas y modificar 1 existente:

**Tabla `calendar_events`**
- Eventos de agenda comercial (reuniones, llamadas, demos, seguimientos, cierres)
- Campos de integracion con Google Calendar (`google_event_id`, `synced_with_google`, etc.)
- Relaciones con `contacts`, `companies`, `opportunities`
- Participantes como JSONB, ubicacion, URL de reunion
- Recordatorios y recurrencia
- RLS: usuarios ven sus eventos y los de su organizacion

**Tabla `calendar_goals`**
- Metas con target/progreso (cuota de ventas, llamadas, deals cerrados, etc.)
- Campo `progress_percentage` calculado automaticamente (GENERATED ALWAYS AS)
- Fechas de inicio/fin, colores, display en calendario
- RLS: usuarios ven sus metas y las del equipo

**Tabla `google_calendar_sync`**
- Configuracion OAuth por usuario (tokens, email, calendarios seleccionados)
- Direccion de sync (bidireccional, solo a Google, solo desde Google)
- Estado de sincronizacion
- RLS: solo el usuario ve su propia config

**Modificar tabla `activities`**
- Agregar `show_in_calendar BOOLEAN DEFAULT true`
- Agregar `calendar_color TEXT DEFAULT '#f59e0b'`

**Funcion `get_calendar_items`**
- Vista unificada que combina eventos, actividades y metas para un rango de fechas
- Adaptada para usar `activities` en lugar de `tasks` y `opportunity_id` en lugar de `deal_id`

**Trigger `update_goal_progress`**
- Se dispara al cambiar `opportunities.status` a `'won'` para actualizar metas de revenue automaticamente

### 2. Edge Function: `google-calendar-sync`

Crear `supabase/functions/google-calendar-sync/index.ts`:
- Acciones: `connect`, `disconnect`, `sync_to_google`, `sync_from_google`, `full_sync`
- OAuth flow completo con refresh de tokens
- Formateo bidireccional de eventos (CRM <-> Google Calendar)
- Requiere secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### 3. Pagina principal: `src/pages/CalendarPage.tsx`

- Vista mensual con grid de 7 columnas
- Navegacion por mes (anterior/siguiente/hoy)
- Filtros toggle por tipo (eventos, tareas, metas)
- Boton de sync con Google Calendar
- Click en evento abre detalle
- Boton para crear nuevo evento
- Boton de configuracion de Google Calendar

### 4. Componentes de calendario

**`src/components/calendar/CreateEventDialog.tsx`**
- Formulario completo: titulo, tipo, fechas/horas, todo el dia, descripcion, ubicacion, URL de reunion, color
- Obtiene `organization_id` del team member actual

**`src/components/calendar/EventDetailDialog.tsx`**
- Muestra detalle segun tipo (evento/tarea/meta)
- Info contextual: participantes, ubicacion, link de reunion, progreso de meta
- Acciones: editar, eliminar
- Indicador de sync con Google

**`src/components/calendar/GoogleCalendarSettings.tsx`**
- Estado de conexion con Google
- Boton conectar/desconectar
- Direccion de sincronizacion (CRM->Google, Google->CRM, bidireccional)
- Opciones: sync eventos personales, solo CRM related, auto-sync

**`src/components/calendar/TodayAgenda.tsx`**
- Widget para el Dashboard
- Muestra eventos, tareas y metas del dia actual
- Link a la pagina completa del calendario

### 5. Pagina callback OAuth: `src/pages/GoogleCalendarCallback.tsx`

- Procesa el codigo de autorizacion de Google
- Invoca la edge function con accion `connect`
- Redirige al calendario con feedback

### 6. Modificaciones a archivos existentes

**`src/App.tsx`**
- Agregar ruta `/calendar` con `AppLayout`
- Agregar ruta `/auth/google-calendar-callback` sin layout

**`src/components/layout/Sidebar.tsx`**
- Agregar item de navegacion "Calendario" con icono `Calendar` entre Tareas y Datos

**`src/pages/Dashboard.tsx`**
- Agregar widget `TodayAgenda` en el grid del dashboard

### 7. Secrets necesarios

Se solicitaran al usuario antes de implementar la integracion con Google:
- `GOOGLE_CLIENT_ID` - para OAuth y edge function
- `GOOGLE_CLIENT_SECRET` - para edge function

La funcionalidad local del calendario (crear eventos, ver calendario, filtros) funcionara sin Google Calendar. La integracion con Google es opcional y se activa cuando el usuario configura las credenciales.

## Archivos a crear (6)

1. `src/pages/CalendarPage.tsx`
2. `src/pages/GoogleCalendarCallback.tsx`
3. `src/components/calendar/CreateEventDialog.tsx`
4. `src/components/calendar/EventDetailDialog.tsx`
5. `src/components/calendar/GoogleCalendarSettings.tsx`
6. `src/components/calendar/TodayAgenda.tsx`
7. `supabase/functions/google-calendar-sync/index.ts`

## Archivos a modificar (3)

1. `src/App.tsx` - rutas
2. `src/components/layout/Sidebar.tsx` - navegacion
3. `src/pages/Dashboard.tsx` - widget agenda

## Orden de ejecucion

1. Migracion SQL (tablas, funcion, trigger)
2. Edge function de sync
3. Componentes de calendario
4. Pagina principal y callback
5. Rutas, navegacion y widget en dashboard
