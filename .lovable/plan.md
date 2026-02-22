

# Modulo Proyectos Inmobiliarios -- Implementacion completa (4 fases)

Este documento cubre los 4 prompts del archivo subido, ejecutados como una sola implementacion.

---

## Fase 1 -- Renombrar "Proyectos" a "Segmentos" (solo UI)

Cambiar labels y rutas visibles. No se tocan hooks, tipos, tablas ni queryKeys.

| Archivo | Cambio |
|---------|--------|
| `Sidebar.tsx` | `navItems`: label "Segmentos", ruta `/segmentos`, icono `Layers` |
| `App.tsx` | Redirects `/projects` y `/projects/:id` a `/segmentos`. Nuevas rutas `/segmentos` y `/segmentos/:projectId` usando mismos componentes |
| `Header.tsx` | Agregar `'/segmentos': 'Segmentos'` al objeto `PAGE_NAMES` |
| `Projects.tsx` | Textos: "Segmentos", "Nuevo Segmento", "No hay segmentos", etc. |
| `CreateProjectDialog.tsx` | Titulo "Nuevo Segmento" |
| `GlobalProjectFilter.tsx` | Placeholder "Todos los segmentos" |
| `ProjectDetail.tsx` | Boton "Volver a Segmentos", navigate a `/segmentos` |

---

## Fase 2 -- SQL + Feature Flag + Toggle Admin

### 2A -- Migracion SQL

Crear 3 tablas con RLS:

- `real_estate_projects` -- Proyectos inmobiliarios con campos de ubicacion, precios, unidades, progreso de obra, imagenes, amenidades
- `real_estate_unit_types` -- Tipos de unidades (apartamentos, locales) con hab, banos, m2, precio
- `real_estate_leads` -- Compradores/interesados vinculados a contactos existentes, con funnel de 8 estados

Agregar columna `enabled_modules JSONB DEFAULT '{}'` a `organizations`.

Indices en org_id, project_id, contact_id, status. RLS basado en `team_members` con roles.

### 2B -- Codigo feature flag

| Archivo | Cambio |
|---------|--------|
| Nuevo: `src/hooks/useHasModule.ts` | Hook que lee `organization.enabled_modules[module]` |
| `AppLayout.tsx` | Agregar `useHasModule('real_estate')` y pasar `hasRealEstate` al Sidebar |
| `Sidebar.tsx` | Nuevo prop `hasRealEstate`. Si true, insertar item "Proyectos" (icono `Building2`) despues de Pipeline |
| `Admin.tsx` | Nuevo componente `ModulesDialog` con Switch para activar/desactivar "Proyectos Inmobiliarios". Boton HardHat en cada fila de organizacion |

---

## Fase 3 -- UI completa del modulo

### Archivos nuevos

| Archivo | Descripcion |
|---------|-------------|
| `src/hooks/useRealEstateProjects.ts` | CRUD de proyectos inmobiliarios con React Query |
| `src/hooks/useRealEstateUnitTypes.ts` | CRUD de tipos de unidades |
| `src/hooks/useRealEstateLeads.ts` | Asignar/actualizar/eliminar leads con joins a contacts y unit_types |
| `src/pages/RealEstateProjects.tsx` | Lista con KPIs (activos, unidades, vendidas, disponibles), filtros, grid de cards con imagen, progreso, precios |
| `src/pages/RealEstateProjectDetail.tsx` | Detalle con 4 tabs: Resumen (hero, info, amenidades), Unidades (grid + CRUD dialog), Compradores (tabla con funnel de 8 estados + asignar contacto), Documentos (link al modulo) |
| `src/components/realestate/CreateRealEstateProjectDialog.tsx` | Dialog con 2 pasos (tabs): info basica + ubicacion/cifras |

### Rutas

- `/proyectos` -- Lista de proyectos inmobiliarios
- `/proyectos/:projectId` -- Detalle

Agregar `'/proyectos': 'Proyectos'` a `PAGE_NAMES` en Header.

---

## Fase 4 -- 8 tools AI en Edge Function chat

Agregar al `supabase/functions/chat/index.ts`:

### Tools nuevos

1. `list_real_estate_projects` -- Listar proyectos con filtro de estado
2. `get_real_estate_project_stats` -- Estadisticas completas de un proyecto
3. `get_available_units` -- Unidades disponibles con precios
4. `search_real_estate_leads` -- Buscar compradores por proyecto/estado
5. `assign_contact_to_project` -- Asignar contacto existente como interesado
6. `update_real_estate_lead_status` -- Mover lead en el funnel
7. `get_real_estate_funnel_summary` -- Resumen de conversion (individual o global)
8. `create_real_estate_project` -- Crear proyecto via chat

### Logica condicional

- Leer `enabled_modules` de la organizacion en `fetchCRMContext`
- Solo incluir los 8 tools en la llamada al AI si `real_estate === true`
- Si el modulo no esta activo, los tools no aparecen

---

## Detalles tecnicos

### Orden de implementacion
1. Fase 1 (renaming) -- 7 archivos, solo texto
2. Fase 2A (SQL migration) -- 1 migracion con 3 tablas + columna + indices + RLS
3. Fase 2B (feature flag + admin) -- 4 archivos
4. Fase 3 (UI modulo) -- 6 archivos nuevos + 2 modificados (App.tsx, Header.tsx)
5. Fase 4 (AI tools) -- 1 archivo (chat/index.ts)

### Archivos totales
- Nuevos: ~8 archivos
- Modificados: ~12 archivos
- 1 migracion SQL
- 1 edge function modificada + redeploy

### Dependencias existentes utilizadas
- React Query, Supabase client, date-fns, lucide-react, shadcn/ui -- todo ya instalado
- No se requieren nuevas dependencias npm

