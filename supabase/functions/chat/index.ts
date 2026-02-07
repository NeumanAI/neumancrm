import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODEL = "google/gemini-3-flash-preview";

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
      description: "Busca contactos en el CRM usando filtros avanzados.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda (nombre, email, empresa)" },
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
      description: "Crea una nueva empresa en el CRM.",
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
      description: "Busca empresas en el CRM por nombre o dominio.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Término de búsqueda (nombre o dominio)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_company",
      description: "Actualiza campos de una empresa existente. Busca por nombre.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre actual de la empresa para identificarla (requerido)" },
          new_name: { type: "string", description: "Nuevo nombre" },
          industry: { type: "string", description: "Nueva industria" },
          website: { type: "string", description: "Nuevo sitio web" },
          phone: { type: "string", description: "Nuevo teléfono" },
          city: { type: "string", description: "Nueva ciudad" },
          country: { type: "string", description: "Nuevo país" },
          description: { type: "string", description: "Nueva descripción" },
          domain: { type: "string", description: "Nuevo dominio" },
        },
        required: ["name"],
      },
    },
  },
  // ===== TAREAS =====
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Crea una nueva tarea o actividad en el CRM.",
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
      name: "list_tasks",
      description: "Lista tareas y actividades del usuario con filtros avanzados. Úsala cuando el usuario pregunte por sus tareas, pendientes o actividades.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "completed", "overdue", "today"], description: "Estado de las tareas" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Filtrar por prioridad" },
          type: { type: "string", enum: ["task", "call", "email", "meeting", "follow_up"], description: "Tipo de actividad" },
          limit: { type: "number", description: "Máximo de resultados (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description: "Marca una tarea como completada o la reabre. Busca por título parcial.",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Título o parte del título de la tarea" },
          completed: { type: "boolean", description: "true para completar, false para reabrir (default: true)" },
        },
        required: ["task_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Actualiza una tarea existente (título, prioridad, fecha, descripción).",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Título actual de la tarea para identificarla (requerido)" },
          new_title: { type: "string", description: "Nuevo título" },
          description: { type: "string", description: "Nueva descripción" },
          priority: { type: "string", enum: ["low", "medium", "high"], description: "Nueva prioridad" },
          due_date: { type: "string", description: "Nueva fecha de vencimiento (YYYY-MM-DD)" },
          type: { type: "string", enum: ["task", "call", "email", "meeting", "follow_up"], description: "Nuevo tipo" },
        },
        required: ["task_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_meeting",
      description: "Programa una reunión o llamada con un contacto.",
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
      description: "Crea una nueva oportunidad de venta en el pipeline.",
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
      description: "Mueve una oportunidad a otra etapa del pipeline.",
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
      name: "search_opportunities",
      description: "Busca oportunidades con filtros avanzados (valor, etapa, empresa, estado).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda (título o empresa)" },
          min_value: { type: "number", description: "Valor mínimo" },
          max_value: { type: "number", description: "Valor máximo" },
          status: { type: "string", enum: ["open", "won", "lost"], description: "Estado del deal" },
          stage_name: { type: "string", description: "Nombre de la etapa" },
          limit: { type: "number", description: "Máximo de resultados (default: 10)" },
        },
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
      description: "Analiza la salud de una oportunidad específica basándose en actividad reciente, tiempo en etapa, y engagement.",
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
      description: "Busca en el historial de interacciones (emails, reuniones, WhatsApp, etc).",
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
      description: "Busca compromisos y action items pendientes de conversaciones.",
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
      description: "Sugiere la siguiente mejor acción para un contacto, empresa o deal.",
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
          entity_type: { type: "string", enum: ["contact", "company"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Email del contacto o nombre de la empresa" },
          note_content: { type: "string", description: "Contenido de la nota (requerido)" },
        },
        required: ["note_content"],
      },
    },
  },
  // ===== ELIMINACIÓN =====
  {
    type: "function",
    function: {
      name: "delete_entity",
      description: "Elimina un contacto, empresa u oportunidad del CRM. Úsala solo cuando el usuario confirme explícitamente que desea eliminar.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contact", "company", "opportunity"], description: "Tipo de entidad a eliminar" },
          entity_identifier: { type: "string", description: "Email (contacto), nombre (empresa) o título (oportunidad)" },
        },
        required: ["entity_type", "entity_identifier"],
      },
    },
  },
  // ===== EQUIPO Y COLABORACIÓN =====
  {
    type: "function",
    function: {
      name: "get_team_summary",
      description: "Obtiene un resumen del equipo: organización, miembros, roles, cuotas y progreso.",
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
      description: "Muestra el progreso de cuotas de ventas del equipo.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro (opcional)" },
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
          assigned_to_email: { type: "string", description: "Email del miembro del equipo" },
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
          assigned_to_email: { type: "string", description: "Email del miembro del equipo" },
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
          assigned_to_email: { type: "string", description: "Email del miembro del equipo" },
        },
        required: ["opportunity_title", "assigned_to_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_assignments",
      description: "Lista entidades asignadas al usuario actual o a un miembro específico.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro (opcional)" },
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities", "all"], description: "Tipo a listar (default: all)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_team_comment",
      description: "Agrega un comentario colaborativo a una entidad. Soporta @menciones.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Identificador de la entidad" },
          content: { type: "string", description: "Contenido del comentario" },
        },
        required: ["entity_type", "entity_identifier", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_entity_comments",
      description: "Obtiene los comentarios de una entidad.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Identificador" },
          limit: { type: "number", description: "Máximo de comentarios (default: 10)" },
        },
        required: ["entity_type", "entity_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_feed",
      description: "Obtiene la actividad reciente del equipo.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities", "activities"], description: "Filtrar por tipo" },
          entity_id: { type: "string", description: "Filtrar por ID de entidad" },
          limit: { type: "number", description: "Máximo de actividades (default: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_team_member",
      description: "Notifica a un miembro del equipo mencionándolo en un comentario.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro a notificar" },
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo de entidad" },
          entity_identifier: { type: "string", description: "Identificador de entidad" },
          message: { type: "string", description: "Mensaje de notificación" },
        },
        required: ["member_email", "entity_type", "entity_identifier", "message"],
      },
    },
  },
  // ===== PROYECTOS =====
  {
    type: "function",
    function: {
      name: "list_projects",
      description: "Lista los proyectos/unidades de negocio de la organización.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "completed", "cancelled"], description: "Filtrar por estado" },
          type: { type: "string", enum: ["project", "real_estate", "construction", "business_unit", "department", "brand", "product_line", "location", "other"], description: "Filtrar por tipo" },
          limit: { type: "number", description: "Máximo de resultados (default: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Crea un nuevo proyecto o unidad de negocio.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre del proyecto (requerido)" },
          code: { type: "string", description: "Código corto identificador" },
          description: { type: "string", description: "Descripción del proyecto" },
          type: { type: "string", enum: ["project", "real_estate", "construction", "business_unit", "department", "brand", "product_line", "location", "other"], description: "Tipo de proyecto" },
          budget: { type: "number", description: "Presupuesto" },
          revenue_target: { type: "number", description: "Meta de ingresos" },
          city: { type: "string", description: "Ciudad" },
          country: { type: "string", description: "País" },
          color: { type: "string", description: "Color hex" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_stats",
      description: "Obtiene métricas detalladas de un proyecto.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nombre del proyecto" },
          project_id: { type: "string", description: "ID del proyecto" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_contact_to_project",
      description: "Añade un contacto existente a un proyecto.",
      parameters: {
        type: "object",
        properties: {
          contact_email: { type: "string", description: "Email del contacto (requerido)" },
          project_name: { type: "string", description: "Nombre del proyecto (requerido)" },
          status: { type: "string", enum: ["lead", "qualified", "customer", "inactive"], description: "Estado (default: lead)" },
          interest_level: { type: "number", description: "Nivel de interés 1-5" },
          notes: { type: "string", description: "Notas" },
        },
        required: ["contact_email", "project_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project_contacts",
      description: "Lista los contactos asociados a un proyecto.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nombre del proyecto (requerido)" },
          status: { type: "string", enum: ["lead", "qualified", "customer", "inactive"], description: "Filtrar por estado" },
          limit: { type: "number", description: "Máximo (default: 20)" },
        },
        required: ["project_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_projects",
      description: "Busca proyectos por nombre o código.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda" },
          limit: { type: "number", description: "Máximo (default: 10)" },
        },
        required: ["query"],
      },
    },
  },
  // ===== CONVERSACIONES OMNICANAL =====
  {
    type: "function",
    function: {
      name: "list_conversations",
      description: "Lista conversaciones omnicanal abiertas (WhatsApp, Instagram, Webchat, Email). Úsala para ver conversaciones activas.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["whatsapp", "instagram", "webchat", "email"], description: "Filtrar por canal" },
          status: { type: "string", enum: ["open", "closed", "archived"], description: "Estado (default: open)" },
          limit: { type: "number", description: "Máximo de resultados (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_conversation_summary",
      description: "Obtiene un resumen de una conversación con los últimos mensajes.",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Nombre del contacto de la conversación" },
          channel: { type: "string", description: "Canal de la conversación" },
          limit: { type: "number", description: "Número de mensajes a mostrar (default: 10)" },
        },
        required: ["contact_name"],
      },
    },
  },
  // ===== INTELIGENCIA =====
  {
    type: "function",
    function: {
      name: "smart_search",
      description: "Búsqueda universal en todo el CRM: contactos, empresas, oportunidades y tareas. Úsala cuando el usuario busque algo sin especificar tipo.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda" },
          entity_types: { type: "array", items: { type: "string", enum: ["contacts", "companies", "opportunities", "tasks"] }, description: "Tipos a buscar (default: todos)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_crm_report",
      description: "Genera un resumen ejecutivo completo del CRM: pipeline, conversión, actividad, tareas y equipo.",
      parameters: {
        type: "object",
        properties: {
          period_days: { type: "number", description: "Período en días para el análisis (default: 30)" },
        },
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
  projectsCount: number;
  recentContacts: Array<{ name: string; email: string; company?: string }>;
  recentOpportunities: Array<{ title: string; value: number; stage?: string }>;
  upcomingTasks: Array<{ title: string; dueDate?: string; priority?: string }>;
  teamContext: TeamContext;
}, currentRoute?: string) => {
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
## 👥 Equipo:
**Org:** ${teamContext.organization.name} | **Tu rol:** ${roleLabels[currentRole] || currentRole} | **Miembros:** ${teamContext.teamMembers.filter(m => m.is_active).length}
${teamContext.teamMembers.length > 0 
  ? teamContext.teamMembers.map(m => `- ${m.full_name || m.email} (${roleLabels[m.role] || m.role})`).join('\n')
  : '- Sin miembros'}
**Puedes:** ${permissions.can.join(', ')}${permissions.cannot.length > 0 ? ` | **No puedes:** ${permissions.cannot.join(', ')}` : ''}
`;
  }

  // Context-aware section based on current route
  let routeContext = '';
  if (currentRoute) {
    const routeMap: Record<string, string> = {
      '/dashboard': 'El usuario está en el Dashboard. Prioriza insights generales, métricas y resúmenes.',
      '/pipeline': 'El usuario está viendo el Pipeline. Prioriza información de deals, etapas y análisis de salud.',
      '/contacts': 'El usuario está en Contactos. Prioriza búsqueda, seguimiento y acciones sobre contactos.',
      '/companies': 'El usuario está en Empresas. Prioriza información de empresas y relaciones comerciales.',
      '/tasks': 'El usuario está en Tareas. Prioriza listar, completar y gestionar tareas pendientes.',
      '/team': 'El usuario está viendo el Equipo. Prioriza información de miembros, cuotas y asignaciones.',
      '/projects': 'El usuario está en Proyectos. Prioriza métricas por proyecto y segmentación.',
      '/conversations': 'El usuario está en Conversaciones. Prioriza mensajes omnicanal y seguimiento.',
      '/settings': 'El usuario está en Configuración.',
    };

    // Check for detail pages
    if (currentRoute.startsWith('/contacts/')) {
      routeContext = '📍 El usuario está viendo un contacto específico. Ofrece análisis detallado, historial y próxima mejor acción para este contacto.';
    } else if (currentRoute.startsWith('/companies/')) {
      routeContext = '📍 El usuario está viendo una empresa específica. Ofrece análisis de relación, deals asociados y contactos de la empresa.';
    } else if (currentRoute.startsWith('/projects/')) {
      routeContext = '📍 El usuario está viendo un proyecto específico. Ofrece métricas, contactos y pipeline del proyecto.';
    } else {
      routeContext = routeMap[currentRoute] || '';
    }
  }

  return `Eres un copiloto de CRM inteligente y proactivo. Tu objetivo es ayudar a gestionar contactos, empresas, oportunidades, tareas, conversaciones y equipo de manera eficiente.

## 📊 Estado del CRM:
- Contactos: ${crmContext.contactsCount} | Empresas: ${crmContext.companiesCount} | Oportunidades: ${crmContext.opportunitiesCount}
- Tareas: ${crmContext.tasksCount} (${crmContext.pendingTasks} pendientes) | Pipeline: $${crmContext.pipelineValue.toLocaleString()} | Proyectos: ${crmContext.projectsCount || 0}

📇 **Contactos recientes**: ${crmContext.recentContacts.length > 0 
  ? crmContext.recentContacts.map(c => `${c.name} (${c.email})`).join(', ')
  : 'Ninguno'}

💰 **Oportunidades activas**: ${crmContext.recentOpportunities.length > 0
  ? crmContext.recentOpportunities.map(o => `${o.title}: $${o.value.toLocaleString()}`).join(', ')
  : 'Ninguna'}

📋 **Tareas próximas**: ${crmContext.upcomingTasks.length > 0
  ? crmContext.upcomingTasks.map(t => `${t.title}${t.dueDate ? ` (${t.dueDate})` : ''}`).join(', ')
  : 'Ninguna'}
${teamSection}
${routeContext ? `## 📍 Contexto actual:\n${routeContext}\n` : ''}

## Capacidades (40+ herramientas):
### CRUD: create/update/search contactos, empresas, oportunidades | create/list/complete/update tareas
### Pipeline: pipeline summary, deal health, search opportunities, update stages
### Eliminación: delete_entity (contacto/empresa/oportunidad) - solo con confirmación explícita
### Timeline: search_timeline, find_promises, add_note, get_next_best_action
### Equipo: team summary, member info, quotas, assign, comments, activity feed
### Proyectos: list/create/search, stats, add contacts, get contacts
### Omnicanal: list_conversations, get_conversation_summary
### Inteligencia: smart_search (búsqueda universal), generate_crm_report (resumen ejecutivo)

## Directrices:
- Responde siempre en español con markdown (negritas, listas, emojis)
- Sé conciso pero útil, tono profesional y cercano
- Usa datos reales del contexto arriba
- Si el usuario es 'viewer', informa que no puede hacer escrituras
- **NUNCA** simules creaciones/actualizaciones sin usar la función correspondiente
- Para eliminar, pide confirmación explícita ANTES de ejecutar delete_entity
- Si faltan datos obligatorios, pregunta primero

## Navegación: /dashboard /contacts /companies /pipeline /tasks /team /projects /conversations /settings`;
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
      projectsResult,
    ] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name, email, companies(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('companies').select('id').limit(1000),
      supabase.from('opportunities').select('id, title, value, status, stage_id, stages(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('activities').select('id, title, due_date, priority, completed').order('due_date', { ascending: true }).limit(10),
      supabase.from('team_members').select('*, organizations(*)').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const contacts = contactsResult.data || [];
    const companies = companiesResult.data || [];
    const opportunities = opportunitiesResult.data || [];
    const activities = activitiesResult.data || [];
    const currentMember = teamMemberResult.data;
    const projectsCount = projectsResult.count || 0;

    const pendingTasks = activities.filter((a: any) => !a.completed);
    const pipelineValue = opportunities
      .filter((o: any) => o.status === 'open')
      .reduce((sum: number, o: any) => sum + (o.value || 0), 0);

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
      projectsCount,
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
      projectsCount: 0,
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

  if (error) return { success: false, message: `❌ Error al actualizar contacto: ${error.message}` };
  if (!data) return { success: false, message: `❌ No se encontró un contacto con email "${args.email}"` };
  return { success: true, message: `✅ Contacto ${args.email} actualizado correctamente`, data };
}

async function updateCompany(supabase: any, userId: string, args: any) {
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', `%${args.name}%`)
    .limit(1)
    .maybeSingle();

  if (!company) return { success: false, message: `❌ No se encontró empresa "${args.name}"` };

  const updates: any = { updated_at: new Date().toISOString() };
  if (args.new_name) updates.name = args.new_name;
  if (args.industry !== undefined) updates.industry = args.industry;
  if (args.website !== undefined) updates.website = args.website;
  if (args.phone !== undefined) updates.phone = args.phone;
  if (args.city !== undefined) updates.city = args.city;
  if (args.country !== undefined) updates.country = args.country;
  if (args.description !== undefined) updates.description = args.description;
  if (args.domain !== undefined) updates.domain = args.domain;

  const { error } = await supabase.from('companies').update(updates).eq('id', company.id);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Empresa "${args.name}" actualizada correctamente` };
}

async function searchContactsAdvanced(supabase: any, userId: string, args: any) {
  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, whatsapp_number, job_title, companies(name)')
    .eq('user_id', userId);

  if (args.query) {
    query = query.or(`first_name.ilike.%${args.query}%,last_name.ilike.%${args.query}%,email.ilike.%${args.query}%`);
  }
  if (args.has_whatsapp) query = query.not('whatsapp_number', 'is', null);

  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error al buscar contactos: ${error.message}` };

  let contacts = data || [];
  if (args.company_name) {
    contacts = contacts.filter((c: any) => c.companies?.name?.toLowerCase().includes(args.company_name.toLowerCase()));
  }
  if (contacts.length === 0) return { success: true, message: `No se encontraron contactos con los filtros especificados`, data: [] };

  const results = contacts.map((c: any) => 
    `• ${c.first_name || ''} ${c.last_name || ''} - ${c.email}${c.whatsapp_number ? ` 📱 ${c.whatsapp_number}` : ''}${c.job_title ? ` (${c.job_title})` : ''}${c.companies?.name ? ` @ ${c.companies.name}` : ''}`
  ).join('\n');

  return { success: true, message: `📇 Encontrados ${contacts.length} contacto(s):\n${results}`, data: contacts };
}

async function listTasks(supabase: any, userId: string, args: any) {
  const now = new Date();
  let query = supabase
    .from('activities')
    .select('id, title, description, type, priority, due_date, completed, completed_at, created_at')
    .eq('user_id', userId);

  if (args.status === 'pending') {
    query = query.eq('completed', false);
  } else if (args.status === 'completed') {
    query = query.eq('completed', true);
  } else if (args.status === 'overdue') {
    query = query.eq('completed', false).lt('due_date', now.toISOString());
  } else if (args.status === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    query = query.gte('due_date', startOfDay).lt('due_date', endOfDay);
  }

  if (args.priority) query = query.eq('priority', args.priority);
  if (args.type) query = query.eq('type', args.type);

  query = query.order('due_date', { ascending: true, nullsFirst: false });
  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };

  const tasks = data || [];
  if (tasks.length === 0) {
    const statusLabel = args.status === 'overdue' ? 'vencidas' : args.status === 'today' ? 'para hoy' : args.status === 'completed' ? 'completadas' : 'pendientes';
    return { success: true, message: `No hay tareas ${statusLabel}.`, data: [] };
  }

  const typeEmoji: Record<string, string> = { task: '📋', call: '📞', email: '📧', meeting: '🤝', follow_up: '🔄' };
  const priorityEmoji: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };

  let message = `## 📋 Tareas (${tasks.length})\n\n`;
  message += tasks.map((t: any) => {
    const emoji = typeEmoji[t.type] || '📋';
    const pEmoji = priorityEmoji[t.priority] || '';
    const status = t.completed ? '✅' : (t.due_date && new Date(t.due_date) < now ? '⏰ VENCIDA' : '⬜');
    const dueStr = t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES') : 'Sin fecha';
    return `${status} ${emoji} **${t.title}** ${pEmoji}\n   Vence: ${dueStr}${t.description ? ` | ${t.description.substring(0, 60)}` : ''}`;
  }).join('\n\n');

  return { success: true, message, data: tasks };
}

async function completeTask(supabase: any, userId: string, args: any) {
  const completed = args.completed !== undefined ? args.completed : true;
  
  const { data: tasks } = await supabase
    .from('activities')
    .select('id, title, completed')
    .eq('user_id', userId)
    .ilike('title', `%${args.task_title}%`)
    .limit(5);

  if (!tasks || tasks.length === 0) {
    return { success: false, message: `❌ No se encontró tarea con título similar a "${args.task_title}"` };
  }

  const task = tasks[0];
  const updates: any = { completed, updated_at: new Date().toISOString() };
  if (completed) updates.completed_at = new Date().toISOString();
  else updates.completed_at = null;

  const { error } = await supabase.from('activities').update(updates).eq('id', task.id);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };

  return {
    success: true,
    message: completed 
      ? `✅ Tarea "${task.title}" marcada como completada` 
      : `🔄 Tarea "${task.title}" reabierta`,
  };
}

async function updateTask(supabase: any, userId: string, args: any) {
  const { data: tasks } = await supabase
    .from('activities')
    .select('id, title')
    .eq('user_id', userId)
    .ilike('title', `%${args.task_title}%`)
    .limit(1);

  if (!tasks || tasks.length === 0) {
    return { success: false, message: `❌ No se encontró tarea "${args.task_title}"` };
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (args.new_title) updates.title = args.new_title;
  if (args.description !== undefined) updates.description = args.description;
  if (args.priority) updates.priority = args.priority;
  if (args.due_date) updates.due_date = args.due_date;
  if (args.type) updates.type = args.type;

  const { error } = await supabase.from('activities').update(updates).eq('id', tasks[0].id);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Tarea "${tasks[0].title}" actualizada` };
}

async function deleteEntity(supabase: any, userId: string, args: any) {
  const { entity_type, entity_identifier } = args;

  if (entity_type === 'contact') {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('user_id', userId)
      .eq('email', entity_identifier)
      .maybeSingle();
    if (!data) return { success: false, message: `❌ No se encontró contacto "${entity_identifier}"` };
    const { error } = await supabase.from('contacts').delete().eq('id', data.id);
    if (error) return { success: false, message: `❌ Error: ${error.message}` };
    return { success: true, message: `🗑️ Contacto "${data.first_name || ''} ${data.last_name || ''}" (${data.email}) eliminado` };
  }

  if (entity_type === 'company') {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${entity_identifier}%`)
      .limit(1)
      .maybeSingle();
    if (!data) return { success: false, message: `❌ No se encontró empresa "${entity_identifier}"` };
    const { error } = await supabase.from('companies').delete().eq('id', data.id);
    if (error) return { success: false, message: `❌ Error: ${error.message}` };
    return { success: true, message: `🗑️ Empresa "${data.name}" eliminada` };
  }

  if (entity_type === 'opportunity') {
    const { data } = await supabase
      .from('opportunities')
      .select('id, title')
      .eq('user_id', userId)
      .ilike('title', `%${entity_identifier}%`)
      .limit(1)
      .maybeSingle();
    if (!data) return { success: false, message: `❌ No se encontró oportunidad "${entity_identifier}"` };
    const { error } = await supabase.from('opportunities').delete().eq('id', data.id);
    if (error) return { success: false, message: `❌ Error: ${error.message}` };
    return { success: true, message: `🗑️ Oportunidad "${data.title}" eliminada` };
  }

  return { success: false, message: `❌ Tipo de entidad "${entity_type}" no soportado` };
}

async function searchOpportunities(supabase: any, userId: string, args: any) {
  let query = supabase
    .from('opportunities')
    .select('id, title, value, status, probability, expected_close_date, companies(name), stages(name)')
    .eq('user_id', userId);

  if (args.query) {
    query = query.ilike('title', `%${args.query}%`);
  }
  if (args.status) query = query.eq('status', args.status);
  if (args.min_value) query = query.gte('value', args.min_value);
  if (args.max_value) query = query.lte('value', args.max_value);

  query = query.order('value', { ascending: false });
  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };

  let opps = data || [];
  if (args.stage_name) {
    opps = opps.filter((o: any) => o.stages?.name?.toLowerCase().includes(args.stage_name.toLowerCase()));
  }
  if (opps.length === 0) return { success: true, message: 'No se encontraron oportunidades con esos filtros.', data: [] };

  const statusEmoji: Record<string, string> = { open: '🔵', won: '✅', lost: '❌' };
  let message = `## 💼 Oportunidades (${opps.length})\n\n`;
  message += opps.map((o: any) => {
    const emoji = statusEmoji[o.status] || '⬜';
    return `${emoji} **${o.title}** - $${(o.value || 0).toLocaleString()}\n   ${o.stages?.name || 'Sin etapa'}${o.companies?.name ? ` | ${o.companies.name}` : ''}${o.expected_close_date ? ` | Cierre: ${new Date(o.expected_close_date).toLocaleDateString('es-ES')}` : ''}`;
  }).join('\n\n');

  return { success: true, message, data: opps };
}

async function listConversations(supabase: any, userId: string, args: any) {
  let query = supabase
    .from('conversations')
    .select('id, channel, status, external_name, external_phone, external_email, last_message_at, last_message_preview, unread_count')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });

  if (args.channel) query = query.eq('channel', args.channel);
  query = query.eq('status', args.status || 'open');

  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };

  const convs = data || [];
  if (convs.length === 0) return { success: true, message: 'No hay conversaciones activas.', data: [] };

  const channelEmoji: Record<string, string> = { whatsapp: '💬', instagram: '📸', webchat: '🌐', email: '📧' };
  let message = `## 💬 Conversaciones (${convs.length})\n\n`;
  message += convs.map((c: any) => {
    const emoji = channelEmoji[c.channel] || '💬';
    const unread = c.unread_count > 0 ? ` 🔴 ${c.unread_count} sin leer` : '';
    const lastMsg = c.last_message_preview ? `\n   > ${c.last_message_preview.substring(0, 80)}` : '';
    const time = c.last_message_at ? ` | ${getTimeAgo(new Date(c.last_message_at))}` : '';
    return `${emoji} **${c.external_name || c.external_phone || c.external_email || 'Desconocido'}**${unread}${time}${lastMsg}`;
  }).join('\n\n');

  return { success: true, message, data: convs };
}

async function getConversationSummary(supabase: any, userId: string, args: any) {
  // Find conversation by contact name
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, channel, external_name, external_phone, status, unread_count')
    .eq('user_id', userId)
    .ilike('external_name', `%${args.contact_name}%`)
    .limit(1);

  if (!convs || convs.length === 0) {
    return { success: false, message: `❌ No se encontró conversación con "${args.contact_name}"` };
  }

  const conv = convs[0];
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('content, is_from_contact, sender_name, message_type, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(args.limit || 10);

  if (!messages || messages.length === 0) {
    return { success: true, message: `No hay mensajes en la conversación con "${args.contact_name}"`, data: [] };
  }

  let message = `## 💬 Conversación con ${conv.external_name || args.contact_name}\n`;
  message += `Canal: ${conv.channel} | Estado: ${conv.status} | Sin leer: ${conv.unread_count}\n\n`;
  message += messages.reverse().map((m: any) => {
    const sender = m.is_from_contact ? `📩 ${conv.external_name || 'Contacto'}` : `📤 Tú`;
    const time = new Date(m.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `**${sender}** (${time}):\n${m.content || '[sin contenido]'}`;
  }).join('\n\n');

  return { success: true, message, data: { conversation: conv, messages } };
}

async function smartSearch(supabase: any, userId: string, args: any) {
  const q = args.query;
  const types = args.entity_types || ['contacts', 'companies', 'opportunities', 'tasks'];
  const results: any = {};

  const promises: Promise<void>[] = [];

  if (types.includes('contacts')) {
    promises.push(
      supabase.from('contacts')
        .select('id, first_name, last_name, email, companies(name)')
        .eq('user_id', userId)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(5)
        .then(({ data }: any) => { results.contacts = data || []; })
    );
  }
  if (types.includes('companies')) {
    promises.push(
      supabase.from('companies')
        .select('id, name, industry, city')
        .eq('user_id', userId)
        .or(`name.ilike.%${q}%,industry.ilike.%${q}%`)
        .limit(5)
        .then(({ data }: any) => { results.companies = data || []; })
    );
  }
  if (types.includes('opportunities')) {
    promises.push(
      supabase.from('opportunities')
        .select('id, title, value, status, stages(name)')
        .eq('user_id', userId)
        .ilike('title', `%${q}%`)
        .limit(5)
        .then(({ data }: any) => { results.opportunities = data || []; })
    );
  }
  if (types.includes('tasks')) {
    promises.push(
      supabase.from('activities')
        .select('id, title, type, priority, due_date, completed')
        .eq('user_id', userId)
        .ilike('title', `%${q}%`)
        .limit(5)
        .then(({ data }: any) => { results.tasks = data || []; })
    );
  }

  await Promise.all(promises);

  const totalResults = Object.values(results).reduce((sum: number, arr: any) => sum + (arr?.length || 0), 0);
  if (totalResults === 0) return { success: true, message: `🔍 No se encontraron resultados para "${q}"`, data: results };

  let message = `## 🔍 Resultados para "${q}" (${totalResults})\n\n`;

  if (results.contacts?.length > 0) {
    message += `### 📇 Contactos (${results.contacts.length})\n`;
    message += results.contacts.map((c: any) => `- ${c.first_name || ''} ${c.last_name || ''} (${c.email})${c.companies?.name ? ` @ ${c.companies.name}` : ''}`).join('\n');
    message += '\n\n';
  }
  if (results.companies?.length > 0) {
    message += `### 🏢 Empresas (${results.companies.length})\n`;
    message += results.companies.map((c: any) => `- ${c.name}${c.industry ? ` (${c.industry})` : ''}${c.city ? ` 📍 ${c.city}` : ''}`).join('\n');
    message += '\n\n';
  }
  if (results.opportunities?.length > 0) {
    message += `### 💼 Oportunidades (${results.opportunities.length})\n`;
    message += results.opportunities.map((o: any) => `- ${o.title} - $${(o.value || 0).toLocaleString()} (${o.stages?.name || o.status})`).join('\n');
    message += '\n\n';
  }
  if (results.tasks?.length > 0) {
    message += `### 📋 Tareas (${results.tasks.length})\n`;
    message += results.tasks.map((t: any) => `- ${t.completed ? '✅' : '⬜'} ${t.title}${t.due_date ? ` (${new Date(t.due_date).toLocaleDateString('es-ES')})` : ''}`).join('\n');
  }

  return { success: true, message, data: results };
}

async function generateCRMReport(supabase: any, userId: string, args: any) {
  const days = args.period_days || 30;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);

  const [contacts, companies, opps, tasks, timeline] = await Promise.all([
    supabase.from('contacts').select('id, created_at').eq('user_id', userId),
    supabase.from('companies').select('id, created_at').eq('user_id', userId),
    supabase.from('opportunities').select('id, title, value, status, created_at, closed_at, stages(name)').eq('user_id', userId),
    supabase.from('activities').select('id, completed, type, created_at, due_date').eq('user_id', userId),
    supabase.from('timeline_entries').select('id, entry_type, created_at').eq('user_id', userId).gte('created_at', dateThreshold.toISOString()),
  ]);

  const allContacts = contacts.data || [];
  const allCompanies = companies.data || [];
  const allOpps = opps.data || [];
  const allTasks = tasks.data || [];
  const allTimeline = timeline.data || [];

  const newContacts = allContacts.filter((c: any) => new Date(c.created_at) >= dateThreshold).length;
  const newCompanies = allCompanies.filter((c: any) => new Date(c.created_at) >= dateThreshold).length;
  const openDeals = allOpps.filter((o: any) => o.status === 'open');
  const wonDeals = allOpps.filter((o: any) => o.status === 'won' && o.closed_at && new Date(o.closed_at) >= dateThreshold);
  const lostDeals = allOpps.filter((o: any) => o.status === 'lost' && o.closed_at && new Date(o.closed_at) >= dateThreshold);
  const pipelineValue = openDeals.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
  const wonValue = wonDeals.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
  const winRate = (wonDeals.length + lostDeals.length) > 0 ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100) : 0;

  const pendingTasks = allTasks.filter((t: any) => !t.completed);
  const overdueTasks = pendingTasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date());
  const completedRecent = allTasks.filter((t: any) => t.completed && new Date(t.created_at) >= dateThreshold).length;

  let message = `## 📊 Reporte Ejecutivo del CRM (últimos ${days} días)\n\n`;
  message += `### 📈 Pipeline\n`;
  message += `| Métrica | Valor |\n|---------|-------|\n`;
  message += `| Pipeline activo | $${pipelineValue.toLocaleString()} (${openDeals.length} deals) |\n`;
  message += `| Deals ganados | $${wonValue.toLocaleString()} (${wonDeals.length}) |\n`;
  message += `| Deals perdidos | ${lostDeals.length} |\n`;
  message += `| Win rate | ${winRate}% |\n\n`;

  message += `### 👥 Crecimiento\n`;
  message += `- Nuevos contactos: **${newContacts}** (total: ${allContacts.length})\n`;
  message += `- Nuevas empresas: **${newCompanies}** (total: ${allCompanies.length})\n\n`;

  message += `### ✅ Productividad\n`;
  message += `- Tareas completadas: **${completedRecent}**\n`;
  message += `- Tareas pendientes: **${pendingTasks.length}** (${overdueTasks.length} vencidas)\n`;
  message += `- Interacciones registradas: **${allTimeline.length}**\n\n`;

  if (overdueTasks.length > 0) message += `⚠️ **Atención:** Hay ${overdueTasks.length} tareas vencidas que requieren acción.\n`;
  if (winRate < 30 && (wonDeals.length + lostDeals.length) > 3) message += `⚠️ **Win rate bajo (${winRate}%):** Considera revisar tu proceso de ventas.\n`;

  return { success: true, message, data: { pipelineValue, wonValue, winRate, newContacts, pendingTasks: pendingTasks.length, overdueTasks: overdueTasks.length } };
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

  if (args.entry_type) query = query.eq('entry_type', args.entry_type);
  if (args.search_text) query = query.or(`subject.ilike.%${args.search_text}%,body.ilike.%${args.search_text}%,summary.ilike.%${args.search_text}%`);

  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error al buscar en timeline: ${error.message}` };

  let entries = data || [];
  if (args.contact_email) entries = entries.filter((e: any) => e.contacts?.email?.toLowerCase() === args.contact_email.toLowerCase());
  if (args.company_name) entries = entries.filter((e: any) => e.companies?.name?.toLowerCase().includes(args.company_name.toLowerCase()));

  if (entries.length === 0) return { success: true, message: `No se encontraron interacciones en los últimos ${daysAgo} días.`, data: [] };

  const typeEmoji: Record<string, string> = { email: '📧', meeting: '🤝', call: '📞', note: '📝', whatsapp: '💬' };
  const results = entries.map((t: any) => {
    const emoji = typeEmoji[t.entry_type] || '📋';
    const date = new Date(t.occurred_at).toLocaleDateString('es-ES');
    const contact = t.contacts ? `${t.contacts.first_name || ''} ${t.contacts.last_name || ''}`.trim() : '';
    return `${emoji} **${date}** - ${t.subject || t.summary || 'Sin asunto'}${contact ? ` (${contact})` : ''}${t.companies?.name ? ` @ ${t.companies.name}` : ''}`;
  }).join('\n');

  return { success: true, message: `📋 **Historial** (últimos ${daysAgo} días):\n\n${results}`, data: entries };
}

async function analyzeDealHealth(supabase: any, userId: string, args: any) {
  let query = supabase.from('opportunities').select('*, companies(name), stages(name, position), contacts(first_name, last_name, email)').eq('user_id', userId);
  if (args.opportunity_id) query = query.eq('id', args.opportunity_id);
  else if (args.company_name) {
    const { data: companies } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.company_name}%`).limit(1);
    if (companies?.length > 0) query = query.eq('company_id', companies[0].id);
  }

  const { data: opportunities, error } = await query.eq('status', 'open').limit(1);
  if (error || !opportunities?.length) return { success: false, message: '❌ Oportunidad no encontrada' };

  const opp = opportunities[0];
  const now = new Date();
  const daysInPipeline = Math.floor((now.getTime() - new Date(opp.created_at).getTime()) / 86400000);

  const [{ data: lastTL }, { data: lastAct }] = await Promise.all([
    supabase.from('timeline_entries').select('occurred_at').eq('user_id', userId).eq('opportunity_id', opp.id).order('occurred_at', { ascending: false }).limit(1),
    supabase.from('activities').select('created_at').eq('user_id', userId).eq('opportunity_id', opp.id).order('created_at', { ascending: false }).limit(1),
  ]);

  let lastDate = new Date(opp.created_at);
  if (lastTL?.length) lastDate = new Date(lastTL[0].occurred_at);
  if (lastAct?.length && new Date(lastAct[0].created_at) > lastDate) lastDate = new Date(lastAct[0].created_at);
  const daysSinceActivity = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);

  let score = 100;
  const warnings: string[] = [];
  if (daysSinceActivity > 14) { score -= 40; warnings.push(`⚠️ Sin actividad en ${daysSinceActivity} días`); }
  else if (daysSinceActivity > 7) { score -= 20; warnings.push(`⚠️ ${daysSinceActivity} días desde última actividad`); }
  if (daysInPipeline > 90) { score -= 30; warnings.push(`⚠️ ${daysInPipeline} días en pipeline (>90)`); }
  else if (daysInPipeline > 60) { score -= 15; warnings.push(`⚠️ ${daysInPipeline} días en pipeline (>60)`); }
  if (opp.expected_close_date) {
    const daysToClose = Math.floor((new Date(opp.expected_close_date).getTime() - now.getTime()) / 86400000);
    if (daysToClose < 0) { score -= 20; warnings.push(`⚠️ Fecha de cierre pasada hace ${Math.abs(daysToClose)} días`); }
  }
  score = Math.max(0, Math.min(100, score));
  const status = score >= 70 ? '🟢 Saludable' : score >= 40 ? '🟡 En riesgo' : '🔴 Crítico';

  let message = `## 💊 Salud del Deal: ${opp.title}\n\n`;
  message += `- Empresa: ${opp.companies?.name || 'N/A'} | Valor: $${(opp.value || 0).toLocaleString()} | Etapa: ${opp.stages?.name || 'N/A'}\n`;
  message += `### Score: ${score}/100 ${status}\n`;
  message += `- Días en pipeline: ${daysInPipeline} | Días sin actividad: ${daysSinceActivity}\n`;
  if (warnings.length) message += `\n${warnings.join('\n')}`;

  return { success: true, message, data: { deal: opp, health: { score, status, daysInPipeline, daysSinceActivity, warnings } } };
}

async function getPipelineSummaryAdvanced(supabase: any, userId: string, args: any) {
  let query = supabase.from('opportunities').select('*, stages(name, position), companies(name)').eq('user_id', userId);
  if (!args.include_closed) query = query.eq('status', 'open');
  const { data: opportunities, error } = await query;
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!opportunities?.length) return { success: true, message: `📊 Pipeline vacío.`, data: { total: 0 } };

  const byStage: Record<string, { count: number; value: number }> = {};
  let totalValue = 0, weightedValue = 0;
  for (const opp of opportunities) {
    const stage = opp.stages?.name || 'Sin etapa';
    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
    byStage[stage].count++;
    byStage[stage].value += opp.value || 0;
    totalValue += opp.value || 0;
    weightedValue += (opp.value || 0) * (opp.probability || 50) / 100;
  }

  let message = `## 📊 Pipeline\n\n### Por Etapa:\n`;
  message += Object.entries(byStage).map(([s, d]) => `• **${s}**: ${d.count} deal(s) - $${d.value.toLocaleString()}`).join('\n');
  message += `\n\n**Total:** ${opportunities.length} opps | **Valor:** $${totalValue.toLocaleString()} | **Ponderado:** $${Math.round(weightedValue).toLocaleString()}`;

  return { success: true, message, data: { total: totalValue, weighted: weightedValue, count: opportunities.length, byStage } };
}

async function findPromises(supabase: any, userId: string, args: any) {
  const daysRange = args.days_range || 14;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysRange);

  const { data: entries, error } = await supabase
    .from('timeline_entries')
    .select('*, contacts(first_name, last_name, email), companies(name)')
    .eq('user_id', userId)
    .gte('occurred_at', dateThreshold.toISOString())
    .not('action_items', 'is', null);

  if (error) return { success: false, message: `❌ Error: ${error.message}` };

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
        if (args.contact_email && entry.contacts?.email?.toLowerCase() !== args.contact_email.toLowerCase()) return;
        promises.push({ text: item.text, isOverdue, context: { from: entry.entry_type, date: new Date(entry.occurred_at).toLocaleDateString('es-ES'), contact: entry.contacts ? `${entry.contacts.first_name || ''} ${entry.contacts.last_name || ''}`.trim() : null } });
      });
    }
  });

  if (promises.length === 0) return { success: true, message: `No se encontraron compromisos en los últimos ${daysRange} días.`, data: [] };

  let message = `## 📋 Compromisos (${promises.length})\n\n`;
  message += promises.slice(0, 15).map((p, i) => `${i + 1}. **${p.text}**${p.isOverdue ? ' 🔴 VENCIDO' : ''}${p.context.contact ? ` (con ${p.context.contact})` : ''}`).join('\n');
  return { success: true, message, data: promises };
}

async function getNextBestAction(supabase: any, userId: string, args: any) {
  let entity: any = null;
  let lastInteraction: Date | null = null;
  let entityName = '';

  if (args.entity_type === 'contact') {
    const { data } = await supabase.from('contacts').select('*, companies(name)').eq('user_id', userId).eq('email', args.entity_identifier).single();
    if (data) {
      entity = data;
      entityName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email;
      const { data: tl } = await supabase.from('timeline_entries').select('occurred_at').eq('user_id', userId).eq('contact_id', data.id).order('occurred_at', { ascending: false }).limit(1);
      if (tl?.length) lastInteraction = new Date(tl[0].occurred_at);
      else if (data.last_contacted_at) lastInteraction = new Date(data.last_contacted_at);
    }
  } else if (args.entity_type === 'company') {
    const { data } = await supabase.from('companies').select('*').eq('user_id', userId).ilike('name', `%${args.entity_identifier}%`).limit(1).single();
    if (data) {
      entity = data; entityName = data.name;
      const { data: tl } = await supabase.from('timeline_entries').select('occurred_at').eq('user_id', userId).eq('company_id', data.id).order('occurred_at', { ascending: false }).limit(1);
      if (tl?.length) lastInteraction = new Date(tl[0].occurred_at);
    }
  } else if (args.entity_type === 'opportunity') {
    const { data } = await supabase.from('opportunities').select('*, companies(name), stages(name)').eq('user_id', userId).or(`id.eq.${args.entity_identifier},title.ilike.%${args.entity_identifier}%`).limit(1).single();
    if (data) {
      entity = data; entityName = data.title;
      const { data: tl } = await supabase.from('timeline_entries').select('occurred_at').eq('user_id', userId).eq('opportunity_id', data.id).order('occurred_at', { ascending: false }).limit(1);
      if (tl?.length) lastInteraction = new Date(tl[0].occurred_at);
    }
  }

  if (!entity) return { success: false, message: `❌ No se encontró "${args.entity_identifier}"` };

  const daysSince = lastInteraction ? Math.floor((Date.now() - lastInteraction.getTime()) / 86400000) : 999;
  let action: string, reason: string, priority: string;

  if (daysSince > 30) { action = '🔄 Reactivar relación'; reason = `${daysSince} días sin contacto`; priority = '🔴 Alta'; }
  else if (daysSince > 14) { action = '📞 Hacer seguimiento'; reason = `${daysSince} días desde último contacto`; priority = '🟡 Media'; }
  else if (args.entity_type === 'opportunity' && entity.stages?.name === 'Propuesta') { action = '🤝 Programar reunión'; reason = 'En etapa Propuesta'; priority = '🔴 Alta'; }
  else { action = '💡 Continuar nutriendo'; reason = 'Mantén comunicación regular'; priority = '🟢 Baja'; }

  return { success: true, message: `## 🎯 Siguiente Mejor Acción\n**${entityName}** | Último contacto: ${lastInteraction?.toLocaleDateString('es-ES') || 'Nunca'}\n\n**${action}** (${priority})\n_${reason}_` };
}

// ===== TEAM TOOL FUNCTIONS =====

async function getTeamSummary(supabase: any, userId: string) {
  const { data: currentMember } = await supabase.from('team_members').select('*, organizations(*)').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const { data: teamMembers } = await supabase.from('team_members').select('*').eq('organization_id', currentMember.organization_id).eq('is_active', true);
  const roleLabels: Record<string, string> = { admin: 'Admin', manager: 'Manager', sales_rep: 'Rep. Ventas', viewer: 'Visor' };
  const org = currentMember.organizations;

  let message = `## 👥 Equipo: ${org?.name || 'N/A'}\n**Plan:** ${org?.plan} | **Miembros:** ${teamMembers?.length || 0}/${org?.max_users}\n\n`;
  message += (teamMembers || []).map((m: any) => {
    const isYou = m.user_id === userId ? ' ← **Tú**' : '';
    const quota = m.quota_monthly && m.deals_closed_value !== null ? ` | $${(m.deals_closed_value || 0).toLocaleString()}/$${m.quota_monthly.toLocaleString()}` : '';
    return `• **${m.full_name || m.email}** (${roleLabels[m.role] || m.role})${isYou}${quota}`;
  }).join('\n');

  return { success: true, message, data: { organization: org, members: teamMembers } };
}

async function getMemberInfo(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const { data: members } = await supabase.from('team_members').select('*').eq('organization_id', currentMember.organization_id).eq('is_active', true);
  const id = args.member_identifier.toLowerCase();
  const member = members?.find((m: any) => m.email.toLowerCase().includes(id) || (m.full_name && m.full_name.toLowerCase().includes(id)));
  if (!member) return { success: false, message: `❌ No se encontró miembro "${args.member_identifier}"` };

  const [c, co, o] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id).eq('status', 'open'),
  ]);

  const roleLabels: Record<string, string> = { admin: 'Administrador', manager: 'Manager', sales_rep: 'Rep. Ventas', viewer: 'Visor' };
  let message = `## 👤 ${member.full_name || member.email}\n**Rol:** ${roleLabels[member.role] || member.role} | **Email:** ${member.email}\n`;
  message += `**Cuota mensual:** $${(member.quota_monthly || 0).toLocaleString()} | **Cerrado:** $${(member.deals_closed_value || 0).toLocaleString()}\n`;
  message += `**Asignaciones:** ${c.count || 0} contactos, ${co.count || 0} empresas, ${o.count || 0} opps activas`;

  return { success: true, message, data: member };
}

async function getQuotasProgress(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  let query = supabase.from('team_members').select('*').eq('organization_id', currentMember.organization_id).eq('is_active', true);
  if (args.member_email) query = query.eq('email', args.member_email);
  const { data: members } = await query;
  if (!members?.length) return { success: false, message: '❌ No hay miembros' };

  const total = members.reduce((s: number, m: any) => s + (m.quota_monthly || 0), 0);
  const closed = members.reduce((s: number, m: any) => s + (m.deals_closed_value || 0), 0);
  const progress = total > 0 ? Math.round((closed / total) * 100) : 0;

  let message = `## 📊 Cuotas\n**Equipo:** $${closed.toLocaleString()}/$${total.toLocaleString()} (${progress}%)\n\n`;
  message += members.map((m: any) => {
    const p = m.quota_monthly > 0 ? Math.round((m.deals_closed_value || 0) / m.quota_monthly * 100) : 0;
    const bar = '█'.repeat(Math.min(10, Math.round(p / 10))) + '░'.repeat(10 - Math.min(10, Math.round(p / 10)));
    const status = p >= 100 ? '🏆' : p >= 75 ? '🟢' : p >= 50 ? '🟡' : '🔴';
    return `${status} **${m.full_name || m.email}** ${bar} ${p}%\n$${(m.deals_closed_value || 0).toLocaleString()} / $${(m.quota_monthly || 0).toLocaleString()}`;
  }).join('\n\n');

  return { success: true, message, data: { members, totals: { quota: total, closed, progress } } };
}

async function assignEntity(supabase: any, userId: string, entityType: 'contacts' | 'companies' | 'opportunities', args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, role').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  if (!['admin', 'manager'].includes(currentMember.role)) return { success: false, message: '❌ Sin permisos para asignar' };

  const { data: target } = await supabase.from('team_members').select('user_id, full_name, email').eq('organization_id', currentMember.organization_id).eq('email', args.assigned_to_email).eq('is_active', true).maybeSingle();
  if (!target) return { success: false, message: `❌ Miembro ${args.assigned_to_email} no encontrado` };

  let entity: any = null, entityName = '';
  if (entityType === 'contacts') {
    const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('email', args.contact_email).maybeSingle();
    entity = data; entityName = data ? `${data.first_name || ''} ${data.last_name || ''} (${data.email})`.trim() : '';
  } else if (entityType === 'companies') {
    const { data } = await supabase.from('companies').select('id, name').ilike('name', `%${args.company_name}%`).limit(1).maybeSingle();
    entity = data; entityName = data?.name || '';
  } else {
    const { data } = await supabase.from('opportunities').select('id, title').ilike('title', `%${args.opportunity_title}%`).limit(1).maybeSingle();
    entity = data; entityName = data?.title || '';
  }

  if (!entity) return { success: false, message: `❌ Entidad no encontrada` };
  const { error } = await supabase.from(entityType).update({ assigned_to: target.user_id }).eq('id', entity.id);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };

  await supabase.from('activity_feed').insert({ organization_id: currentMember.organization_id, user_id: userId, action: 'assigned', entity_type: entityType, entity_id: entity.id, entity_name: entityName, metadata: { assigned_to: target.email } });
  return { success: true, message: `✅ "${entityName}" asignado a **${target.full_name || target.email}**` };
}

async function getMyAssignments(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, user_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  let targetId = currentMember.user_id, targetName = 'Tú';
  if (args.member_email) {
    const { data: t } = await supabase.from('team_members').select('user_id, full_name').eq('organization_id', currentMember.organization_id).eq('email', args.member_email).eq('is_active', true).maybeSingle();
    if (!t) return { success: false, message: `❌ Miembro no encontrado` };
    targetId = t.user_id; targetName = t.full_name || args.member_email;
  }

  const type = args.entity_type || 'all';
  const results: any = {};
  if (type === 'all' || type === 'contacts') { const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('assigned_to', targetId).limit(10); results.contacts = data || []; }
  if (type === 'all' || type === 'companies') { const { data } = await supabase.from('companies').select('id, name').eq('assigned_to', targetId).limit(10); results.companies = data || []; }
  if (type === 'all' || type === 'opportunities') { const { data } = await supabase.from('opportunities').select('id, title, value, stages(name)').eq('assigned_to', targetId).eq('status', 'open').limit(10); results.opportunities = data || []; }

  let message = `## 📋 Asignaciones de ${targetName}\n\n`;
  if (results.contacts?.length) message += `### 📇 Contactos (${results.contacts.length})\n${results.contacts.map((c: any) => `- ${c.first_name || ''} ${c.last_name || ''} (${c.email})`).join('\n')}\n\n`;
  if (results.companies?.length) message += `### 🏢 Empresas (${results.companies.length})\n${results.companies.map((c: any) => `- ${c.name}`).join('\n')}\n\n`;
  if (results.opportunities?.length) message += `### 💰 Oportunidades (${results.opportunities.length})\n${results.opportunities.map((o: any) => `- ${o.title} - $${(o.value || 0).toLocaleString()}`).join('\n')}`;

  const total = (results.contacts?.length || 0) + (results.companies?.length || 0) + (results.opportunities?.length || 0);
  if (total === 0) message = `## 📋 ${targetName}: sin asignaciones`;
  return { success: true, message, data: results };
}

async function addTeamComment(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, role, full_name, avatar_url').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  if (currentMember.role === 'viewer') return { success: false, message: '❌ Sin permisos' };

  let entity: any = null, entityName = '';
  if (args.entity_type === 'contacts') { const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('email', args.entity_identifier).maybeSingle(); entity = data; entityName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : ''; }
  else if (args.entity_type === 'companies') { const { data } = await supabase.from('companies').select('id, name').ilike('name', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.name || ''; }
  else { const { data } = await supabase.from('opportunities').select('id, title').ilike('title', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.title || ''; }

  if (!entity) return { success: false, message: `❌ Entidad no encontrada` };

  const mentions: string[] = [];
  const mentionMatches = args.content.match(/@(\w+)/g) || [];
  if (mentionMatches.length > 0) {
    const { data: team } = await supabase.from('team_members').select('user_id, full_name, email').eq('organization_id', currentMember.organization_id).eq('is_active', true);
    for (const m of mentionMatches) {
      const name = m.replace('@', '').toLowerCase();
      const member = team?.find((t: any) => (t.full_name && t.full_name.toLowerCase().includes(name)) || t.email.toLowerCase().includes(name));
      if (member) mentions.push(member.user_id);
    }
  }

  const { error } = await supabase.from('comments').insert({ organization_id: currentMember.organization_id, user_id: userId, user_name: currentMember.full_name, user_avatar: currentMember.avatar_url, entity_type: args.entity_type, entity_id: entity.id, content: args.content, mentions });
  if (error) return { success: false, message: `❌ Error: ${error.message}` };

  await supabase.from('activity_feed').insert({ organization_id: currentMember.organization_id, user_id: userId, user_name: currentMember.full_name, action: 'commented', entity_type: args.entity_type, entity_id: entity.id, entity_name: entityName });
  return { success: true, message: `✅ Comentario agregado a "${entityName}"` };
}

async function getEntityComments(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  let entity: any = null, entityName = '';
  if (args.entity_type === 'contacts') { const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('email', args.entity_identifier).maybeSingle(); entity = data; entityName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : ''; }
  else if (args.entity_type === 'companies') { const { data } = await supabase.from('companies').select('id, name').ilike('name', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.name || ''; }
  else { const { data } = await supabase.from('opportunities').select('id, title').ilike('title', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.title || ''; }

  if (!entity) return { success: false, message: `❌ Entidad no encontrada` };

  const { data: comments } = await supabase.from('comments').select('*').eq('entity_type', args.entity_type).eq('entity_id', entity.id).order('created_at', { ascending: false }).limit(args.limit || 10);
  if (!comments?.length) return { success: true, message: `Sin comentarios para "${entityName}"`, data: [] };

  let message = `## 💬 Comentarios de "${entityName}"\n\n`;
  message += comments.map((c: any) => `${c.is_pinned ? '📌 ' : ''}**${c.user_name || 'Usuario'}** (${new Date(c.created_at).toLocaleDateString('es-ES')}):\n${c.content}`).join('\n\n---\n\n');
  return { success: true, message, data: comments };
}

async function getActivityFeedTool(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  let query = supabase.from('activity_feed').select('*').eq('organization_id', currentMember.organization_id).order('created_at', { ascending: false });
  if (args.entity_type) query = query.eq('entity_type', args.entity_type);
  if (args.entity_id) query = query.eq('entity_id', args.entity_id);
  const { data: activities } = await query.limit(args.limit || 20);

  if (!activities?.length) return { success: true, message: 'Sin actividad reciente.', data: [] };

  const actionLabels: Record<string, string> = { created: 'creó', updated: 'actualizó', deleted: 'eliminó', assigned: 'asignó', commented: 'comentó en' };
  let message = `## 📜 Actividad Reciente\n\n`;
  message += activities.map((a: any) => `• **${a.user_name || 'Usuario'}** ${actionLabels[a.action] || a.action} "${a.entity_name || 'N/A'}" ${getTimeAgo(new Date(a.created_at))}`).join('\n');
  return { success: true, message, data: activities };
}

// ===== PROJECT TOOL FUNCTIONS =====

async function listProjects(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  let query = supabase.from('projects').select('id, name, code, type, status, description, budget, revenue_target, city, country').eq('organization_id', currentMember.organization_id).order('created_at', { ascending: false });
  if (args.status) query = query.eq('status', args.status);
  if (args.type) query = query.eq('type', args.type);
  const { data: projects, error } = await query.limit(args.limit || 20);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!projects?.length) return { success: true, message: 'No hay proyectos.', data: [] };

  const typeLabels: Record<string, string> = { project: 'Proyecto', real_estate: 'Inmobiliario', construction: 'Construcción', business_unit: 'Unidad de Negocio', department: 'Departamento', brand: 'Marca', product_line: 'Línea de Producto', location: 'Ubicación', other: 'Otro' };
  const statusLabels: Record<string, string> = { active: '🟢', inactive: '🟡', completed: '✅', cancelled: '❌' };

  let message = `## 📁 Proyectos (${projects.length})\n\n`;
  message += projects.map((p: any) => `${statusLabels[p.status] || ''} **${p.name}**${p.code ? ` (${p.code})` : ''} - ${typeLabels[p.type] || p.type}${p.budget ? ` | $${p.budget.toLocaleString()}` : ''}`).join('\n');
  return { success: true, message, data: projects };
}

async function createProject(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, role').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  if (!['admin', 'manager'].includes(currentMember.role)) return { success: false, message: '❌ Sin permisos' };

  const { data: project, error } = await supabase.from('projects').insert({
    organization_id: currentMember.organization_id, name: args.name, code: args.code || null, description: args.description || null,
    type: args.type || 'project', status: 'active', budget: args.budget || null, revenue_target: args.revenue_target || null,
    city: args.city || null, country: args.country || null, color: args.color || '#3B82F6', created_by: userId,
  }).select().single();

  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Proyecto creado: **${args.name}**`, data: project };
}

async function getProjectStats(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  let pq = supabase.from('projects').select('id, name, code, budget, revenue_target').eq('organization_id', currentMember.organization_id);
  if (args.project_id) pq = pq.eq('id', args.project_id);
  else if (args.project_name) pq = pq.ilike('name', `%${args.project_name}%`);
  else return { success: false, message: '❌ Proporciona nombre o ID' };

  const { data: project } = await pq.limit(1).maybeSingle();
  if (!project) return { success: false, message: `❌ Proyecto no encontrado` };

  const [{ count: contactsCount }, { count: companiesCount }, { data: opps }] = await Promise.all([
    supabase.from('contact_projects').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('project_id', project.id),
    supabase.from('opportunities').select('value, status').eq('project_id', project.id),
  ]);

  const pipeline = (opps || []).filter((o: any) => o.status === 'open').reduce((s: number, o: any) => s + (Number(o.value) || 0), 0);
  const won = (opps || []).filter((o: any) => o.status === 'won').reduce((s: number, o: any) => s + (Number(o.value) || 0), 0);
  const winRate = opps?.length ? Math.round((opps.filter((o: any) => o.status === 'won').length / opps.length) * 100) : 0;

  let message = `## 📊 ${project.name}\n| Métrica | Valor |\n|---|---|\n`;
  message += `| Contactos | ${contactsCount || 0} |\n| Empresas | ${companiesCount || 0} |\n| Pipeline | $${pipeline.toLocaleString()} |\n| Ganados | $${won.toLocaleString()} |\n| Win Rate | ${winRate}% |`;
  return { success: true, message };
}

async function addContactToProject(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const { data: contact } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('email', args.contact_email).maybeSingle();
  if (!contact) return { success: false, message: `❌ Contacto "${args.contact_email}" no encontrado` };

  const { data: project } = await supabase.from('projects').select('id, name').eq('organization_id', currentMember.organization_id).ilike('name', `%${args.project_name}%`).limit(1).maybeSingle();
  if (!project) return { success: false, message: `❌ Proyecto "${args.project_name}" no encontrado` };

  const { data: existing } = await supabase.from('contact_projects').select('id').eq('contact_id', contact.id).eq('project_id', project.id).maybeSingle();
  if (existing) return { success: false, message: `⚠️ Ya está en el proyecto` };

  const { error } = await supabase.from('contact_projects').insert({ contact_id: contact.id, project_id: project.id, status: args.status || 'lead', interest_level: args.interest_level || null, notes: args.notes || null, added_by: userId });
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Contacto agregado al proyecto **${project.name}**` };
}

async function getProjectContacts(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const { data: project } = await supabase.from('projects').select('id, name').eq('organization_id', currentMember.organization_id).ilike('name', `%${args.project_name}%`).limit(1).maybeSingle();
  if (!project) return { success: false, message: `❌ Proyecto no encontrado` };

  let query = supabase.from('contact_projects').select('status, interest_level, notes, contacts:contact_id (first_name, last_name, email, phone)').eq('project_id', project.id).order('created_at', { ascending: false });
  if (args.status) query = query.eq('status', args.status);
  const { data } = await query.limit(args.limit || 20);

  if (!data?.length) return { success: true, message: `Sin contactos en "${project.name}"`, data: [] };

  const statusLabels: Record<string, string> = { lead: '🔵', qualified: '🟡', customer: '🟢', inactive: '⚫' };
  let message = `## 👥 Contactos de "${project.name}" (${data.length})\n\n`;
  message += data.map((cp: any) => {
    const c = cp.contacts;
    return `${statusLabels[cp.status] || ''} **${c?.first_name || ''} ${c?.last_name || ''}** (${c?.email})${cp.interest_level ? ` ⭐${cp.interest_level}` : ''}`;
  }).join('\n');
  return { success: true, message, data };
}

async function searchProjects(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const { data: projects } = await supabase.from('projects').select('id, name, code, type, status, description').eq('organization_id', currentMember.organization_id).or(`name.ilike.%${args.query}%,code.ilike.%${args.query}%`).limit(args.limit || 10);
  if (!projects?.length) return { success: true, message: `Sin resultados para "${args.query}"`, data: [] };

  let message = `## 🔍 Proyectos: "${args.query}" (${projects.length})\n\n`;
  message += projects.map((p: any) => `- **${p.name}**${p.code ? ` (${p.code})` : ''} - ${p.type}`).join('\n');
  return { success: true, message, data: projects };
}

async function notifyTeamMember(supabase: any, userId: string, args: any) {
  return await addTeamComment(supabase, userId, {
    entity_type: args.entity_type,
    entity_identifier: args.entity_identifier,
    content: `@${args.member_email.split('@')[0]} ${args.message}`,
  });
}

// ===== MAIN TOOL EXECUTOR =====

async function executeTool(supabase: any, userId: string, toolName: string, args: any): Promise<{ success: boolean; message: string; data?: any }> {
  console.log(`Executing tool: ${toolName}`, args);
  
  try {
    switch (toolName) {
      case "create_contact": {
        let companyId = null;
        if (args.company_name) {
          const { data: company } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.company_name}%`).limit(1).single();
          companyId = company?.id || null;
        }
        const { data, error } = await supabase.from('contacts').insert({ user_id: userId, email: args.email, first_name: args.first_name || null, last_name: args.last_name || null, phone: args.phone || null, whatsapp_number: args.whatsapp_number || null, job_title: args.job_title || null, notes: args.notes || null, company_id: companyId }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Contacto creado: ${args.first_name || ''} ${args.last_name || ''} (${args.email})`, data };
      }
      case "update_contact": return await updateContact(supabase, userId, args);
      case "search_contacts": return await searchContactsAdvanced(supabase, userId, args);
      case "create_company": {
        const { data, error } = await supabase.from('companies').insert({ user_id: userId, name: args.name, industry: args.industry || null, website: args.website || null, phone: args.phone || null, city: args.city || null, country: args.country || null, description: args.description || null }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Empresa creada: ${args.name}`, data };
      }
      case "search_companies": {
        const { data, error } = await supabase.from('companies').select('id, name, industry, website, phone, city, country, domain').eq('user_id', userId).or(`name.ilike.%${args.query}%,domain.ilike.%${args.query}%`).limit(10);
        if (error) throw error;
        if (!data?.length) return { success: true, message: 'No se encontraron empresas', data: [] };
        const results = data.map((c: any) => `• **${c.name}**${c.industry ? ` (${c.industry})` : ''}${c.website ? ` 🌐 ${c.website}` : ''}`).join('\n');
        return { success: true, message: `🏢 Empresas encontradas:\n${results}`, data };
      }
      case "update_company": return await updateCompany(supabase, userId, args);
      case "create_task": {
        const dueDate = args.due_date ? new Date(args.due_date + 'T09:00:00').toISOString() : null;
        const { data, error } = await supabase.from('activities').insert({ user_id: userId, title: args.title, description: args.description || null, type: args.type || 'task', priority: args.priority || 'medium', due_date: dueDate, completed: false }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Tarea creada: "${args.title}"${dueDate ? ` (vence: ${args.due_date})` : ''}`, data };
      }
      case "list_tasks": return await listTasks(supabase, userId, args);
      case "complete_task": return await completeTask(supabase, userId, args);
      case "update_task": return await updateTask(supabase, userId, args);
      case "schedule_meeting": {
        const meetingDate = args.date ? new Date(`${args.date}T${args.time || '09:00'}:00`).toISOString() : null;
        let contactId = null;
        if (args.contact_email) {
          const { data } = await supabase.from('contacts').select('id').eq('user_id', userId).eq('email', args.contact_email).single();
          contactId = data?.id || null;
        }
        const { data, error } = await supabase.from('activities').insert({ user_id: userId, title: args.title, description: args.description || null, type: 'meeting', priority: 'medium', due_date: meetingDate, completed: false, contact_id: contactId }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Reunión programada: "${args.title}"${args.date ? ` el ${args.date}` : ''}${args.time ? ` a las ${args.time}` : ''}` };
      }
      case "create_opportunity": {
        let companyId = null, contactId = null;
        if (args.company_name) {
          const { data } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.company_name}%`).limit(1).single();
          companyId = data?.id || null;
        }
        if (args.contact_email) {
          const { data } = await supabase.from('contacts').select('id').eq('user_id', userId).eq('email', args.contact_email).single();
          contactId = data?.id || null;
        }
        const { data: pipeline } = await supabase.from('pipelines').select('id').eq('user_id', userId).eq('is_default', true).limit(1).single();
        let stageId = null;
        if (pipeline) {
          const { data: stage } = await supabase.from('stages').select('id').eq('pipeline_id', pipeline.id).order('position', { ascending: true }).limit(1).single();
          stageId = stage?.id || null;
        }
        const { data, error } = await supabase.from('opportunities').insert({ user_id: userId, title: args.title, value: args.value || 0, description: args.description || null, expected_close_date: args.expected_close_date || null, company_id: companyId, contact_id: contactId, pipeline_id: pipeline?.id || null, stage_id: stageId, status: 'open', probability: 50 }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Oportunidad creada: "${args.title}" - $${(args.value || 0).toLocaleString()}`, data };
      }
      case "update_opportunity_stage": {
        const { data: opp } = await supabase.from('opportunities').select('id, pipeline_id').eq('user_id', userId).ilike('title', `%${args.opportunity_title}%`).limit(1).single();
        if (!opp) return { success: false, message: `❌ Oportunidad "${args.opportunity_title}" no encontrada` };
        const { data: stage } = await supabase.from('stages').select('id, name').eq('pipeline_id', opp.pipeline_id).ilike('name', `%${args.new_stage}%`).limit(1).single();
        if (!stage) return { success: false, message: `❌ Etapa "${args.new_stage}" no encontrada` };
        const { error } = await supabase.from('opportunities').update({ stage_id: stage.id }).eq('id', opp.id);
        if (error) throw error;
        return { success: true, message: `✅ Oportunidad movida a "${stage.name}"` };
      }
      case "search_opportunities": return await searchOpportunities(supabase, userId, args);
      case "get_pipeline_summary": return await getPipelineSummaryAdvanced(supabase, userId, args);
      case "analyze_deal_health": return await analyzeDealHealth(supabase, userId, args);
      case "search_timeline": return await searchTimeline(supabase, userId, args);
      case "find_promises": return await findPromises(supabase, userId, args);
      case "get_next_best_action": return await getNextBestAction(supabase, userId, args);
      case "delete_entity": return await deleteEntity(supabase, userId, args);
      case "add_note": {
        const eType = args.entity_type || 'contact';
        if (eType === 'contact') {
          const { data: contact } = await supabase.from('contacts').select('id, notes').eq('user_id', userId).ilike('email', args.entity_identifier || '').limit(1).single();
          if (!contact) return { success: false, message: `❌ Contacto no encontrado` };
          const newNotes = contact.notes ? `${contact.notes}\n\n[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}` : `[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}`;
          await supabase.from('contacts').update({ notes: newNotes }).eq('id', contact.id);
          return { success: true, message: `✅ Nota agregada al contacto` };
        } else {
          const { data: company } = await supabase.from('companies').select('id, description').eq('user_id', userId).ilike('name', `%${args.entity_identifier || ''}%`).limit(1).single();
          if (!company) return { success: false, message: `❌ Empresa no encontrada` };
          const newDesc = company.description ? `${company.description}\n\n[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}` : `[${new Date().toLocaleDateString('es-ES')}] ${args.note_content}`;
          await supabase.from('companies').update({ description: newDesc }).eq('id', company.id);
          return { success: true, message: `✅ Nota agregada a la empresa` };
        }
      }
      // TEAM
      case "get_team_summary": return await getTeamSummary(supabase, userId);
      case "get_member_info": return await getMemberInfo(supabase, userId, args);
      case "get_quotas_progress": return await getQuotasProgress(supabase, userId, args);
      case "assign_contact": return await assignEntity(supabase, userId, 'contacts', args);
      case "assign_company": return await assignEntity(supabase, userId, 'companies', args);
      case "assign_opportunity": return await assignEntity(supabase, userId, 'opportunities', args);
      case "get_my_assignments": return await getMyAssignments(supabase, userId, args);
      case "add_team_comment": return await addTeamComment(supabase, userId, args);
      case "get_entity_comments": return await getEntityComments(supabase, userId, args);
      case "get_activity_feed": return await getActivityFeedTool(supabase, userId, args);
      case "notify_team_member": return await notifyTeamMember(supabase, userId, args);
      // PROJECTS
      case "list_projects": return await listProjects(supabase, userId, args);
      case "create_project": return await createProject(supabase, userId, args);
      case "get_project_stats": return await getProjectStats(supabase, userId, args);
      case "add_contact_to_project": return await addContactToProject(supabase, userId, args);
      case "get_project_contacts": return await getProjectContacts(supabase, userId, args);
      case "search_projects": return await searchProjects(supabase, userId, args);
      // OMNICANAL
      case "list_conversations": return await listConversations(supabase, userId, args);
      case "get_conversation_summary": return await getConversationSummary(supabase, userId, args);
      // INTELIGENCIA
      case "smart_search": return await smartSearch(supabase, userId, args);
      case "generate_crm_report": return await generateCRMReport(supabase, userId, args);
      default:
        return { success: false, message: `❌ Función desconocida: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error in ${toolName}:`, error);
    return { success: false, message: `❌ Error en ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}` };
  }
}

async function getUserIdFromToken(supabase: any, authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, currentRoute } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const userId = await getUserIdFromToken(supabase, authHeader);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Usuario no autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("Chat request - user:", userId, "route:", currentRoute, "tools:", tools.length);
    const crmContext = await fetchCRMContext(supabase, userId);
    const systemPrompt = buildSystemPrompt(crmContext, currentRoute);

    // First call with tools (non-streaming)
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "system", content: systemPrompt }, ...messages], tools, tool_choice: "auto", stream: false }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo en unos momentos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Error al conectar con IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];

    // Handle tool calls
    if (choice?.message?.tool_calls?.length > 0) {
      console.log("Tool calls:", choice.message.tool_calls.map((tc: any) => tc.function.name));
      const toolResults: any[] = [];
      for (const toolCall of choice.message.tool_calls) {
        const args = typeof toolCall.function.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
        const result = await executeTool(supabase, userId, toolCall.function.name, args);
        toolResults.push({ tool_call_id: toolCall.id, role: "tool", content: JSON.stringify(result) });
      }

      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "system", content: systemPrompt }, ...messages, choice.message, ...toolResults], stream: true }),
      });

      if (!followUp.ok) {
        const toolMessage = toolResults.map(r => JSON.parse(r.content).message).join('\n');
        return new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: toolMessage } }] })}\n\ndata: [DONE]\n\n`, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
      return new Response(followUp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // No tool calls - stream directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "system", content: systemPrompt }, ...messages], stream: true }),
    });

    return new Response(streamResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
