

# Plan: Sistema de Proyectos y Unidades de Negocio

## Resumen Ejecutivo
Implementar un sistema completo de proyectos/unidades de negocio que permita segmentar contactos, oportunidades y métricas por proyecto. Ideal para constructoras inmobiliarias, empresas con múltiples líneas de negocio, o agencias con varios clientes.

## Casos de Uso
- Constructoras con múltiples proyectos inmobiliarios
- Empresas con unidades de negocio separadas
- Agencias con múltiples clientes
- Desarrolladoras con diferentes líneas de producto

---

## Fase 1: Esquema de Base de Datos

### Nuevas Tablas

**1. `projects`** - Tabla principal de proyectos
- Campos: id, organization_id, name, code, description, type, status
- Tipos de proyecto: project, real_estate, construction, business_unit, department, brand, product_line, location, other
- Estados: active, inactive, completed, cancelled
- Metadatos: fechas, presupuesto, revenue_target, ubicación, color, icono

**2. `contact_projects`** - Relación muchos-a-muchos entre contactos y proyectos
- Campos: contact_id, project_id, status (lead/qualified/customer/inactive), interest_level, source, notes
- Permite que un contacto esté en múltiples proyectos

**3. `project_members`** - Miembros del equipo asignados a proyectos
- Campos: project_id, team_member_id, role, permissions
- Roles: owner, admin, member, viewer

**4. `project_metrics`** - Métricas calculadas por proyecto
- Campos: total_contacts, total_companies, total_opportunities, pipeline_value, won_deals_value, conversion_rate

### Modificaciones a Tablas Existentes
- `opportunities`: Añadir columna `project_id`
- `companies`: Añadir columna `project_id`

### RLS Policies
- Políticas basadas en organization_id
- Acceso controlado por membresía en proyecto

---

## Fase 2: Nuevos Hooks de React

```text
src/hooks/
├── useProjects.ts          # CRUD de proyectos + estado global
├── useContactProjects.ts   # Gestión de contactos por proyecto
└── useProjectMetrics.ts    # Métricas calculadas
```

### `useProjects.ts`
- Lista de proyectos con filtros por estado/tipo
- Proyecto seleccionado global (para filtro en header)
- Suscripción realtime para actualizaciones
- Métodos: createProject, updateProject, deleteProject

### `useContactProjects.ts`
- Lista de proyectos de un contacto
- Métodos: addToProject, removeFromProject, updateStatus

### `useProjectMetrics.ts`
- Métricas agregadas por proyecto
- Cálculo bajo demanda via RPC

---

## Fase 3: Nuevas Páginas

```text
src/pages/
├── Projects.tsx       # Lista de proyectos (cards grid)
└── ProjectDetail.tsx  # Detalle con tabs
```

### `/projects` - Lista de Proyectos
- Grid de tarjetas con color e icono
- Estadísticas globales (total, activos, por tipo)
- Búsqueda y filtros
- Botón "Nuevo Proyecto"

### `/projects/:projectId` - Detalle del Proyecto
- Header con nombre, código, tipo y estado
- Métricas: contactos, empresas, pipeline value, deals ganados
- Tabs: Resumen, Contactos, Pipeline, Configuración

---

## Fase 4: Nuevos Componentes

```text
src/components/projects/
├── CreateProjectDialog.tsx     # Formulario de creación
├── EditProjectDialog.tsx       # Formulario de edición
├── ProjectSelector.tsx         # Select para formularios
├── GlobalProjectFilter.tsx     # Filtro en header
├── ProjectCard.tsx             # Tarjeta para grid
├── ProjectContactsList.tsx     # Lista de contactos en proyecto
└── AddContactToProjectDialog.tsx
```

### Diálogos
- CreateProjectDialog: nombre, código, tipo, descripción, presupuesto, color
- EditProjectDialog: edición de todos los campos
- AddContactToProjectDialog: buscar y añadir contactos

### Selectores
- ProjectSelector: dropdown para formularios de contactos/oportunidades
- GlobalProjectFilter: en el header para filtrar toda la vista

---

## Fase 5: Integración con Módulos Existentes

### Navegación (Sidebar.tsx)
- Añadir item "Proyectos" con icono FolderOpen
- Posición: después de Pipeline

### Rutas (App.tsx)
```typescript
<Route path="/projects" element={<AppLayout><Projects /></AppLayout>} />
<Route path="/projects/:projectId" element={<AppLayout><ProjectDetail /></AppLayout>} />
```

### Header (Header.tsx)
- Añadir GlobalProjectFilter después del search
- Permite filtrar contactos/oportunidades por proyecto activo

### Formularios de Contactos
- Añadir ProjectSelector opcional
- Al crear contacto, puede asignarse a uno o más proyectos

### Formularios de Oportunidades
- Añadir ProjectSelector
- Vincular deals directamente a un proyecto

---

## Fase 6: Herramientas de IA (Edge Function Chat)

Nuevas tools para el asistente:

| Tool | Descripción |
|------|-------------|
| `list_projects` | Listar proyectos activos con filtro por tipo |
| `get_project_stats` | Obtener métricas de un proyecto |
| `add_contact_to_project` | Añadir contacto a proyecto por email/nombre |
| `create_project` | Crear nuevo proyecto |
| `get_project_contacts` | Listar contactos de un proyecto |

---

## Secuencia de Implementación

1. **Base de datos**: Crear tablas y políticas RLS
2. **Hooks**: useProjects, useContactProjects, useProjectMetrics
3. **Tipos**: Actualizar src/types/crm.ts con interfaces
4. **Componentes**: Diálogos y selectores
5. **Páginas**: Projects.tsx y ProjectDetail.tsx
6. **Navegación**: Sidebar y rutas
7. **Filtro global**: Header y lógica de filtrado
8. **Integración formularios**: Contactos y oportunidades
9. **AI Tools**: Actualizar chat edge function

---

## Sección Tecnica

### Estructura de Archivos Nuevos
```text
src/
├── hooks/
│   ├── useProjects.ts
│   ├── useContactProjects.ts
│   └── useProjectMetrics.ts
├── pages/
│   ├── Projects.tsx
│   └── ProjectDetail.tsx
├── components/projects/
│   ├── CreateProjectDialog.tsx
│   ├── EditProjectDialog.tsx
│   ├── ProjectSelector.tsx
│   ├── GlobalProjectFilter.tsx
│   ├── ProjectCard.tsx
│   └── AddContactToProjectDialog.tsx
└── types/
    └── projects.ts (o añadir a crm.ts)
```

### Modificaciones a Archivos Existentes
- `src/App.tsx`: Añadir rutas de proyectos
- `src/components/layout/Sidebar.tsx`: Añadir link a proyectos
- `src/components/layout/Header.tsx`: Añadir filtro global
- `supabase/functions/chat/index.ts`: Añadir tools de proyectos

### Tablas SQL a Crear
- `projects` (tabla principal)
- `contact_projects` (relación contacto-proyecto)
- `project_members` (miembros por proyecto)
- `project_metrics` (métricas calculadas)

### Columnas a Añadir
- `opportunities.project_id` (FK a projects)
- `companies.project_id` (FK a projects)

