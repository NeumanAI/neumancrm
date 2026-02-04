
# Plan: Integrar Funciones de Equipo en el Asistente IA

## Vision General

Transformar el CRM en un sistema verdaderamente AI-Native extendiendo las capacidades del asistente de chat para que pueda gestionar equipos, asignar entidades, colaborar mediante comentarios y consultar el activity feed, todo mediante lenguaje natural.

---

## Arquitectura de la Integracion

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHAT AI - HERRAMIENTAS ACTUALES                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  Contactos     │  Empresas    │  Oportunidades  │  Timeline    │  Tareas    │
│  - create      │  - create    │  - create       │  - search    │  - create  │
│  - update      │  - search    │  - update_stage │  - promises  │  - schedule│
│  - search      │              │  - health       │              │            │
│                │              │  - pipeline     │              │            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NUEVAS HERRAMIENTAS DE EQUIPO                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │   GESTION EQUIPO    │  │     ASIGNACION      │  │    COLABORACION     │ │
│  │                     │  │                     │  │                     │ │
│  │  - get_team_summary │  │  - assign_entity    │  │  - add_comment      │ │
│  │  - get_member_info  │  │  - transfer_entity  │  │  - get_comments     │ │
│  │  - get_quotas       │  │  - get_assigned_to  │  │  - get_activity     │ │
│  │  - check_permission │  │                     │  │  - mention_member   │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     CONTEXTO ENRIQUECIDO                                ││
│  │                                                                         ││
│  │  El system prompt incluira:                                             ││
│  │  - Nombre y rol del usuario actual                                      ││
│  │  - Miembros del equipo con sus roles                                    ││
│  │  - Actividad reciente del equipo                                        ││
│  │  - Permisos disponibles segun el rol                                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Nuevas Herramientas (Tools) a Implementar

### 1. Gestion de Equipo

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `get_team_summary` | Obtiene resumen del equipo con todos los miembros, roles y cuotas | - |
| `get_member_info` | Obtiene info detallada de un miembro por nombre o email | `member_identifier` |
| `get_quotas_progress` | Muestra progreso de cuotas del equipo o un miembro especifico | `member_email?` |

### 2. Asignacion de Entidades

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `assign_contact` | Asigna un contacto a un miembro del equipo | `contact_email`, `assigned_to_email` |
| `assign_company` | Asigna una empresa a un miembro del equipo | `company_name`, `assigned_to_email` |
| `assign_opportunity` | Asigna una oportunidad a un miembro del equipo | `opportunity_title`, `assigned_to_email` |
| `get_my_assignments` | Lista entidades asignadas al usuario actual o a un miembro | `member_email?`, `entity_type?` |

### 3. Colaboracion

| Tool | Descripcion | Parametros |
|------|-------------|------------|
| `add_team_comment` | Agrega comentario a una entidad con soporte para @menciones | `entity_type`, `entity_identifier`, `content` |
| `get_entity_comments` | Obtiene comentarios de una entidad | `entity_type`, `entity_identifier`, `limit?` |
| `get_activity_feed` | Obtiene actividad reciente del equipo | `entity_type?`, `entity_id?`, `limit?` |
| `notify_team_member` | Menciona a un miembro en un comentario | `member_email`, `entity_type`, `entity_identifier`, `message` |

---

## Actualizacion del System Prompt

El system prompt incluira nueva informacion contextual:

```text
## Datos del Equipo:

Organizacion: [Nombre de la org] (Plan: [plan])
Tu rol: [Admin/Manager/Sales Rep/Viewer]
Equipo: [X] miembros activos

Miembros del equipo:
- Juan Perez (admin) - juan@empresa.com - Cuota: $50K/$30K completado
- Maria Garcia (sales_rep) - maria@empresa.com - Cuota: $40K/$25K completado
- Pedro Lopez (viewer) - pedro@empresa.com

Actividad reciente:
- Juan creo el contacto "Carlos Ruiz" hace 2 horas
- Maria movio la oportunidad "Proyecto Alpha" a Negociacion hace 1 dia

Tus permisos:
- Puedes: crear, editar, asignar, comentar
- No puedes: [si aplica]
```

---

## Ejemplos de Uso

El usuario podra hacer solicitudes como:

**Equipo:**
- "Muestrame el resumen del equipo"
- "Cuanto ha vendido Maria este mes?"
- "Quien tiene mas deals abiertos?"

**Asignacion:**
- "Asigna el contacto juan@cliente.com a Pedro"
- "Transfiere la empresa TechCorp a Maria"
- "Que tengo asignado?"
- "Muestrame las oportunidades asignadas a Juan"

**Colaboracion:**
- "Agrega un comentario a la empresa TechCorp diciendo que necesitan seguimiento"
- "Notifica a Maria sobre el contacto Carlos Ruiz"
- "Que comentarios tiene la oportunidad Proyecto Alpha?"
- "Muestrame la actividad reciente del equipo"
- "Quien modifico el contacto juan@cliente.com?"

---

## Cambios en el Edge Function

### Archivo: `supabase/functions/chat/index.ts`

#### 1. Agregar nuevas definiciones de tools (aprox. linea 270)

```typescript
// ===== EQUIPO Y COLABORACION =====
{
  type: "function",
  function: {
    name: "get_team_summary",
    description: "Obtiene un resumen del equipo: miembros, roles, cuotas y progreso de ventas.",
    parameters: { type: "object", properties: {} },
  },
},
{
  type: "function",
  function: {
    name: "get_member_info",
    description: "Obtiene informacion detallada de un miembro del equipo.",
    parameters: {
      type: "object",
      properties: {
        member_identifier: { type: "string", description: "Email o nombre del miembro" },
      },
      required: ["member_identifier"],
    },
  },
},
// ... (8 tools adicionales)
```

#### 2. Actualizar fetchCRMContext para incluir datos de equipo

Agregar consultas para:
- Organizacion actual
- Miembros del equipo con roles y cuotas
- Actividad reciente (ultimas 5-10 entradas)
- Rol del usuario actual y permisos

#### 3. Actualizar buildSystemPrompt

Incluir seccion de equipo con:
- Nombre de la organizacion y plan
- Rol del usuario actual
- Lista de miembros con roles
- Actividad reciente
- Permisos basados en rol

#### 4. Implementar funciones ejecutoras

```typescript
async function getTeamSummary(supabase: any, userId: string) { ... }
async function getMemberInfo(supabase: any, userId: string, args: any) { ... }
async function assignEntity(supabase: any, userId: string, args: any) { ... }
async function addTeamComment(supabase: any, userId: string, args: any) { ... }
async function getActivityFeed(supabase: any, userId: string, args: any) { ... }
// ... etc
```

#### 5. Agregar casos en executeTool switch

```typescript
case "get_team_summary":
  return await getTeamSummary(supabase, userId);
case "assign_contact":
  return await assignEntity(supabase, userId, 'contacts', args);
// ... etc
```

---

## Orden de Implementacion

1. Agregar definiciones de las 11 nuevas tools al array `tools`
2. Actualizar `fetchCRMContext` para incluir datos de equipo
3. Actualizar `buildSystemPrompt` con seccion de equipo
4. Implementar funciones ejecutoras:
   - `getTeamSummary()`
   - `getMemberInfo()`
   - `getQuotasProgress()`
   - `assignEntity()` (reusable para contacts, companies, opportunities)
   - `getMyAssignments()`
   - `addTeamComment()`
   - `getEntityComments()`
   - `getActivityFeed()`
   - `notifyTeamMember()`
5. Agregar casos al switch de `executeTool`
6. Probar con ejemplos de conversacion

---

## Consideraciones de Seguridad

- **Permisos RLS**: Las consultas ya respetan RLS basado en organization_id
- **Validacion de rol**: Antes de asignar/transferir, verificar que el usuario tiene permiso
- **Viewers**: No pueden ejecutar acciones de escritura (la IA debe informar esto)
- **Cross-org**: Imposible acceder a datos de otras organizaciones gracias a RLS

---

## Resultado Esperado

Tras la implementacion, el asistente IA podra:

1. Responder preguntas sobre el equipo y organizacion
2. Asignar y transferir contactos, empresas y oportunidades entre miembros
3. Agregar comentarios colaborativos con @menciones
4. Mostrar el activity feed y quien hizo que cambios
5. Informar sobre cuotas y progreso de ventas del equipo
6. Respetar permisos basados en el rol del usuario

Esto transforma el CRM en un verdadero sistema AI-Native donde la colaboracion en equipo es gestionable completamente por lenguaje natural.
