

# Plan: Actualizar IA del CRM con Sistema de Proyectos

## Objetivo
Actualizar la Edge Function de chat para incluir herramientas de gestión de proyectos y expandir la base de conocimiento del asistente con la nueva funcionalidad.

---

## Nuevas Herramientas a Agregar (6 tools)

| Herramienta | Descripción |
|-------------|-------------|
| `list_projects` | Listar proyectos de la organización con filtros por tipo/estado |
| `create_project` | Crear un nuevo proyecto o unidad de negocio |
| `get_project_stats` | Obtener métricas de un proyecto (contactos, pipeline, conversion) |
| `add_contact_to_project` | Añadir un contacto existente a un proyecto |
| `get_project_contacts` | Listar contactos asociados a un proyecto |
| `search_projects` | Buscar proyectos por nombre o código |

---

## Cambios en la Edge Function

### 1. Nuevas Definiciones de Tools (líneas ~10-430)

Se agregarán 6 nuevas herramientas en el array `tools`:

```typescript
// ===== PROYECTOS =====
{
  type: "function",
  function: {
    name: "list_projects",
    description: "Lista los proyectos/unidades de negocio de la organización. Úsala para ver proyectos disponibles.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "inactive", "completed", "cancelled"] },
        type: { type: "string", enum: ["project", "real_estate", "construction", "business_unit", "department", "brand", "product_line", "location", "other"] },
        limit: { type: "number", description: "Número máximo de resultados (default: 20)" },
      },
    },
  },
},
{
  type: "function",
  function: {
    name: "create_project",
    description: "Crea un nuevo proyecto o unidad de negocio para segmentar contactos y oportunidades.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre del proyecto (requerido)" },
        code: { type: "string", description: "Código corto identificador" },
        description: { type: "string", description: "Descripción del proyecto" },
        type: { type: "string", enum: ["project", "real_estate", "construction", "business_unit", "department", "brand", "product_line", "location", "other"] },
        budget: { type: "number", description: "Presupuesto del proyecto" },
        revenue_target: { type: "number", description: "Meta de ingresos" },
        city: { type: "string", description: "Ciudad" },
        country: { type: "string", description: "País" },
      },
      required: ["name"],
    },
  },
},
// ... más herramientas
```

### 2. Actualizar System Prompt (función `buildSystemPrompt`)

Agregar sección de proyectos al contexto del CRM:

```typescript
// En la sección de contexto agregar:
📁 **Proyectos activos**: ${projectsCount}

// En las capacidades agregar:
- **Proyectos**: Puedes crear, listar y gestionar proyectos/unidades de negocio
- **Segmentación**: Puedes añadir contactos a proyectos y ver métricas por proyecto

// En las herramientas documentar:
### Proyectos y Segmentación:
- **list_projects**: Listar proyectos de la organización
- **create_project**: Crear nuevo proyecto o unidad de negocio
- **get_project_stats**: Obtener métricas de un proyecto
- **add_contact_to_project**: Asociar contacto a proyecto
- **get_project_contacts**: Ver contactos de un proyecto
- **search_projects**: Buscar proyectos por nombre/código

// En navegación agregar:
- **Proyectos** (/projects): Gestión de proyectos y unidades de negocio
```

### 3. Actualizar `fetchCRMContext`

Agregar consulta de proyectos al contexto:

```typescript
const [
  // ... existing queries
  projectsResult,
] = await Promise.all([
  // ... existing
  supabase.from('projects').select('id, name, type, status')
    .eq('organization_id', currentMember?.organization_id)
    .eq('status', 'active')
    .limit(5),
]);
```

### 4. Implementar Funciones Ejecutoras

Agregar 6 nuevas funciones:

```typescript
// ===== PROJECT TOOL FUNCTIONS =====

async function listProjects(supabase: any, userId: string, args: any) {
  // Obtener organization_id del usuario
  // Consultar proyectos con filtros
  // Retornar lista formateada
}

async function createProject(supabase: any, userId: string, args: any) {
  // Obtener organization_id
  // Insertar nuevo proyecto
  // Retornar confirmación
}

async function getProjectStats(supabase: any, userId: string, args: any) {
  // Consultar contact_projects, opportunities, companies
  // Calcular métricas: pipeline_value, conversion_rate, etc.
  // Retornar resumen formateado
}

async function addContactToProject(supabase: any, userId: string, args: any) {
  // Buscar contacto por email
  // Buscar proyecto por nombre
  // Insertar en contact_projects
  // Retornar confirmación
}

async function getProjectContacts(supabase: any, userId: string, args: any) {
  // Consultar contact_projects con join a contacts
  // Retornar lista formateada
}

async function searchProjects(supabase: any, userId: string, args: any) {
  // Buscar por nombre o código usando ilike
  // Retornar proyectos encontrados
}
```

### 5. Agregar Cases en `executeTool`

```typescript
// ===== PROJECT TOOLS =====
case "list_projects":
  return await listProjects(supabase, userId, args);

case "create_project":
  return await createProject(supabase, userId, args);

case "get_project_stats":
  return await getProjectStats(supabase, userId, args);

case "add_contact_to_project":
  return await addContactToProject(supabase, userId, args);

case "get_project_contacts":
  return await getProjectContacts(supabase, userId, args);

case "search_projects":
  return await searchProjects(supabase, userId, args);
```

---

## Actualizar Documentación

### Archivo: `docs/CRM_DOCUMENTATION.md`

Agregar nueva sección de Proyectos a la documentación:

```markdown
## 2.6 Gestión de Proyectos y Unidades de Negocio

Sistema de segmentación de contactos, empresas y oportunidades por proyecto.

### Tipos de Proyecto
| Tipo | Descripción |
|------|-------------|
| `project` | Proyecto genérico |
| `real_estate` | Proyecto inmobiliario |
| `construction` | Proyecto de construcción |
| `business_unit` | Unidad de negocio |
| `department` | Departamento |
| `brand` | Marca |
| `product_line` | Línea de producto |
| `location` | Ubicación/Sucursal |
| `other` | Otro |

### Campos de Proyecto
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre (requerido) |
| `code` | String | Código identificador |
| `type` | Enum | Tipo de proyecto |
| `status` | Enum | active, inactive, completed, cancelled |
| `budget` | Number | Presupuesto |
| `revenue_target` | Number | Meta de ingresos |
...

### Herramientas de IA para Proyectos
| Herramienta | Descripción |
|-------------|-------------|
| `list_projects` | Listar proyectos |
| `create_project` | Crear proyecto |
| `get_project_stats` | Métricas por proyecto |
| `add_contact_to_project` | Asociar contacto |
| `get_project_contacts` | Contactos del proyecto |
| `search_projects` | Buscar proyectos |
```

---

## Secuencia de Implementación

1. **Agregar definiciones de tools** al array `tools`
2. **Implementar funciones ejecutoras** (6 funciones)
3. **Agregar cases en switch** de `executeTool`
4. **Actualizar `fetchCRMContext`** para incluir proyectos
5. **Actualizar `buildSystemPrompt`** con capacidades de proyectos
6. **Actualizar documentación** en `docs/CRM_DOCUMENTATION.md`
7. **Desplegar Edge Function**

---

## Sección Técnica

### Estructura de Cambios

```text
supabase/functions/chat/index.ts
├── tools[] - Agregar 6 nuevas definiciones
├── buildSystemPrompt() - Agregar sección proyectos
├── fetchCRMContext() - Agregar consulta proyectos
├── listProjects() - Nueva función
├── createProject() - Nueva función
├── getProjectStats() - Nueva función
├── addContactToProject() - Nueva función
├── getProjectContacts() - Nueva función
├── searchProjects() - Nueva función
└── executeTool() - Agregar 6 cases

docs/CRM_DOCUMENTATION.md
└── Agregar sección 2.6 Proyectos
```

### Ejemplos de Uso para el Usuario

El asistente podrá responder a solicitudes como:
- "Muéstrame los proyectos activos"
- "Crea un proyecto inmobiliario llamado Torre Norte"
- "¿Cuántos contactos tiene el proyecto Residencial Sur?"
- "Agrega a juan@email.com al proyecto Centro Comercial"
- "Dame las métricas del proyecto de marca Premium"

