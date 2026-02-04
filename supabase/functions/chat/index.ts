import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for function calling
const tools = [
  // ===== CONTACTOS =====
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Crea un nuevo contacto en el CRM. Usa esta función cuando el usuario pida crear o añadir un contacto.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string", description: "Nombre del contacto" },
          last_name: { type: "string", description: "Apellido del contacto" },
          email: { type: "string", description: "Email del contacto (requerido)" },
          phone: { type: "string", description: "Teléfono del contacto" },
          whatsapp_number: { type: "string", description: "Número de WhatsApp" },
          job_title: { type: "string", description: "Cargo o puesto" },
          company_name: { type: "string", description: "Nombre de la empresa donde trabaja" },
          notes: { type: "string", description: "Notas adicionales" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Actualiza información de un contacto existente. Requiere el email del contacto para identificarlo.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string", description: "Email del contacto a actualizar (requerido)" },
          first_name: { type: "string", description: "Nuevo nombre" },
          last_name: { type: "string", description: "Nuevo apellido" },
          phone: { type: "string", description: "Nuevo teléfono" },
          whatsapp_number: { type: "string", description: "Nuevo WhatsApp" },
          job_title: { type: "string", description: "Nuevo cargo" },
          notes: { type: "string", description: "Notas adicionales" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contacts",
      description: "Busca contactos en el CRM usando filtros avanzados. Usa esta función cuando el usuario pregunte por contactos específicos o quiera filtrar la lista de contactos.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda (busca en nombre, email, empresa)" },
          company_name: { type: "string", description: "Filtrar por nombre de empresa" },
          has_whatsapp: { type: "boolean", description: "Solo contactos con WhatsApp" },
          limit: { type: "number", description: "Número máximo de resultados (default: 10)" },
        },
      },
    },
  },
  // ===== EMPRESAS =====
  {
    type: "function",
    function: {
      name: "create_company",
      description: "Crea una nueva empresa en el CRM. Usa esta función cuando el usuario pida crear o añadir una empresa.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre de la empresa (requerido)" },
          industry: { type: "string", description: "Industria o sector" },
          website: { type: "string", description: "Sitio web" },
          phone: { type: "string", description: "Teléfono" },
          city: { type: "string", description: "Ciudad" },
          country: { type: "string", description: "País" },
          description: { type: "string", description: "Descripción de la empresa" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_companies",
      description: "Busca empresas en el CRM por nombre o dominio. Usa esta función para encontrar información de una empresa.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Término de búsqueda (nombre o dominio)" },
        },
        required: ["query"],
      },
    },
  },
  // ===== TAREAS =====
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Crea una nueva tarea o actividad en el CRM. Usa esta función cuando el usuario pida crear una tarea, recordatorio o actividad.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la tarea (requerido)" },
          description: { type: "string", description: "Descripción de la tarea" },
          type: { type: "string", enum: ["call", "email", "meeting", "task", "follow_up"], description: "Tipo de actividad" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Prioridad" },
          due_date: { type: "string", description: "Fecha de vencimiento en formato YYYY-MM-DD" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_meeting",
      description: "Programa una reunión o llamada con un contacto. Crea una actividad de tipo meeting.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la reunión (requerido)" },
          contact_email: { type: "string", description: "Email del contacto para la reunión" },
          date: { type: "string", description: "Fecha de la reunión (YYYY-MM-DD)" },
          time: { type: "string", description: "Hora de la reunión (HH:MM)" },
          description: { type: "string", description: "Descripción o agenda de la reunión" },
        },
        required: ["title"],
      },
    },
  },
  // ===== OPORTUNIDADES =====
  {
    type: "function",
    function: {
      name: "create_opportunity",
      description: "Crea una nueva oportunidad de venta en el pipeline. Usa esta función cuando el usuario pida crear un deal u oportunidad.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la oportunidad (requerido)" },
          value: { type: "number", description: "Valor estimado en dólares" },
          company_name: { type: "string", description: "Nombre de la empresa asociada" },
          contact_email: { type: "string", description: "Email del contacto asociado" },
          expected_close_date: { type: "string", description: "Fecha esperada de cierre (YYYY-MM-DD)" },
          description: { type: "string", description: "Descripción de la oportunidad" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_opportunity_stage",
      description: "Mueve una oportunidad a otra etapa del pipeline. Usa esta función para actualizar el progreso de un deal.",
      parameters: {
        type: "object",
        properties: {
          opportunity_title: { type: "string", description: "Título de la oportunidad a actualizar" },
          new_stage: { type: "string", description: "Nueva etapa: 'Contacto Inicial', 'Calificación', 'Propuesta', 'Negociación', 'Ganado', 'Perdido'" },
        },
        required: ["opportunity_title", "new_stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Obtiene un resumen completo del pipeline de ventas con valor por etapa, deals en riesgo y métricas clave.",
      parameters: {
        type: "object",
        properties: {
          include_closed: { type: "boolean", description: "Incluir deals cerrados (ganados/perdidos)" },
          days_range: { type: "number", description: "Rango de días para análisis (default: 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_deal_health",
      description: "Analiza la salud de una oportunidad específica basándose en actividad reciente, tiempo en etapa, y engagement. Útil para saber si un deal está en riesgo.",
      parameters: {
        type: "object",
        properties: {
          opportunity_id: { type: "string", description: "ID de la oportunidad" },
          company_name: { type: "string", description: "Nombre de la empresa (alternativa al ID)" },
        },
      },
    },
  },
  // ===== TIMELINE E HISTORIAL =====
  {
    type: "function",
    function: {
      name: "search_timeline",
      description: "Busca en el historial de interacciones (emails, reuniones, WhatsApp, etc). Útil para encontrar conversaciones pasadas o ver qué se habló con un contacto/empresa.",
      parameters: {
        type: "object",
        properties: {
          contact_email: { type: "string", description: "Buscar interacciones con este contacto" },
          company_name: { type: "string", description: "Buscar interacciones con esta empresa" },
          entry_type: { type: "string", enum: ["email", "meeting", "call", "note", "whatsapp"], description: "Tipo de interacción" },
          search_text: { type: "string", description: "Buscar por contenido específico" },
          days_ago: { type: "number", description: "Últimos X días (default: 30)" },
          limit: { type: "number", description: "Número de resultados (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_promises",
      description: "Busca compromisos hechos en conversaciones (emails, reuniones) que aún no se han cumplido. Detecta action items pendientes.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "overdue", "all"], description: "Estado de los compromisos" },
          contact_email: { type: "string", description: "Filtrar por contacto específico" },
          days_range: { type: "number", description: "Buscar en los últimos X días (default: 14)" },
        },
      },
    },
  },
  // ===== RECOMENDACIONES =====
  {
    type: "function",
    function: {
      name: "get_next_best_action",
      description: "Sugiere la siguiente mejor acción para un contacto, empresa o deal basándose en el historial y estado actual.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contact", "company", "opportunity"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Email del contacto, nombre de empresa, o ID de oportunidad" },
        },
        required: ["entity_type", "entity_identifier"],
      },
    },
  },
  // ===== NOTAS =====
  {
    type: "function",
    function: {
      name: "add_note",
      description: "Agrega una nota a un contacto o empresa existente.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contact", "company"], description: "Tipo de entidad: 'contact' o 'company'" },
          entity_identifier: { type: "string", description: "Email del contacto o nombre de la empresa" },
          note_content: { type: "string", description: "Contenido de la nota (requerido)" },
        },
        required: ["note_content"],
      },
    },
  },
  // ===== EQUIPO Y COLABORACION =====
  {
    type: "function",
    function: {
      name: "get_team_summary",
      description: "Obtiene un resumen del equipo: organización, miembros, roles, cuotas y progreso de ventas. Usa esta función cuando el usuario pregunte sobre el equipo, la organización o quién está en el equipo.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_member_info",
      description: "Obtiene información detallada de un miembro del equipo por nombre o email.",
      parameters: {
        type: "object",
        properties: {
          member_identifier: { type: "string", description: "Email o nombre del miembro del equipo" },
        },
        required: ["member_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quotas_progress",
      description: "Muestra el progreso de cuotas de ventas del equipo o de un miembro específico.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro (opcional, si no se proporciona muestra todo el equipo)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_contact",
      description: "Asigna un contacto a un miembro del equipo.",
      parameters: {
        type: "object",
        properties: {
          contact_email: { type: "string", description: "Email del contacto a asignar" },
          assigned_to_email: { type: "string", description: "Email del miembro del equipo al que se asigna" },
        },
        required: ["contact_email", "assigned_to_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_company",
      description: "Asigna una empresa a un miembro del equipo.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string", description: "Nombre de la empresa a asignar" },
          assigned_to_email: { type: "string", description: "Email del miembro del equipo al que se asigna" },
        },
        required: ["company_name", "assigned_to_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_opportunity",
      description: "Asigna una oportunidad a un miembro del equipo.",
      parameters: {
        type: "object",
        properties: {
          opportunity_title: { type: "string", description: "Título de la oportunidad a asignar" },
          assigned_to_email: { type: "string", description: "Email del miembro del equipo al que se asigna" },
        },
        required: ["opportunity_title", "assigned_to_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_assignments",
      description: "Lista entidades (contactos, empresas, oportunidades) asignadas al usuario actual o a un miembro específico.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro (opcional, por defecto el usuario actual)" },
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities", "all"], description: "Tipo de entidad a listar (default: all)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_team_comment",
      description: "Agrega un comentario colaborativo a una entidad (contacto, empresa u oportunidad). Soporta @menciones a miembros del equipo.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Email del contacto, nombre de empresa o título de oportunidad" },
          content: { type: "string", description: "Contenido del comentario. Usa @nombre para mencionar" },
        },
        required: ["entity_type", "entity_identifier", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_entity_comments",
      description: "Obtiene los comentarios de una entidad (contacto, empresa u oportunidad).",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Email del contacto, nombre de empresa o título de oportunidad" },
          limit: { type: "number", description: "Número máximo de comentarios (default: 10)" },
        },
        required: ["entity_type", "entity_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_feed",
      description: "Obtiene la actividad reciente del equipo (quién creó, editó, asignó o comentó qué).",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities", "activities"], description: "Filtrar por tipo de entidad (opcional)" },
          entity_id: { type: "string", description: "Filtrar por ID de entidad específica (opcional)" },
          limit: { type: "number", description: "Número máximo de actividades (default: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_team_member",
      description: "Notifica a un miembro del equipo mencionándolo en un comentario sobre una entidad.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro a notificar" },
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Email del contacto, nombre de empresa o título de oportunidad" },
          message: { type: "string", description: "Mensaje de notificación" },
        },
        required: ["member_email", "entity_type", "entity_identifier", "message"],
      },
    },
  },
];

// Types for team context
interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  quota_monthly: number | null;
  quota_quarterly: number | null;
  deals_closed_value: number | null;
  is_active: boolean;
  avatar_url: string | null;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  max_users: number;
}

interface TeamContext {
  organization: Organization | null;
  currentMember: TeamMember | null;
  teamMembers: TeamMember[];
  recentActivity: Array<{
    user_name: string;
    action: string;
    entity_type: string;
    entity_name: string;
    created_at: string;
  }>;
}

const buildSystemPrompt = (crmContext: {
  contactsCount: number;
  companiesCount: number;
  opportunitiesCount: number;
  tasksCount: number;
  pendingTasks: number;
  pipelineValue: number;
  recentContacts: Array<{ name: string; email: string; company?: string }>;
  recentOpportunities: Array<{ title: string; value: number; stage?: string }>;
  upcomingTasks: Array<{ title: string; dueDate?: string; priority?: string }>;
  teamContext: TeamContext;
}) => {
  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Manager',
    sales_rep: 'Representante de Ventas',
    viewer: 'Visor',
  };

  const rolePermissions: Record<string, { can: string[]; cannot: string[] }> = {
    admin: { can: ['crear', 'editar', 'eliminar', 'asignar', 'comentar', 'gestionar equipo'], cannot: [] },
    manager: { can: ['crear', 'editar', 'asignar', 'comentar'], cannot: ['eliminar usuarios', 'cambiar configuración'] },
    sales_rep: { can: ['crear', 'editar', 'comentar'], cannot: ['asignar a otros', 'eliminar'] },
    viewer: { can: ['ver datos'], cannot: ['crear', 'editar', 'eliminar', 'asignar', 'comentar'] },
  };

  const { teamContext } = crmContext;
  const currentRole = teamContext.currentMember?.role || 'viewer';
  const permissions = rolePermissions[currentRole] || rolePermissions.viewer;

  let teamSection = '';
  if (teamContext.organization) {
    teamSection = `
## 👥 Datos del Equipo:

**Organización:** ${teamContext.organization.name} (Plan: ${teamContext.organization.plan})
**Tu rol:** ${roleLabels[currentRole] || currentRole}
**Equipo:** ${teamContext.teamMembers.filter(m => m.is_active).length} miembros activos

**Miembros del equipo:**
${teamContext.teamMembers.length > 0 
  ? teamContext.teamMembers.map(m => {
      const quotaProgress = m.quota_monthly && m.deals_closed_value 
        ? ` - Cuota: $${(m.deals_closed_value || 0).toLocaleString()}/$${(m.quota_monthly || 0).toLocaleString()}`
        : '';
      return `- ${m.full_name || m.email} (${roleLabels[m.role] || m.role}) - ${m.email}${quotaProgress}`;
    }).join('\n')
  : '- No hay miembros registrados'}

**Actividad reciente del equipo:**
${teamContext.recentActivity.length > 0
  ? teamContext.recentActivity.slice(0, 5).map(a => {
      const timeAgo = getTimeAgo(new Date(a.created_at));
      return `- ${a.user_name || 'Usuario'} ${a.action} ${a.entity_type} "${a.entity_name || 'N/A'}" ${timeAgo}`;
    }).join('\n')
  : '- No hay actividad reciente'}

**Tus permisos:**
- Puedes: ${permissions.can.join(', ')}
${permissions.cannot.length > 0 ? `- No puedes: ${permissions.cannot.join(', ')}` : ''}
`;
  }

  return `Eres un asistente de CRM inteligente y amigable. Tu objetivo es ayudar a los usuarios a gestionar sus contactos, empresas, oportunidades de venta, tareas y colaboración en equipo de manera eficiente.

## Datos del CRM del usuario (EN TIEMPO REAL):

📊 **Resumen**:
- Contactos: ${crmContext.contactsCount}
- Empresas: ${crmContext.companiesCount}
- Oportunidades: ${crmContext.opportunitiesCount}
- Tareas: ${crmContext.tasksCount} (${crmContext.pendingTasks} pendientes)
- Valor total del pipeline: $${crmContext.pipelineValue.toLocaleString()}

📇 **Contactos recientes**:
${crmContext.recentContacts.length > 0 
  ? crmContext.recentContacts.map(c => `- ${c.name} (${c.email})${c.company ? ` - ${c.company}` : ''}`).join('\n')
  : '- No hay contactos registrados'}

💰 **Oportunidades activas**:
${crmContext.recentOpportunities.length > 0
  ? crmContext.recentOpportunities.map(o => `- ${o.title}: $${o.value.toLocaleString()}${o.stage ? ` (${o.stage})` : ''}`).join('\n')
  : '- No hay oportunidades activas'}

📋 **Tareas próximas**:
${crmContext.upcomingTasks.length > 0
  ? crmContext.upcomingTasks.map(t => `- ${t.title}${t.dueDate ? ` (vence: ${t.dueDate})` : ''}${t.priority ? ` [${t.priority}]` : ''}`).join('\n')
  : '- No hay tareas pendientes'}
${teamSection}
## Tus capacidades:
- **Consultar datos**: Puedes informar sobre contactos, empresas, oportunidades y tareas del usuario
- **Crear registros**: Puedes crear contactos, empresas, tareas y oportunidades usando las funciones disponibles
- **Actualizar registros**: Puedes actualizar contactos existentes
- **Buscar**: Puedes buscar contactos y empresas por nombre, email o dominio con filtros avanzados
- **Pipeline**: Puedes ver el resumen del pipeline, analizar salud de deals y mover oportunidades entre etapas
- **Timeline**: Puedes buscar en el historial de interacciones (emails, reuniones, WhatsApp)
- **Compromisos**: Puedes buscar promesas y action items pendientes de conversaciones
- **Reuniones**: Puedes programar reuniones y llamadas
- **Notas**: Puedes agregar notas a contactos y empresas
- **Recomendaciones**: Puedes sugerir la siguiente mejor acción para contactos, empresas o deals
- **Análisis**: Proporcionar insights sobre la actividad comercial basándote en los datos reales
- **Equipo**: Puedes consultar información del equipo, asignar entidades a miembros, y gestionar comentarios colaborativos
- **Colaboración**: Puedes agregar comentarios, mencionar miembros del equipo, y ver el activity feed

## IMPORTANTE - Funciones disponibles:
### Contactos y Empresas:
- **create_contact**: Crear un nuevo contacto (requiere email)
- **update_contact**: Actualizar información de un contacto existente
- **search_contacts**: Buscar contactos con filtros avanzados (nombre, empresa, WhatsApp)
- **create_company**: Crear una nueva empresa (requiere nombre)
- **search_companies**: Buscar empresas por nombre o dominio

### Tareas y Reuniones:
- **create_task**: Crear una tarea o actividad
- **schedule_meeting**: Programar una reunión o llamada

### Pipeline y Oportunidades:
- **create_opportunity**: Crear una oportunidad de venta en el pipeline
- **update_opportunity_stage**: Mover una oportunidad a otra etapa
- **get_pipeline_summary**: Obtener resumen del pipeline con valores por etapa y deals en riesgo
- **analyze_deal_health**: Analizar la salud de una oportunidad específica

### Timeline y Análisis:
- **search_timeline**: Buscar en el historial de interacciones
- **find_promises**: Buscar compromisos y action items pendientes
- **get_next_best_action**: Obtener sugerencia de la siguiente mejor acción
- **add_note**: Agregar una nota a un contacto o empresa

### Equipo y Colaboración:
- **get_team_summary**: Obtener resumen del equipo con miembros, roles y cuotas
- **get_member_info**: Obtener información detallada de un miembro
- **get_quotas_progress**: Ver progreso de cuotas del equipo
- **assign_contact**: Asignar un contacto a un miembro del equipo
- **assign_company**: Asignar una empresa a un miembro del equipo
- **assign_opportunity**: Asignar una oportunidad a un miembro del equipo
- **get_my_assignments**: Ver entidades asignadas a mí o a otro miembro
- **add_team_comment**: Agregar comentario colaborativo con @menciones
- **get_entity_comments**: Ver comentarios de una entidad
- **get_activity_feed**: Ver actividad reciente del equipo
- **notify_team_member**: Notificar a un miembro mencionándolo en un comentario

## Directrices:
- Responde siempre en español
- Usa formato markdown para mejor legibilidad (negritas, listas, emojis)
- Sé conciso pero útil
- Cuando el usuario pregunte por datos, usa la información real proporcionada arriba
- Si el usuario pregunta algo que no puedes hacer, sugiere alternativas
- Mantén un tono profesional pero cercano
- **IMPORTANTE**: Si el usuario es 'viewer', informa que no tiene permisos para acciones de escritura

## REGLAS ESTRICTAS DE FUNCTION CALLING:
1. **NUNCA** digas que creaste algo sin usar la función correspondiente
2. Si el usuario pide crear un contacto, **DEBES** usar create_contact - NO simules la creación
3. Si el usuario pide crear una empresa, **DEBES** usar create_company - NO simules la creación
4. Si el usuario pide crear una tarea, **DEBES** usar create_task - NO simules la creación
5. Si el usuario pide crear una oportunidad/deal, **DEBES** usar create_opportunity
6. Si faltan datos obligatorios (email para contactos, nombre para empresas/tareas/oportunidades), **PRIMERO** pregunta por esos datos
7. Solo confirma la creación **DESPUÉS** de recibir el resultado exitoso de la función
8. Si la función falla, informa al usuario del error específico
9. Para asignaciones, verifica que el usuario tenga permisos (admin, manager, o sales_rep para auto-asignación)

## Navegación del CRM:
- **Dashboard** (/dashboard): Vista general con estadísticas
- **Contactos** (/contacts): Gestión de personas
- **Empresas** (/companies): Gestión de organizaciones
- **Pipeline** (/pipeline): Tablero Kanban de oportunidades
- **Tareas** (/tasks): Lista de actividades pendientes
- **Equipo** (/team): Gestión del equipo y miembros
- **Configuración** (/settings): Integraciones y preferencias
- **Chat** (/chat): Asistente IA (donde estamos ahora)`;
};

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `hace ${diffMins} minutos`;
  if (diffHours < 24) return `hace ${diffHours} horas`;
  if (diffDays === 1) return `hace 1 día`;
  return `hace ${diffDays} días`;
}

async function fetchCRMContext(supabase: any, userId: string) {
  try {
    const [
      contactsResult,
      companiesResult,
      opportunitiesResult,
      activitiesResult,
      teamMemberResult,
    ] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name, email, companies(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('companies').select('id').limit(1000),
      supabase.from('opportunities').select('id, title, value, status, stage_id, stages(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('activities').select('id, title, due_date, priority, completed').order('due_date', { ascending: true }).limit(10),
      supabase.from('team_members').select('*, organizations(*)').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    ]);

    const contacts = contactsResult.data || [];
    const companies = companiesResult.data || [];
    const opportunities = opportunitiesResult.data || [];
    const activities = activitiesResult.data || [];
    const currentMember = teamMemberResult.data;

    const pendingTasks = activities.filter((a: any) => !a.completed);
    const pipelineValue = opportunities
      .filter((o: any) => o.status === 'open')
      .reduce((sum: number, o: any) => sum + (o.value || 0), 0);

    // Fetch team context if user has an organization
    let teamContext: TeamContext = {
      organization: null,
      currentMember: null,
      teamMembers: [],
      recentActivity: [],
    };

    if (currentMember?.organization_id) {
      const [orgResult, teamResult, activityFeedResult] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', currentMember.organization_id).single(),
        supabase.from('team_members').select('*').eq('organization_id', currentMember.organization_id).eq('is_active', true),
        supabase.from('activity_feed').select('*').eq('organization_id', currentMember.organization_id).order('created_at', { ascending: false }).limit(10),
      ]);

      teamContext = {
        organization: orgResult.data,
        currentMember: currentMember,
        teamMembers: teamResult.data || [],
        recentActivity: (activityFeedResult.data || []).map((a: any) => ({
          user_name: a.user_name || 'Usuario',
          action: a.action,
          entity_type: a.entity_type,
          entity_name: a.entity_name || '',
          created_at: a.created_at,
        })),
      };
    }

    return {
      contactsCount: contacts.length,
      companiesCount: companies.length,
      opportunitiesCount: opportunities.length,
      tasksCount: activities.length,
      pendingTasks: pendingTasks.length,
      pipelineValue,
      recentContacts: contacts.slice(0, 5).map((c: any) => ({
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sin nombre',
        email: c.email,
        company: c.companies?.name,
      })),
      recentOpportunities: opportunities.slice(0, 5).map((o: any) => ({
        title: o.title,
        value: o.value || 0,
        stage: o.stages?.name,
      })),
      upcomingTasks: pendingTasks.slice(0, 5).map((t: any) => ({
        title: t.title,
        dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES') : undefined,
        priority: t.priority,
      })),
      teamContext,
    };
  } catch (error) {
    console.error("Error fetching CRM context:", error);
    return {
      contactsCount: 0,
      companiesCount: 0,
      opportunitiesCount: 0,
      tasksCount: 0,
      pendingTasks: 0,
      pipelineValue: 0,
      recentContacts: [],
      recentOpportunities: [],
      upcomingTasks: [],
      teamContext: {
        organization: null,
        currentMember: null,
        teamMembers: [],
        recentActivity: [],
      },
    };
  }
}

// ===== TOOL EXECUTOR FUNCTIONS =====

async function updateContact(supabase: any, userId: string, args: any) {
  const updates: any = {};
  if (args.first_name !== undefined) updates.first_name = args.first_name;
  if (args.last_name !== undefined) updates.last_name = args.last_name;
  if (args.phone !== undefined) updates.phone = args.phone;
  if (args.whatsapp_number !== undefined) updates.whatsapp_number = args.whatsapp_number;
  if (args.job_title !== undefined) updates.job_title = args.job_title;
  if (args.notes !== undefined) updates.notes = args.notes;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('user_id', userId)
    .eq('email', args.email)
    .select()
    .single();

  if (error) {
    return { success: false, message: `❌ Error al actualizar contacto: ${error.message}` };
  }

  if (!data) {
    return { success: false, message: `❌ No se encontró un contacto con email "${args.email}"` };
  }

  return {
    success: true,
    message: `✅ Contacto ${args.email} actualizado correctamente`,
    data,
  };
}

async function searchContactsAdvanced(supabase: any, userId: string, args: any) {
  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, whatsapp_number, job_title, companies(name)')
    .eq('user_id', userId);

  if (args.query) {
    query = query.or(`first_name.ilike.%${args.query}%,last_name.ilike.%${args.query}%,email.ilike.%${args.query}%`);
  }

  if (args.has_whatsapp) {
    query = query.not('whatsapp_number', 'is', null);
  }

  const { data, error } = await query.limit(args.limit || 10);

  if (error) {
    return { success: false, message: `❌ Error al buscar contactos: ${error.message}` };
  }

  // Filter by company name if provided (post-query filter due to join limitations)
  let contacts = data || [];
  if (args.company_name) {
    contacts = contacts.filter((c: any) => 
      c.companies?.name?.toLowerCase().includes(args.company_name.toLowerCase())
    );
  }

  if (contacts.length === 0) {
    return { success: true, message: `No se encontraron contactos con los filtros especificados`, data: [] };
  }

  const results = contacts.map((c: any) => 
    `• ${c.first_name || ''} ${c.last_name || ''} - ${c.email}${c.whatsapp_number ? ` 📱 ${c.whatsapp_number}` : ''}${c.job_title ? ` (${c.job_title})` : ''}${c.companies?.name ? ` @ ${c.companies.name}` : ''}`
  ).join('\n');

  return {
    success: true,
    message: `📇 Encontrados ${contacts.length} contacto(s):\n${results}`,
    data: contacts,
  };
}

async function searchTimeline(supabase: any, userId: string, args: any) {
  const daysAgo = args.days_ago || 30;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

  let query = supabase
    .from('timeline_entries')
    .select('*, contacts(first_name, last_name, email), companies(name)')
    .eq('user_id', userId)
    .gte('occurred_at', dateThreshold.toISOString())
    .order('occurred_at', { ascending: false });

  if (args.entry_type) {
    query = query.eq('entry_type', args.entry_type);
  }

  if (args.search_text) {
    query = query.or(`subject.ilike.%${args.search_text}%,body.ilike.%${args.search_text}%,summary.ilike.%${args.search_text}%`);
  }

  const { data, error } = await query.limit(args.limit || 10);

  if (error) {
    return { success: false, message: `❌ Error al buscar en timeline: ${error.message}` };
  }

  let entries = data || [];

  // Filter by contact email if provided
  if (args.contact_email) {
    entries = entries.filter((e: any) => 
      e.contacts?.email?.toLowerCase() === args.contact_email.toLowerCase()
    );
  }

  // Filter by company name if provided
  if (args.company_name) {
    entries = entries.filter((e: any) => 
      e.companies?.name?.toLowerCase().includes(args.company_name.toLowerCase())
    );
  }

  if (entries.length === 0) {
    return { 
      success: true, 
      message: `No se encontraron interacciones en los últimos ${daysAgo} días con los filtros especificados.`, 
      data: [] 
    };
  }

  const typeEmoji: Record<string, string> = {
    email: '📧',
    meeting: '🤝',
    call: '📞',
    note: '📝',
    whatsapp: '💬',
    slack_message: '💬',
  };

  const results = entries.map((t: any) => {
    const emoji = typeEmoji[t.entry_type] || '📋';
    const date = new Date(t.occurred_at).toLocaleDateString('es-ES');
    const contact = t.contacts ? `${t.contacts.first_name || ''} ${t.contacts.last_name || ''}`.trim() : '';
    const company = t.companies?.name || '';
    const subject = t.subject || t.summary || 'Sin asunto';
    return `${emoji} **${date}** - ${subject}${contact ? ` (${contact})` : ''}${company ? ` @ ${company}` : ''}`;
  }).join('\n');

  return {
    success: true,
    message: `📋 **Historial de interacciones** (últimos ${daysAgo} días):\n\n${results}`,
    data: entries,
  };
}

async function analyzeDealHealth(supabase: any, userId: string, args: any) {
  // Find opportunity
  let query = supabase
    .from('opportunities')
    .select(`
      *,
      companies(name),
      stages(name, position),
      contacts(first_name, last_name, email)
    `)
    .eq('user_id', userId);

  if (args.opportunity_id) {
    query = query.eq('id', args.opportunity_id);
  } else if (args.company_name) {
    // First find company, then filter
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', `%${args.company_name}%`)
      .limit(1);

    if (companies && companies.length > 0) {
      query = query.eq('company_id', companies[0].id);
    }
  }

  const { data: opportunities, error } = await query.eq('status', 'open').limit(1);

  if (error || !opportunities || opportunities.length === 0) {
    return { success: false, message: '❌ Oportunidad no encontrada' };
  }

  const opportunity = opportunities[0];

  // Calculate health metrics
  const now = new Date();
  const createdAt = new Date(opportunity.created_at);
  const daysInPipeline = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Get last activity from timeline or activities
  const { data: lastTimelineEntry } = await supabase
    .from('timeline_entries')
    .select('occurred_at')
    .eq('user_id', userId)
    .eq('opportunity_id', opportunity.id)
    .order('occurred_at', { ascending: false })
    .limit(1);

  const { data: lastActivity } = await supabase
    .from('activities')
    .select('created_at')
    .eq('user_id', userId)
    .eq('opportunity_id', opportunity.id)
    .order('created_at', { ascending: false })
    .limit(1);

  let lastInteractionDate = createdAt;
  if (lastTimelineEntry?.length > 0) {
    lastInteractionDate = new Date(lastTimelineEntry[0].occurred_at);
  }
  if (lastActivity?.length > 0) {
    const actDate = new Date(lastActivity[0].created_at);
    if (actDate > lastInteractionDate) {
      lastInteractionDate = actDate;
    }
  }

  const daysSinceActivity = Math.floor((now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate health score (0-100)
  let healthScore = 100;
  const warnings: string[] = [];

  // Penalty for inactivity
  if (daysSinceActivity > 14) {
    healthScore -= 40;
    warnings.push(`⚠️ Sin actividad en ${daysSinceActivity} días`);
  } else if (daysSinceActivity > 7) {
    healthScore -= 20;
    warnings.push(`⚠️ ${daysSinceActivity} días desde la última actividad`);
  }

  // Penalty for time in pipeline
  if (daysInPipeline > 90) {
    healthScore -= 30;
    warnings.push(`⚠️ ${daysInPipeline} días en el pipeline (>90)`);
  } else if (daysInPipeline > 60) {
    healthScore -= 15;
    warnings.push(`⚠️ ${daysInPipeline} días en el pipeline (>60)`);
  }

  // Bonus for proximity to close date
  if (opportunity.expected_close_date) {
    const daysToClose = Math.floor((new Date(opportunity.expected_close_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToClose < 0) {
      healthScore -= 20;
      warnings.push(`⚠️ Fecha de cierre pasada hace ${Math.abs(daysToClose)} días`);
    } else if (daysToClose < 7 && daysToClose >= 0) {
      healthScore += 10;
    }
  }

  healthScore = Math.max(0, Math.min(100, healthScore));

  const status = healthScore >= 70 ? '🟢 Saludable' : healthScore >= 40 ? '🟡 En riesgo' : '🔴 Crítico';

  let message = `## 💊 Análisis de Salud del Deal\n\n`;
  message += `**${opportunity.title}**\n`;
  message += `- Empresa: ${opportunity.companies?.name || 'N/A'}\n`;
  message += `- Valor: $${(opportunity.value || 0).toLocaleString()}\n`;
  message += `- Etapa: ${opportunity.stages?.name || 'Sin etapa'}\n`;
  message += `- Probabilidad: ${opportunity.probability || 50}%\n\n`;
  message += `### Puntuación de Salud: ${healthScore}/100 ${status}\n\n`;
  message += `**Métricas:**\n`;
  message += `- Días en pipeline: ${daysInPipeline}\n`;
  message += `- Días desde última actividad: ${daysSinceActivity}\n\n`;
  
  if (warnings.length > 0) {
    message += `**Advertencias:**\n${warnings.join('\n')}\n`;
  }

  return {
    success: true,
    message,
    data: {
      deal: opportunity,
      health: { score: healthScore, status, daysInPipeline, daysSinceActivity, warnings }
    },
  };
}

async function getPipelineSummaryAdvanced(supabase: any, userId: string, args: any) {
  const daysRange = args.days_range || 30;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysRange);

  let query = supabase
    .from('opportunities')
    .select(`
      *,
      stages(name, position),
      companies(name)
    `)
    .eq('user_id', userId);

  if (!args.include_closed) {
    query = query.eq('status', 'open');
  }

  const { data: opportunities, error } = await query;

  if (error) {
    return { success: false, message: `❌ Error al obtener pipeline: ${error.message}` };
  }

  if (!opportunities || opportunities.length === 0) {
    return {
      success: true,
      message: `📊 Pipeline vacío. No hay oportunidades ${args.include_closed ? '' : 'activas'}.`,
      data: { total: 0, byStage: {} },
    };
  }

  // Group by stage
  const byStage: Record<string, { count: number; value: number; deals: any[] }> = {};
  let totalValue = 0;
  let weightedValue = 0;

  for (const opp of opportunities) {
    const stageName = opp.stages?.name || 'Sin etapa';
    if (!byStage[stageName]) {
      byStage[stageName] = { count: 0, value: 0, deals: [] };
    }
    byStage[stageName].count++;
    byStage[stageName].value += opp.value || 0;
    byStage[stageName].deals.push({ title: opp.title, company: opp.companies?.name, value: opp.value });
    totalValue += opp.value || 0;
    weightedValue += (opp.value || 0) * (opp.probability || 50) / 100;
  }

  // Find deals at risk (no recent activity)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: recentActivities } = await supabase
    .from('activities')
    .select('opportunity_id')
    .eq('user_id', userId)
    .gte('created_at', fourteenDaysAgo.toISOString());

  const activeOpportunityIds = new Set((recentActivities || []).map((a: any) => a.opportunity_id));

  const dealsAtRisk = opportunities.filter(
    (opp: any) => opp.status === 'open' && !activeOpportunityIds.has(opp.id)
  );

  // Build message
  let message = `## 📊 Resumen del Pipeline\n\n`;
  message += `**Período:** ${args.include_closed ? 'Todos los deals' : 'Solo deals activos'}\n\n`;

  const summary = Object.entries(byStage)
    .sort((a, b) => {
      const posA = opportunities.find((o: any) => o.stages?.name === a[0])?.stages?.position || 0;
      const posB = opportunities.find((o: any) => o.stages?.name === b[0])?.stages?.position || 0;
      return posA - posB;
    })
    .map(([stage, data]) => `• **${stage}**: ${data.count} deal(s) - $${data.value.toLocaleString()}`)
    .join('\n');

  message += `### Por Etapa:\n${summary}\n\n`;
  message += `### Totales:\n`;
  message += `- **Total:** ${opportunities.length} oportunidades\n`;
  message += `- **Valor total:** $${totalValue.toLocaleString()}\n`;
  message += `- **Valor ponderado:** $${Math.round(weightedValue).toLocaleString()}\n\n`;

  if (dealsAtRisk.length > 0) {
    message += `### ⚠️ Deals en Riesgo (sin actividad >14 días):\n`;
    message += dealsAtRisk.slice(0, 5).map((d: any) => 
      `• ${d.title}${d.companies?.name ? ` @ ${d.companies.name}` : ''} - $${(d.value || 0).toLocaleString()}`
    ).join('\n');
    if (dealsAtRisk.length > 5) {
      message += `\n... y ${dealsAtRisk.length - 5} más`;
    }
  }

  return {
    success: true,
    message,
    data: { 
      total: totalValue, 
      weighted: weightedValue,
      count: opportunities.length, 
      byStage,
      dealsAtRisk: dealsAtRisk.length
    },
  };
}

async function findPromises(supabase: any, userId: string, args: any) {
  const daysRange = args.days_range || 14;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysRange);

  let query = supabase
    .from('timeline_entries')
    .select('*, contacts(first_name, last_name, email), companies(name)')
    .eq('user_id', userId)
    .gte('occurred_at', dateThreshold.toISOString())
    .not('action_items', 'is', null);

  const { data: entries, error } = await query;

  if (error) {
    return { success: false, message: `❌ Error al buscar compromisos: ${error.message}` };
  }

  // Extract action items
  const promises: any[] = [];
  const now = new Date();

  (entries || []).forEach((entry: any) => {
    if (entry.action_items && Array.isArray(entry.action_items)) {
      entry.action_items.forEach((item: any) => {
        const dueDate = item.due_date ? new Date(item.due_date) : null;
        const isOverdue = dueDate && dueDate < now;
        const isPending = item.status !== 'completed';

        if (args.status === 'overdue' && !isOverdue) return;
        if (args.status === 'pending' && !isPending) return;

        // Filter by contact email if provided
        if (args.contact_email && entry.contacts?.email?.toLowerCase() !== args.contact_email.toLowerCase()) {
          return;
        }

        promises.push({
          text: item.text,
          assigned_to: item.assigned_to,
          due_date: item.due_date,
          status: item.status || 'pending',
          isOverdue,
          context: {
            from: entry.entry_type,
            date: new Date(entry.occurred_at).toLocaleDateString('es-ES'),
            contact: entry.contacts ? `${entry.contacts.first_name || ''} ${entry.contacts.last_name || ''}`.trim() : null,
            company: entry.companies?.name
          }
        });
      });
    }
  });

  if (promises.length === 0) {
    return {
      success: true,
      message: `No se encontraron compromisos ${args.status === 'overdue' ? 'vencidos' : args.status === 'pending' ? 'pendientes' : ''} en los últimos ${daysRange} días.`,
      data: [],
    };
  }

  const typeEmoji: Record<string, string> = {
    email: '📧',
    meeting: '🤝',
    call: '📞',
    note: '📝',
    whatsapp: '💬',
  };

  let message = `## 📋 Compromisos Encontrados\n\n`;
  message += promises.slice(0, 20).map((p, i) => {
    const emoji = typeEmoji[p.context.from] || '📋';
    const overdueTag = p.isOverdue ? ' 🔴 **VENCIDO**' : '';
    const dueDateStr = p.due_date ? ` (vence: ${new Date(p.due_date).toLocaleDateString('es-ES')})` : '';
    return `${i + 1}. ${emoji} **${p.text}**${dueDateStr}${overdueTag}\n   _De: ${p.context.from} el ${p.context.date}${p.context.contact ? ` con ${p.context.contact}` : ''}_`;
  }).join('\n\n');

  return {
    success: true,
    message,
    data: promises,
  };
}

async function getNextBestAction(supabase: any, userId: string, args: any) {
  let entity: any = null;
  let lastInteraction: Date | null = null;
  let entityName = '';

  if (args.entity_type === 'contact') {
    const { data } = await supabase
      .from('contacts')
      .select('*, companies(name)')
      .eq('user_id', userId)
      .eq('email', args.entity_identifier)
      .single();
    
    if (data) {
      entity = data;
      entityName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email;
      
      // Get last timeline entry
      const { data: timeline } = await supabase
        .from('timeline_entries')
        .select('occurred_at')
        .eq('user_id', userId)
        .eq('contact_id', data.id)
        .order('occurred_at', { ascending: false })
        .limit(1);
      
      if (timeline?.length > 0) {
        lastInteraction = new Date(timeline[0].occurred_at);
      } else if (data.last_contacted_at) {
        lastInteraction = new Date(data.last_contacted_at);
      }
    }
  } else if (args.entity_type === 'company') {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${args.entity_identifier}%`)
      .limit(1)
      .single();
    
    if (data) {
      entity = data;
      entityName = data.name;
      
      const { data: timeline } = await supabase
        .from('timeline_entries')
        .select('occurred_at')
        .eq('user_id', userId)
        .eq('company_id', data.id)
        .order('occurred_at', { ascending: false })
        .limit(1);
      
      if (timeline?.length > 0) {
        lastInteraction = new Date(timeline[0].occurred_at);
      }
    }
  } else if (args.entity_type === 'opportunity') {
    const { data } = await supabase
      .from('opportunities')
      .select('*, companies(name), stages(name)')
      .eq('user_id', userId)
      .or(`id.eq.${args.entity_identifier},title.ilike.%${args.entity_identifier}%`)
      .limit(1)
      .single();
    
    if (data) {
      entity = data;
      entityName = data.title;
      
      const { data: timeline } = await supabase
        .from('timeline_entries')
        .select('occurred_at')
        .eq('user_id', userId)
        .eq('opportunity_id', data.id)
        .order('occurred_at', { ascending: false })
        .limit(1);
      
      if (timeline?.length > 0) {
        lastInteraction = new Date(timeline[0].occurred_at);
      }
    }
  }

  if (!entity) {
    return { success: false, message: `❌ No se encontró ${args.entity_type === 'contact' ? 'el contacto' : args.entity_type === 'company' ? 'la empresa' : 'la oportunidad'} "${args.entity_identifier}"` };
  }

  const now = new Date();
  const daysSinceLastContact = lastInteraction 
    ? Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Determine best action
  let suggestedAction: string;
  let reason: string;
  let priority: 'high' | 'medium' | 'low';

  if (daysSinceLastContact > 30) {
    suggestedAction = "🔄 Reactivar relación";
    reason = `Han pasado ${daysSinceLastContact} días sin contacto. Envía un email o mensaje para retomar la conversación.`;
    priority = 'high';
  } else if (daysSinceLastContact > 14) {
    suggestedAction = "📞 Hacer seguimiento";
    reason = `${daysSinceLastContact} días desde el último contacto. Es buen momento para un check-in.`;
    priority = 'medium';
  } else if (args.entity_type === 'opportunity' && entity.stages?.name === 'Propuesta') {
    suggestedAction = "🤝 Programar reunión de seguimiento";
    reason = "La oportunidad está en etapa de Propuesta. Una reunión ayudaría a avanzar hacia el cierre.";
    priority = 'high';
  } else if (args.entity_type === 'opportunity' && entity.stages?.name === 'Negociación') {
    suggestedAction = "📝 Preparar oferta final";
    reason = "El deal está en negociación. Considera preparar términos finales o concesiones.";
    priority = 'high';
  } else {
    suggestedAction = "💡 Continuar nutriendo relación";
    reason = "Mantén la comunicación regular compartiendo contenido de valor o actualizaciones relevantes.";
    priority = 'low';
  }

  let message = `## 🎯 Siguiente Mejor Acción\n\n`;
  message += `**Entidad:** ${entityName} (${args.entity_type})\n`;
  message += `**Último contacto:** ${lastInteraction ? lastInteraction.toLocaleDateString('es-ES') : 'Nunca'}\n\n`;
  message += `### Recomendación:\n`;
  message += `**${suggestedAction}**\n\n`;
  message += `_${reason}_\n\n`;
  message += `**Prioridad:** ${priority === 'high' ? '🔴 Alta' : priority === 'medium' ? '🟡 Media' : '🟢 Baja'}`;

  return {
    success: true,
    message,
    data: {
      entity: { type: args.entity_type, name: entityName },
      lastContact: lastInteraction?.toISOString() || null,
      recommendation: { action: suggestedAction, reason, priority }
    },
  };
}

// ===== TEAM TOOL EXECUTOR FUNCTIONS =====

async function getTeamSummary(supabase: any, userId: string) {
  // Get current user's team member info
  const { data: currentMember, error: memberError } = await supabase
    .from('team_members')
    .select('*, organizations(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (memberError || !currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  const orgId = currentMember.organization_id;

  // Get all team members
  const { data: teamMembers, error: teamError } = await supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true);

  if (teamError) {
    return { success: false, message: `❌ Error al obtener equipo: ${teamError.message}` };
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Manager',
    sales_rep: 'Rep. Ventas',
    viewer: 'Visor',
  };

  const org = currentMember.organizations;
  let message = `## 👥 Resumen del Equipo\n\n`;
  message += `**Organización:** ${org?.name || 'Sin nombre'}\n`;
  message += `**Plan:** ${org?.plan || 'starter'}\n`;
  message += `**Miembros activos:** ${teamMembers?.length || 0} / ${org?.max_users || 3}\n\n`;

  message += `### Miembros:\n`;
  if (teamMembers && teamMembers.length > 0) {
    message += teamMembers.map((m: any) => {
      const quotaProgress = m.quota_monthly && m.deals_closed_value !== null
        ? ` • Cuota: $${(m.deals_closed_value || 0).toLocaleString()} / $${(m.quota_monthly || 0).toLocaleString()} (${Math.round((m.deals_closed_value || 0) / (m.quota_monthly || 1) * 100)}%)`
        : '';
      const isYou = m.user_id === userId ? ' ← **Tú**' : '';
      return `• **${m.full_name || m.email}** (${roleLabels[m.role] || m.role})${isYou}\n  📧 ${m.email}${quotaProgress}`;
    }).join('\n\n');
  } else {
    message += '• No hay miembros en el equipo';
  }

  return {
    success: true,
    message,
    data: {
      organization: org,
      members: teamMembers,
      currentMember,
    },
  };
}

async function getMemberInfo(supabase: any, userId: string, args: any) {
  // Get current user's organization
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  // Search for member by email or name
  const identifier = args.member_identifier.toLowerCase();
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', currentMember.organization_id)
    .eq('is_active', true);

  const member = members?.find((m: any) => 
    m.email.toLowerCase() === identifier ||
    m.email.toLowerCase().includes(identifier) ||
    (m.full_name && m.full_name.toLowerCase().includes(identifier))
  );

  if (!member) {
    return { success: false, message: `❌ No se encontró un miembro con "${args.member_identifier}"` };
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Manager',
    sales_rep: 'Representante de Ventas',
    viewer: 'Visor',
  };

  // Get member's assignments count
  const [contactsCount, companiesCount, opportunitiesCount] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id).eq('status', 'open'),
  ]);

  let message = `## 👤 Información del Miembro\n\n`;
  message += `**Nombre:** ${member.full_name || 'Sin nombre'}\n`;
  message += `**Email:** ${member.email}\n`;
  message += `**Rol:** ${roleLabels[member.role] || member.role}\n`;
  message += `**Se unió:** ${member.joined_at ? new Date(member.joined_at).toLocaleDateString('es-ES') : 'N/A'}\n\n`;

  message += `### Cuotas:\n`;
  message += `- **Mensual:** $${(member.quota_monthly || 0).toLocaleString()}\n`;
  message += `- **Trimestral:** $${(member.quota_quarterly || 0).toLocaleString()}\n`;
  message += `- **Ventas cerradas:** $${(member.deals_closed_value || 0).toLocaleString()}\n\n`;

  message += `### Asignaciones:\n`;
  message += `- Contactos: ${contactsCount.count || 0}\n`;
  message += `- Empresas: ${companiesCount.count || 0}\n`;
  message += `- Oportunidades activas: ${opportunitiesCount.count || 0}\n`;

  return {
    success: true,
    message,
    data: member,
  };
}

async function getQuotasProgress(supabase: any, userId: string, args: any) {
  // Get current user's organization
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  let query = supabase
    .from('team_members')
    .select('*')
    .eq('organization_id', currentMember.organization_id)
    .eq('is_active', true);

  if (args.member_email) {
    query = query.eq('email', args.member_email);
  }

  const { data: members, error } = await query;

  if (error || !members || members.length === 0) {
    return { success: false, message: args.member_email ? `❌ No se encontró el miembro ${args.member_email}` : '❌ No hay miembros en el equipo' };
  }

  let message = `## 📊 Progreso de Cuotas\n\n`;

  const totalQuota = members.reduce((sum: number, m: any) => sum + (m.quota_monthly || 0), 0);
  const totalClosed = members.reduce((sum: number, m: any) => sum + (m.deals_closed_value || 0), 0);
  const overallProgress = totalQuota > 0 ? Math.round((totalClosed / totalQuota) * 100) : 0;

  if (!args.member_email) {
    message += `### Resumen del Equipo:\n`;
    message += `- **Total cuota mensual:** $${totalQuota.toLocaleString()}\n`;
    message += `- **Total cerrado:** $${totalClosed.toLocaleString()}\n`;
    message += `- **Progreso general:** ${overallProgress}%\n\n`;
    message += `### Por Miembro:\n`;
  }

  members.forEach((m: any) => {
    const progress = m.quota_monthly > 0 ? Math.round((m.deals_closed_value || 0) / m.quota_monthly * 100) : 0;
    const progressBar = getProgressBar(progress);
    const status = progress >= 100 ? '🏆' : progress >= 75 ? '🟢' : progress >= 50 ? '🟡' : '🔴';
    
    message += `\n**${m.full_name || m.email}** ${status}\n`;
    message += `${progressBar} ${progress}%\n`;
    message += `$${(m.deals_closed_value || 0).toLocaleString()} / $${(m.quota_monthly || 0).toLocaleString()}\n`;
  });

  return {
    success: true,
    message,
    data: {
      members,
      totals: { quota: totalQuota, closed: totalClosed, progress: overallProgress },
    },
  };
}

function getProgressBar(percent: number): string {
  const filled = Math.min(10, Math.round(percent / 10));
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function assignEntity(supabase: any, userId: string, entityType: 'contacts' | 'companies' | 'opportunities', args: any) {
  // Get current user's team member info
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  // Check permissions
  const canAssign = ['admin', 'manager'].includes(currentMember.role);
  if (!canAssign) {
    return { success: false, message: '❌ No tienes permisos para asignar entidades. Solo admin y manager pueden hacerlo.' };
  }

  // Find the target team member
  const { data: targetMember } = await supabase
    .from('team_members')
    .select('user_id, full_name, email')
    .eq('organization_id', currentMember.organization_id)
    .eq('email', args.assigned_to_email)
    .eq('is_active', true)
    .maybeSingle();

  if (!targetMember) {
    return { success: false, message: `❌ No se encontró el miembro ${args.assigned_to_email} en tu equipo` };
  }

  // Find the entity
  let entity: any = null;
  let entityName = '';

  if (entityType === 'contacts') {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('email', args.contact_email)
      .maybeSingle();
    entity = data;
    entityName = data ? `${data.first_name || ''} ${data.last_name || ''} (${data.email})`.trim() : '';
  } else if (entityType === 'companies') {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', `%${args.company_name}%`)
      .limit(1)
      .maybeSingle();
    entity = data;
    entityName = data?.name || '';
  } else if (entityType === 'opportunities') {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title')
      .ilike('title', `%${args.opportunity_title}%`)
      .limit(1)
      .maybeSingle();
    entity = data;
    entityName = data?.title || '';
  }

  if (!entity) {
    const entityLabel = entityType === 'contacts' ? 'contacto' : entityType === 'companies' ? 'empresa' : 'oportunidad';
    const identifier = args.contact_email || args.company_name || args.opportunity_title;
    return { success: false, message: `❌ No se encontró ${entityLabel} "${identifier}"` };
  }

  // Update the entity
  const { error } = await supabase
    .from(entityType)
    .update({ assigned_to: targetMember.user_id })
    .eq('id', entity.id);

  if (error) {
    return { success: false, message: `❌ Error al asignar: ${error.message}` };
  }

  // Log to activity feed
  await supabase.from('activity_feed').insert({
    organization_id: currentMember.organization_id,
    user_id: userId,
    action: 'assigned',
    entity_type: entityType,
    entity_id: entity.id,
    entity_name: entityName,
    metadata: { assigned_to: targetMember.email, assigned_to_name: targetMember.full_name },
  });

  const entityLabel = entityType === 'contacts' ? 'Contacto' : entityType === 'companies' ? 'Empresa' : 'Oportunidad';
  return {
    success: true,
    message: `✅ ${entityLabel} "${entityName}" asignado a **${targetMember.full_name || targetMember.email}**`,
    data: { entity, assignedTo: targetMember },
  };
}

async function getMyAssignments(supabase: any, userId: string, args: any) {
  // Get current user's organization
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('organization_id, user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  // Determine target user
  let targetUserId = currentMember.user_id;
  let targetName = 'Tú';

  if (args.member_email) {
    const { data: targetMember } = await supabase
      .from('team_members')
      .select('user_id, full_name, email')
      .eq('organization_id', currentMember.organization_id)
      .eq('email', args.member_email)
      .eq('is_active', true)
      .maybeSingle();

    if (!targetMember) {
      return { success: false, message: `❌ No se encontró el miembro ${args.member_email}` };
    }
    targetUserId = targetMember.user_id;
    targetName = targetMember.full_name || targetMember.email;
  }

  const entityType = args.entity_type || 'all';
  const results: any = {};

  if (entityType === 'all' || entityType === 'contacts') {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, companies(name)')
      .eq('assigned_to', targetUserId)
      .limit(10);
    results.contacts = data || [];
  }

  if (entityType === 'all' || entityType === 'companies') {
    const { data } = await supabase
      .from('companies')
      .select('id, name, industry')
      .eq('assigned_to', targetUserId)
      .limit(10);
    results.companies = data || [];
  }

  if (entityType === 'all' || entityType === 'opportunities') {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title, value, status, stages(name)')
      .eq('assigned_to', targetUserId)
      .eq('status', 'open')
      .limit(10);
    results.opportunities = data || [];
  }

  let message = `## 📋 Asignaciones de ${targetName}\n\n`;

  if (results.contacts && results.contacts.length > 0) {
    message += `### 📇 Contactos (${results.contacts.length}):\n`;
    message += results.contacts.map((c: any) => 
      `• ${c.first_name || ''} ${c.last_name || ''} (${c.email})${c.companies?.name ? ` @ ${c.companies.name}` : ''}`
    ).join('\n');
    message += '\n\n';
  }

  if (results.companies && results.companies.length > 0) {
    message += `### 🏢 Empresas (${results.companies.length}):\n`;
    message += results.companies.map((c: any) => 
      `• ${c.name}${c.industry ? ` (${c.industry})` : ''}`
    ).join('\n');
    message += '\n\n';
  }

  if (results.opportunities && results.opportunities.length > 0) {
    message += `### 💰 Oportunidades (${results.opportunities.length}):\n`;
    message += results.opportunities.map((o: any) => 
      `• ${o.title} - $${(o.value || 0).toLocaleString()}${o.stages?.name ? ` (${o.stages.name})` : ''}`
    ).join('\n');
  }

  const totalCount = (results.contacts?.length || 0) + (results.companies?.length || 0) + (results.opportunities?.length || 0);
  if (totalCount === 0) {
    message = `## 📋 Asignaciones de ${targetName}\n\nNo hay entidades asignadas.`;
  }

  return {
    success: true,
    message,
    data: results,
  };
}

async function addTeamComment(supabase: any, userId: string, args: any) {
  // Get current user's team member info
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('organization_id, role, full_name, avatar_url, email')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  // Check permissions
  if (currentMember.role === 'viewer') {
    return { success: false, message: '❌ Los usuarios con rol Visor no pueden agregar comentarios' };
  }

  // Find the entity
  let entity: any = null;
  let entityName = '';

  if (args.entity_type === 'contacts') {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('email', args.entity_identifier)
      .maybeSingle();
    entity = data;
    entityName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email : '';
  } else if (args.entity_type === 'companies') {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', `%${args.entity_identifier}%`)
      .limit(1)
      .maybeSingle();
    entity = data;
    entityName = data?.name || '';
  } else if (args.entity_type === 'opportunities') {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title')
      .ilike('title', `%${args.entity_identifier}%`)
      .limit(1)
      .maybeSingle();
    entity = data;
    entityName = data?.title || '';
  }

  if (!entity) {
    const entityLabel = args.entity_type === 'contacts' ? 'contacto' : args.entity_type === 'companies' ? 'empresa' : 'oportunidad';
    return { success: false, message: `❌ No se encontró ${entityLabel} "${args.entity_identifier}"` };
  }

  // Extract mentions from content (format: @name)
  const mentionRegex = /@(\w+)/g;
  const mentionMatches = args.content.match(mentionRegex) || [];
  const mentions: string[] = [];

  // Resolve mentions to user IDs
  if (mentionMatches.length > 0) {
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id, full_name, email')
      .eq('organization_id', currentMember.organization_id)
      .eq('is_active', true);

    for (const mention of mentionMatches) {
      const name = mention.replace('@', '').toLowerCase();
      const member = teamMembers?.find((m: any) => 
        (m.full_name && m.full_name.toLowerCase().includes(name)) ||
        m.email.toLowerCase().includes(name)
      );
      if (member) {
        mentions.push(member.user_id);
      }
    }
  }

  // Insert comment
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      organization_id: currentMember.organization_id,
      user_id: userId,
      user_name: currentMember.full_name,
      user_avatar: currentMember.avatar_url,
      entity_type: args.entity_type,
      entity_id: entity.id,
      content: args.content,
      mentions,
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: `❌ Error al agregar comentario: ${error.message}` };
  }

  // Log to activity feed
  await supabase.from('activity_feed').insert({
    organization_id: currentMember.organization_id,
    user_id: userId,
    user_name: currentMember.full_name,
    action: 'commented',
    entity_type: args.entity_type,
    entity_id: entity.id,
    entity_name: entityName,
  });

  const entityLabel = args.entity_type === 'contacts' ? 'contacto' : args.entity_type === 'companies' ? 'empresa' : 'oportunidad';
  return {
    success: true,
    message: `✅ Comentario agregado a ${entityLabel} "${entityName}"${mentions.length > 0 ? ` (${mentions.length} mención(es))` : ''}`,
    data: comment,
  };
}

async function getEntityComments(supabase: any, userId: string, args: any) {
  // Get current user's organization
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  // Find the entity
  let entity: any = null;
  let entityName = '';

  if (args.entity_type === 'contacts') {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('email', args.entity_identifier)
      .maybeSingle();
    entity = data;
    entityName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email : '';
  } else if (args.entity_type === 'companies') {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', `%${args.entity_identifier}%`)
      .limit(1)
      .maybeSingle();
    entity = data;
    entityName = data?.name || '';
  } else if (args.entity_type === 'opportunities') {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title')
      .ilike('title', `%${args.entity_identifier}%`)
      .limit(1)
      .maybeSingle();
    entity = data;
    entityName = data?.title || '';
  }

  if (!entity) {
    const entityLabel = args.entity_type === 'contacts' ? 'contacto' : args.entity_type === 'companies' ? 'empresa' : 'oportunidad';
    return { success: false, message: `❌ No se encontró ${entityLabel} "${args.entity_identifier}"` };
  }

  // Get comments
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .eq('entity_type', args.entity_type)
    .eq('entity_id', entity.id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(args.limit || 10);

  if (error) {
    return { success: false, message: `❌ Error al obtener comentarios: ${error.message}` };
  }

  const entityLabel = args.entity_type === 'contacts' ? 'contacto' : args.entity_type === 'companies' ? 'empresa' : 'oportunidad';

  if (!comments || comments.length === 0) {
    return {
      success: true,
      message: `No hay comentarios para ${entityLabel} "${entityName}"`,
      data: [],
    };
  }

  let message = `## 💬 Comentarios de ${entityLabel} "${entityName}"\n\n`;
  message += comments.map((c: any) => {
    const pinned = c.is_pinned ? '📌 ' : '';
    const date = new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `${pinned}**${c.user_name || 'Usuario'}** - ${date}\n${c.content}`;
  }).join('\n\n---\n\n');

  return {
    success: true,
    message,
    data: comments,
  };
}

async function getActivityFeedTool(supabase: any, userId: string, args: any) {
  // Get current user's organization
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!currentMember) {
    return { success: false, message: '❌ No perteneces a ninguna organización' };
  }

  let query = supabase
    .from('activity_feed')
    .select('*')
    .eq('organization_id', currentMember.organization_id)
    .order('created_at', { ascending: false });

  if (args.entity_type) {
    query = query.eq('entity_type', args.entity_type);
  }

  if (args.entity_id) {
    query = query.eq('entity_id', args.entity_id);
  }

  const { data: activities, error } = await query.limit(args.limit || 20);

  if (error) {
    return { success: false, message: `❌ Error al obtener actividad: ${error.message}` };
  }

  if (!activities || activities.length === 0) {
    return {
      success: true,
      message: 'No hay actividad reciente en el equipo.',
      data: [],
    };
  }

  const actionLabels: Record<string, string> = {
    created: 'creó',
    updated: 'actualizó',
    deleted: 'eliminó',
    assigned: 'asignó',
    stage_changed: 'movió',
    commented: 'comentó en',
  };

  const entityLabels: Record<string, string> = {
    contacts: 'contacto',
    companies: 'empresa',
    opportunities: 'oportunidad',
    activities: 'tarea',
  };

  let message = `## 📜 Actividad Reciente del Equipo\n\n`;
  message += activities.map((a: any) => {
    const action = actionLabels[a.action] || a.action;
    const entity = entityLabels[a.entity_type] || a.entity_type;
    const timeAgo = getTimeAgo(new Date(a.created_at));
    return `• **${a.user_name || 'Usuario'}** ${action} ${entity} "${a.entity_name || 'N/A'}" ${timeAgo}`;
  }).join('\n');

  return {
    success: true,
    message,
    data: activities,
  };
}

async function notifyTeamMember(supabase: any, userId: string, args: any) {
  // This is essentially adding a comment with a mention
  return await addTeamComment(supabase, userId, {
    entity_type: args.entity_type,
    entity_identifier: args.entity_identifier,
    content: `@${args.member_email.split('@')[0]} ${args.message}`,
  });
}

// Execute tool calls
async function executeTool(supabase: any, userId: string, toolName: string, args: any): Promise<{ success: boolean; message: string; data?: any }> {
  console.log(`Executing tool: ${toolName} with args:`, args);
  
  try {
    switch (toolName) {
      case "create_contact": {
        // Find company if provided
        let companyId = null;
        if (args.company_name) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', userId)
            .ilike('name', `%${args.company_name}%`)
            .limit(1)
            .single();
          companyId = company?.id || null;
        }

        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            email: args.email,
            first_name: args.first_name || null,
            last_name: args.last_name || null,
            phone: args.phone || null,
            whatsapp_number: args.whatsapp_number || null,
            job_title: args.job_title || null,
            notes: args.notes || null,
            company_id: companyId,
          })
          .select()
          .single();
        
        if (error) throw error;
        return {
          success: true,
          message: `✅ Contacto creado exitosamente: ${args.first_name || ''} ${args.last_name || ''} (${args.email})`,
          data,
        };
      }

      case "update_contact":
        return await updateContact(supabase, userId, args);
      
      case "search_contacts":
        return await searchContactsAdvanced(supabase, userId, args);
      
      case "create_company": {
        const { data, error } = await supabase
          .from('companies')
          .insert({
            user_id: userId,
            name: args.name,
            industry: args.industry || null,
            website: args.website || null,
            phone: args.phone || null,
            city: args.city || null,
            country: args.country || null,
            description: args.description || null,
          })
          .select()
          .single();
        
        if (error) throw error;
        return {
          success: true,
          message: `✅ Empresa creada exitosamente: ${args.name}`,
          data,
        };
      }
      
      case "search_companies": {
        const { data: companies, error } = await supabase
          .from('companies')
          .select('id, name, industry, website, city, country')
          .eq('user_id', userId)
          .or(`name.ilike.%${args.query}%,domain.ilike.%${args.query}%`)
          .limit(10);

        if (error) throw error;

        if (!companies || companies.length === 0) {
          return {
            success: true,
            message: `No se encontraron empresas que coincidan con "${args.query}"`,
            data: [],
          };
        }

        const results = companies.map((c: any) => 
          `• ${c.name}${c.industry ? ` (${c.industry})` : ''}${c.city ? ` - ${c.city}` : ''}${c.website ? ` - ${c.website}` : ''}`
        ).join('\n');

        return {
          success: true,
          message: `🏢 Encontradas ${companies.length} empresa(s):\n${results}`,
          data: companies,
        };
      }

      case "create_task": {
        const { data, error } = await supabase
          .from('activities')
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description || null,
            type: args.type || 'task',
            priority: args.priority || 'medium',
            due_date: args.due_date || null,
            completed: false,
          })
          .select()
          .single();
        
        if (error) throw error;
        return {
          success: true,
          message: `✅ Tarea creada exitosamente: ${args.title}`,
          data,
        };
      }

      case "schedule_meeting": {
        let contactId = null;
        if (args.contact_email) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', userId)
            .ilike('email', args.contact_email)
            .limit(1)
            .single();
          contactId = contact?.id || null;
        }

        let dueDate = null;
        if (args.date) {
          dueDate = args.time ? `${args.date}T${args.time}:00` : `${args.date}T09:00:00`;
        }

        const { data, error } = await supabase
          .from('activities')
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description || null,
            type: 'meeting',
            priority: 'high',
            due_date: dueDate,
            contact_id: contactId,
            completed: false,
          })
          .select()
          .single();
        
        if (error) throw error;

        const dateStr = args.date ? ` para el ${args.date}${args.time ? ` a las ${args.time}` : ''}` : '';
        return {
          success: true,
          message: `✅ Reunión programada: "${args.title}"${dateStr}`,
          data,
        };
      }

      case "create_opportunity": {
        let companyId = null;
        if (args.company_name) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', userId)
            .ilike('name', `%${args.company_name}%`)
            .limit(1)
            .single();
          companyId = company?.id || null;
        }

        let contactId = null;
        if (args.contact_email) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('user_id', userId)
            .ilike('email', args.contact_email)
            .limit(1)
            .single();
          contactId = contact?.id || null;
        }

        const { data: pipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('user_id', userId)
          .eq('is_default', true)
          .single();

        let stageId = null;
        if (pipeline) {
          const { data: stage } = await supabase
            .from('stages')
            .select('id')
            .eq('pipeline_id', pipeline.id)
            .order('position', { ascending: true })
            .limit(1)
            .single();
          stageId = stage?.id || null;
        }

        const { data, error } = await supabase
          .from('opportunities')
          .insert({
            user_id: userId,
            title: args.title,
            value: args.value || 0,
            company_id: companyId,
            contact_id: contactId,
            pipeline_id: pipeline?.id || null,
            stage_id: stageId,
            expected_close_date: args.expected_close_date || null,
            description: args.description || null,
            status: 'open',
          })
          .select()
          .single();
        
        if (error) throw error;
        return {
          success: true,
          message: `✅ Oportunidad creada: "${args.title}" por $${(args.value || 0).toLocaleString()}`,
          data,
        };
      }

      case "update_opportunity_stage": {
        const { data: opportunity } = await supabase
          .from('opportunities')
          .select('id, pipeline_id')
          .eq('user_id', userId)
          .ilike('title', `%${args.opportunity_title}%`)
          .limit(1)
          .single();

        if (!opportunity) {
          return {
            success: false,
            message: `❌ No se encontró una oportunidad con título similar a "${args.opportunity_title}"`,
          };
        }

        const { data: stage } = await supabase
          .from('stages')
          .select('id, name')
          .eq('pipeline_id', opportunity.pipeline_id)
          .ilike('name', `%${args.new_stage}%`)
          .limit(1)
          .single();

        if (!stage) {
          return {
            success: false,
            message: `❌ No se encontró la etapa "${args.new_stage}". Etapas válidas: Contacto Inicial, Calificación, Propuesta, Negociación, Ganado, Perdido`,
          };
        }

        const { error } = await supabase
          .from('opportunities')
          .update({ stage_id: stage.id })
          .eq('id', opportunity.id);

        if (error) throw error;
        return {
          success: true,
          message: `✅ Oportunidad "${args.opportunity_title}" movida a etapa "${stage.name}"`,
        };
      }

      case "get_pipeline_summary":
        return await getPipelineSummaryAdvanced(supabase, userId, args);

      case "analyze_deal_health":
        return await analyzeDealHealth(supabase, userId, args);

      case "search_timeline":
        return await searchTimeline(supabase, userId, args);

      case "find_promises":
        return await findPromises(supabase, userId, args);

      case "get_next_best_action":
        return await getNextBestAction(supabase, userId, args);

      case "add_note": {
        const entityType = args.entity_type || 'contact';
        
        if (entityType === 'contact') {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id, notes')
            .eq('user_id', userId)
            .ilike('email', args.entity_identifier || '')
            .limit(1)
            .single();

          if (!contact) {
            return {
              success: false,
              message: `❌ No se encontró un contacto con email "${args.entity_identifier}"`,
            };
          }

          const newNotes = contact.notes 
            ? `${contact.notes}\n\n[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}`
            : `[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}`;

          const { error } = await supabase
            .from('contacts')
            .update({ notes: newNotes })
            .eq('id', contact.id);

          if (error) throw error;
          return {
            success: true,
            message: `✅ Nota agregada al contacto ${args.entity_identifier}`,
          };
        } else {
          const { data: company } = await supabase
            .from('companies')
            .select('id, description')
            .eq('user_id', userId)
            .ilike('name', `%${args.entity_identifier || ''}%`)
            .limit(1)
            .single();

          if (!company) {
            return {
              success: false,
              message: `❌ No se encontró una empresa con nombre "${args.entity_identifier}"`,
            };
          }

          const newDescription = company.description 
            ? `${company.description}\n\n[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}`
            : `[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}`;

          const { error } = await supabase
            .from('companies')
            .update({ description: newDescription })
            .eq('id', company.id);

          if (error) throw error;
          return {
            success: true,
            message: `✅ Nota agregada a la empresa ${args.entity_identifier}`,
          };
        }
      }

      // ===== TEAM TOOLS =====
      case "get_team_summary":
        return await getTeamSummary(supabase, userId);

      case "get_member_info":
        return await getMemberInfo(supabase, userId, args);

      case "get_quotas_progress":
        return await getQuotasProgress(supabase, userId, args);

      case "assign_contact":
        return await assignEntity(supabase, userId, 'contacts', args);

      case "assign_company":
        return await assignEntity(supabase, userId, 'companies', args);

      case "assign_opportunity":
        return await assignEntity(supabase, userId, 'opportunities', args);

      case "get_my_assignments":
        return await getMyAssignments(supabase, userId, args);

      case "add_team_comment":
        return await addTeamComment(supabase, userId, args);

      case "get_entity_comments":
        return await getEntityComments(supabase, userId, args);

      case "get_activity_feed":
        return await getActivityFeedTool(supabase, userId, args);

      case "notify_team_member":
        return await notifyTeamMember(supabase, userId, args);
      
      default:
        return {
          success: false,
          message: `❌ Función desconocida: ${toolName}`,
        };
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      success: false,
      message: `❌ Error al ejecutar ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    };
  }
}

// Get user ID from JWT token using getClaims
async function getUserIdFromToken(supabase: any, authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    console.error("No valid auth header");
    return null;
  }
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getClaims(token);
    
    if (error || !data?.claims) {
      console.error("Error getting claims:", error);
      return null;
    }
    
    return data.claims.sub;
  } catch (error) {
    console.error("Error in getUserIdFromToken:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_ANON_KEY!,
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    // Get user ID for tool execution
    const userId = await getUserIdFromToken(supabase, authHeader);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Usuario no autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching CRM context for user:", userId);
    const crmContext = await fetchCRMContext(supabase, userId);
    const systemPrompt = buildSystemPrompt(crmContext);

    console.log("Calling Lovable AI Gateway with", messages.length, "messages and", tools.length, "tools");

    // First call with tools (non-streaming to handle tool calls)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido. Por favor, intenta de nuevo en unos momentos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA agotados. Contacta al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error al conectar con el servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];
    
    console.log("AI response choice:", JSON.stringify(choice, null, 2));
    
    // Check if AI wants to call tools
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      console.log("AI requested tool calls:", JSON.stringify(choice.message.tool_calls, null, 2));
      
      const toolResults: { tool_call_id: string; role: string; content: string }[] = [];
      
      for (const toolCall of choice.message.tool_calls) {
        const args = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        
        const result = await executeTool(supabase, userId, toolCall.function.name, args);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }
      
      // Second call with tool results (streaming)
      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!followUpResponse.ok) {
        const errorText = await followUpResponse.text();
        console.error("Follow-up AI error:", errorText);
        
        // Return tool results directly if follow-up fails
        const toolMessage = toolResults.map(r => JSON.parse(r.content).message).join('\n');
        return new Response(
          `data: ${JSON.stringify({ choices: [{ delta: { content: toolMessage } }] })}\n\ndata: [DONE]\n\n`,
          { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } }
        );
      }

      return new Response(followUpResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }
    
    // No tool calls - stream the response directly
    console.log("No tool calls detected, streaming response");
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
