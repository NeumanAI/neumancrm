import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODEL = "google/gemini-3-flash-preview";

// ===== TOOL DEFINITIONS =====
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
      description: "Lista tareas y actividades del usuario con filtros avanzados.",
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
      description: "Marca una tarea como completada o la reabre.",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Título o parte del título de la tarea" },
          completed: { type: "boolean", description: "true para completar, false para reabrir" },
        },
        required: ["task_title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Actualiza una tarea existente.",
      parameters: {
        type: "object",
        properties: {
          task_title: { type: "string", description: "Título actual de la tarea (requerido)" },
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
          contact_email: { type: "string", description: "Email del contacto" },
          date: { type: "string", description: "Fecha (YYYY-MM-DD)" },
          time: { type: "string", description: "Hora (HH:MM)" },
          description: { type: "string", description: "Descripción" },
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
          title: { type: "string", description: "Título (requerido)" },
          value: { type: "number", description: "Valor estimado" },
          company_name: { type: "string", description: "Empresa asociada" },
          contact_email: { type: "string", description: "Contacto asociado" },
          expected_close_date: { type: "string", description: "Fecha esperada de cierre (YYYY-MM-DD)" },
          description: { type: "string", description: "Descripción" },
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
          opportunity_title: { type: "string", description: "Título de la oportunidad" },
          new_stage: { type: "string", description: "Nueva etapa" },
        },
        required: ["opportunity_title", "new_stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_opportunities",
      description: "Busca oportunidades con filtros avanzados.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda" },
          min_value: { type: "number", description: "Valor mínimo" },
          max_value: { type: "number", description: "Valor máximo" },
          status: { type: "string", enum: ["open", "won", "lost"], description: "Estado" },
          stage_name: { type: "string", description: "Nombre de la etapa" },
          limit: { type: "number", description: "Máximo de resultados" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Resumen completo del pipeline de ventas.",
      parameters: {
        type: "object",
        properties: {
          include_closed: { type: "boolean", description: "Incluir deals cerrados" },
          days_range: { type: "number", description: "Rango de días (default: 30)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_deal_health",
      description: "Analiza la salud de una oportunidad basándose en actividad reciente.",
      parameters: {
        type: "object",
        properties: {
          opportunity_id: { type: "string", description: "ID de la oportunidad" },
          company_name: { type: "string", description: "Nombre de la empresa (alternativa)" },
        },
      },
    },
  },
  // ===== TIMELINE =====
  {
    type: "function",
    function: {
      name: "search_timeline",
      description: "Busca en el historial de interacciones.",
      parameters: {
        type: "object",
        properties: {
          contact_email: { type: "string", description: "Email del contacto" },
          company_name: { type: "string", description: "Empresa" },
          entry_type: { type: "string", enum: ["email", "meeting", "call", "note", "whatsapp"], description: "Tipo" },
          search_text: { type: "string", description: "Buscar por contenido" },
          days_ago: { type: "number", description: "Últimos X días (default: 30)" },
          limit: { type: "number", description: "Resultados (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_promises",
      description: "Busca compromisos y action items pendientes.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "overdue", "all"], description: "Estado" },
          contact_email: { type: "string", description: "Filtrar por contacto" },
          days_range: { type: "number", description: "Últimos X días (default: 14)" },
        },
      },
    },
  },
  // ===== RECOMENDACIONES =====
  {
    type: "function",
    function: {
      name: "get_next_best_action",
      description: "Sugiere la siguiente mejor acción para una entidad.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contact", "company", "opportunity"], description: "Tipo" },
          entity_identifier: { type: "string", description: "Email, nombre o ID" },
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
      description: "Agrega una nota a un contacto o empresa.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contact", "company"], description: "Tipo" },
          entity_identifier: { type: "string", description: "Email o nombre" },
          note_content: { type: "string", description: "Contenido (requerido)" },
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
      description: "Elimina un contacto, empresa u oportunidad. Solo con confirmación explícita.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contact", "company", "opportunity"], description: "Tipo" },
          entity_identifier: { type: "string", description: "Identificador" },
        },
        required: ["entity_type", "entity_identifier"],
      },
    },
  },
  // ===== EQUIPO =====
  {
    type: "function",
    function: {
      name: "get_team_summary",
      description: "Resumen del equipo: organización, miembros, roles, cuotas.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_member_info",
      description: "Info detallada de un miembro del equipo.",
      parameters: {
        type: "object",
        properties: { member_identifier: { type: "string", description: "Email o nombre" } },
        required: ["member_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quotas_progress",
      description: "Progreso de cuotas de ventas del equipo.",
      parameters: {
        type: "object",
        properties: { member_email: { type: "string", description: "Email (opcional)" } },
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
          contact_email: { type: "string", description: "Email del contacto" },
          assigned_to_email: { type: "string", description: "Email del miembro" },
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
          company_name: { type: "string", description: "Nombre de la empresa" },
          assigned_to_email: { type: "string", description: "Email del miembro" },
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
          opportunity_title: { type: "string", description: "Título de la oportunidad" },
          assigned_to_email: { type: "string", description: "Email del miembro" },
        },
        required: ["opportunity_title", "assigned_to_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_my_assignments",
      description: "Lista entidades asignadas al usuario o a un miembro.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email (opcional)" },
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities", "all"], description: "Tipo (default: all)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_team_comment",
      description: "Agrega un comentario colaborativo a una entidad.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo" },
          entity_identifier: { type: "string", description: "Identificador" },
          content: { type: "string", description: "Contenido" },
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
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo" },
          entity_identifier: { type: "string", description: "Identificador" },
          limit: { type: "number", description: "Máximo (default: 10)" },
        },
        required: ["entity_type", "entity_identifier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_feed",
      description: "Actividad reciente del equipo.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities", "activities"], description: "Filtrar por tipo" },
          entity_id: { type: "string", description: "Filtrar por ID" },
          limit: { type: "number", description: "Máximo (default: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "notify_team_member",
      description: "Notifica a un miembro del equipo.",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro" },
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo" },
          entity_identifier: { type: "string", description: "Identificador" },
          message: { type: "string", description: "Mensaje" },
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
      description: "Lista los proyectos de la organización.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "inactive", "completed", "cancelled"], description: "Estado" },
          type: { type: "string", description: "Tipo" },
          limit: { type: "number", description: "Máximo (default: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description: "Crea un nuevo proyecto.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre (requerido)" },
          code: { type: "string", description: "Código" },
          description: { type: "string", description: "Descripción" },
          type: { type: "string", description: "Tipo" },
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
      description: "Métricas detalladas de un proyecto.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nombre" },
          project_id: { type: "string", description: "ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_contact_to_project",
      description: "Añade un contacto a un proyecto.",
      parameters: {
        type: "object",
        properties: {
          contact_email: { type: "string", description: "Email del contacto" },
          project_name: { type: "string", description: "Nombre del proyecto" },
          status: { type: "string", enum: ["lead", "qualified", "customer", "inactive"], description: "Estado" },
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
      description: "Contactos asociados a un proyecto.",
      parameters: {
        type: "object",
        properties: {
          project_name: { type: "string", description: "Nombre del proyecto" },
          status: { type: "string", enum: ["lead", "qualified", "customer", "inactive"], description: "Estado" },
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
      description: "Lista conversaciones omnicanal abiertas.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string", enum: ["whatsapp", "instagram", "webchat", "email"], description: "Canal" },
          status: { type: "string", enum: ["open", "closed", "archived"], description: "Estado" },
          limit: { type: "number", description: "Máximo (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_conversation_summary",
      description: "Resumen de una conversación con últimos mensajes.",
      parameters: {
        type: "object",
        properties: {
          contact_name: { type: "string", description: "Nombre del contacto" },
          channel: { type: "string", description: "Canal" },
          limit: { type: "number", description: "Mensajes (default: 10)" },
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
      description: "Búsqueda universal en todo el CRM.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda" },
          entity_types: { type: "array", items: { type: "string", enum: ["contacts", "companies", "opportunities", "tasks"] }, description: "Tipos a buscar" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_crm_report",
      description: "Resumen ejecutivo completo del CRM.",
      parameters: {
        type: "object",
        properties: {
          period_days: { type: "number", description: "Período en días (default: 30)" },
        },
      },
    },
  },

  // ===================================================================
  // ===== FASE 1: CALENDARIO (12 nuevos) =====
  // ===================================================================
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Crea un evento en el calendario (reunión, llamada, demo). Usa cuando el usuario quiera agendar o programar algo.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título del evento" },
          description: { type: "string", description: "Descripción" },
          event_type: { type: "string", enum: ["meeting", "call", "demo", "follow_up", "closing", "other"], description: "Tipo" },
          start_time: { type: "string", description: "Fecha y hora inicio (ISO 8601)" },
          end_time: { type: "string", description: "Fecha y hora fin (ISO 8601)" },
          all_day: { type: "boolean", description: "Todo el día" },
          location: { type: "string", description: "Ubicación" },
          meeting_url: { type: "string", description: "URL de Zoom/Meet" },
          contact_id: { type: "string", description: "ID del contacto relacionado" },
          company_id: { type: "string", description: "ID de la empresa relacionada" },
          opportunity_id: { type: "string", description: "ID de la oportunidad" },
          color: { type: "string", description: "Color hex" },
        },
        required: ["title", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_calendar_events",
      description: "Lista eventos del calendario en un rango de fechas. Usa para ver agenda, próximas reuniones.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Fecha inicio (YYYY-MM-DD)" },
          end_date: { type: "string", description: "Fecha fin (YYYY-MM-DD)" },
          event_type: { type: "string", description: "Filtrar por tipo" },
          include_tasks: { type: "boolean", description: "Incluir tareas con vencimiento" },
          include_goals: { type: "boolean", description: "Incluir metas" },
        },
        required: ["start_date", "end_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_agenda",
      description: "Obtiene la agenda del día actual. Usa cuando pregunten qué tienen hoy.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_calendar_event",
      description: "Actualiza un evento del calendario (reprogramar, cambiar hora, etc).",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "ID del evento" },
          title: { type: "string", description: "Nuevo título" },
          start_time: { type: "string", description: "Nueva hora inicio" },
          end_time: { type: "string", description: "Nueva hora fin" },
          location: { type: "string", description: "Nueva ubicación" },
          description: { type: "string", description: "Nueva descripción" },
          meeting_url: { type: "string", description: "Nuevo URL" },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_calendar_event",
      description: "Elimina o cancela un evento del calendario.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "ID del evento" },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_available_slots",
      description: "Encuentra huecos libres en el calendario para agendar reuniones.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Fecha específica (YYYY-MM-DD)" },
          duration_minutes: { type: "number", description: "Duración en minutos (default: 60)" },
          days_ahead: { type: "number", description: "Próximos N días (default: 7)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Crea una meta u objetivo con fecha límite (cuota de ventas, calls, etc).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Título de la meta" },
          goal_type: { type: "string", enum: ["revenue", "calls", "deals_closed", "meetings", "new_contacts", "other"], description: "Tipo" },
          target_value: { type: "number", description: "Valor objetivo" },
          start_date: { type: "string", description: "Fecha inicio (YYYY-MM-DD)" },
          end_date: { type: "string", description: "Fecha límite (YYYY-MM-DD)" },
          color: { type: "string", description: "Color hex" },
        },
        required: ["title", "target_value", "start_date", "end_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal_progress",
      description: "Actualiza el progreso actual de una meta.",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string", description: "ID de la meta" },
          current_value: { type: "number", description: "Valor actual" },
        },
        required: ["goal_id", "current_value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_goals",
      description: "Lista las metas activas del usuario.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "completed", "all"], description: "Estado" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_event",
      description: "Reprograma un evento a una nueva fecha/hora.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "ID del evento" },
          new_start_time: { type: "string", description: "Nueva fecha y hora inicio (ISO 8601)" },
          new_end_time: { type: "string", description: "Nueva fecha y hora fin (ISO 8601)" },
        },
        required: ["event_id", "new_start_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_week_summary",
      description: "Resumen de la semana: eventos, tareas, metas.",
      parameters: {
        type: "object",
        properties: {
          week_offset: { type: "number", description: "0=esta semana, 1=próxima, -1=anterior" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "block_time",
      description: "Bloquea tiempo en el calendario para trabajo enfocado.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Qué vas a hacer" },
          date: { type: "string", description: "Fecha (YYYY-MM-DD)" },
          start_time: { type: "string", description: "Hora inicio (HH:MM)" },
          duration_hours: { type: "number", description: "Duración en horas" },
        },
        required: ["title", "date", "start_time", "duration_hours"],
      },
    },
  },

  // ===================================================================
  // ===== FASE 2: ACCIONES INTELIGENTES (7 nuevos) =====
  // ===================================================================
  {
    type: "function",
    function: {
      name: "prioritize_my_day",
      description: "IA sugiere priorización de tareas y deals para hoy basándose en urgencia e importancia.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_follow_ups",
      description: "Sugiere contactos/deals que requieren seguimiento urgente.",
      parameters: {
        type: "object",
        properties: {
          urgency: { type: "string", enum: ["high", "medium", "all"], description: "Nivel de urgencia" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "predict_deal_close_probability",
      description: "Predice probabilidad de cierre de un deal basándose en datos.",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "ID del deal" },
          deal_title: { type: "string", description: "Título del deal (alternativa)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_upsell_opportunities",
      description: "Identifica clientes con potencial de upsell/cross-sell.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Máximo de sugerencias (default: 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_contact_engagement",
      description: "Analiza nivel de engagement de un contacto.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID del contacto" },
          contact_email: { type: "string", description: "Email del contacto (alternativa)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "smart_meeting_scheduler",
      description: "Sugiere mejor momento para reunión considerando disponibilidad.",
      parameters: {
        type: "object",
        properties: {
          duration_minutes: { type: "number", description: "Duración en minutos" },
          preferred_time: { type: "string", enum: ["morning", "afternoon", "any"], description: "Preferencia horaria" },
          days_ahead: { type: "number", description: "Buscar en próximos N días (default: 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_deal_summary",
      description: "Genera resumen ejecutivo de un deal con IA: estado, próximos pasos, riesgos.",
      parameters: {
        type: "object",
        properties: {
          deal_id: { type: "string", description: "ID del deal" },
          deal_title: { type: "string", description: "Título del deal (alternativa)" },
        },
      },
    },
  },

  // ===================================================================
  // ===== FASE 3: REPORTES & ANALYTICS (8 nuevos) =====
  // ===================================================================
  {
    type: "function",
    function: {
      name: "get_sales_report",
      description: "Genera reporte de ventas del período especificado.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "this_week", "this_month", "this_quarter", "custom"], description: "Período" },
          start_date: { type: "string", description: "Fecha inicio (si period=custom)" },
          end_date: { type: "string", description: "Fecha fin (si period=custom)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_activity_report",
      description: "Reporte de actividad: llamadas, emails, reuniones realizadas.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["today", "this_week", "this_month"], description: "Período" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_conversion_funnel",
      description: "Análisis de conversión entre etapas del pipeline.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["this_month", "this_quarter", "this_year"], description: "Período" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deal_forecast",
      description: "Proyección de ventas (forecast) basado en pipeline actual.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["this_month", "next_month", "this_quarter"], description: "Período" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_performance",
      description: "Compara rendimiento actual vs período anterior.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["revenue", "deals_closed", "contacts_added", "activities"], description: "Métrica" },
          current_period: { type: "string", enum: ["this_week", "this_month"], description: "Período actual" },
          compare_to: { type: "string", enum: ["last_week", "last_month"], description: "Comparar con" },
        },
        required: ["metric"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_performers",
      description: "Lista de top performers del equipo.",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["revenue", "deals_closed", "activity"], description: "Métrica" },
          limit: { type: "number", description: "Top N (default: 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lost_deals_analysis",
      description: "Análisis de deals perdidos: razones, patrones.",
      parameters: {
        type: "object",
        properties: {
          period_days: { type: "number", description: "Últimos N días (default: 90)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_response_time_stats",
      description: "Estadísticas de tiempo de respuesta a leads/clientes.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["this_week", "this_month"], description: "Período" },
        },
      },
    },
  },

  // ===================================================================
  // ===== FASE 4: EMAIL & COMUNICACIÓN (6 nuevos) =====
  // ===================================================================
  {
    type: "function",
    function: {
      name: "draft_email",
      description: "IA genera borrador de email personalizado para un contexto específico.",
      parameters: {
        type: "object",
        properties: {
          recipient_email: { type: "string", description: "Email del destinatario" },
          purpose: { type: "string", enum: ["follow_up", "proposal", "introduction", "closing", "thank_you", "custom"], description: "Propósito" },
          context: { type: "string", description: "Contexto adicional" },
          tone: { type: "string", enum: ["formal", "casual", "friendly"], description: "Tono" },
        },
        required: ["recipient_email", "purpose"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_email_response",
      description: "Sugiere respuesta a un email recibido.",
      parameters: {
        type: "object",
        properties: {
          email_content: { type: "string", description: "Contenido del email recibido" },
          response_type: { type: "string", enum: ["positive", "negative", "neutral"], description: "Tipo de respuesta" },
        },
        required: ["email_content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_whatsapp_message",
      description: "Registra envío de mensaje de WhatsApp a un contacto.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID del contacto" },
          contact_email: { type: "string", description: "Email del contacto (alternativa)" },
          message: { type: "string", description: "Texto del mensaje" },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_email",
      description: "Programa envío de email para más tarde (crea tarea recordatorio).",
      parameters: {
        type: "object",
        properties: {
          recipient_email: { type: "string", description: "Destinatario" },
          subject: { type: "string", description: "Asunto" },
          body: { type: "string", description: "Contenido" },
          send_at: { type: "string", description: "Fecha y hora de envío (ISO 8601)" },
        },
        required: ["recipient_email", "subject", "send_at"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_email_history",
      description: "Historial de comunicaciones con un contacto.",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID del contacto" },
          contact_email: { type: "string", description: "Email del contacto (alternativa)" },
          limit: { type: "number", description: "Número de emails (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_email_sentiment",
      description: "Analiza sentimiento de un email (positivo, negativo, neutral).",
      parameters: {
        type: "object",
        properties: {
          email_content: { type: "string", description: "Contenido del email" },
        },
        required: ["email_content"],
      },
    },
  },

  // ===================================================================
  // ===== FASE 5: DATOS & BÚSQUEDA AVANZADA (5 nuevos) =====
  // ===================================================================
  {
    type: "function",
    function: {
      name: "advanced_search",
      description: "Búsqueda avanzada con filtros complejos y múltiples condiciones.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities", "activities"], description: "Tipo" },
          filters: { type: "string", description: "Descripción de filtros en texto natural" },
          sort_by: { type: "string", description: "Campo para ordenar" },
          limit: { type: "number", description: "Resultados (default: 20)" },
        },
        required: ["entity_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_duplicates_ai",
      description: "Encuentra contactos o empresas potencialmente duplicadas.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies"], description: "Tipo" },
        },
        required: ["entity_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "bulk_update",
      description: "Actualiza múltiples registros a la vez.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo" },
          filter_field: { type: "string", description: "Campo de filtro" },
          filter_value: { type: "string", description: "Valor del filtro" },
          update_field: { type: "string", description: "Campo a actualizar" },
          update_value: { type: "string", description: "Nuevo valor" },
        },
        required: ["entity_type", "update_field", "update_value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "export_data",
      description: "Genera un resumen exportable de datos del CRM.",
      parameters: {
        type: "object",
        properties: {
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo" },
          limit: { type: "number", description: "Registros (default: 100)" },
        },
        required: ["entity_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_data_quality_score",
      description: "Analiza calidad de datos: contactos sin email, empresas sin industria, etc.",
      parameters: { type: "object", properties: {} },
    },
  },

  // ===================================================================
  // ===== FASE 6: COLABORACIÓN AVANZADA (4 nuevos) =====
  // ===================================================================
  {
    type: "function",
    function: {
      name: "mention_team_member",
      description: "Menciona a un miembro del equipo en un contexto (notificación automática).",
      parameters: {
        type: "object",
        properties: {
          member_email: { type: "string", description: "Email del miembro" },
          entity_type: { type: "string", enum: ["contacts", "companies", "opportunities"], description: "Tipo" },
          entity_id: { type: "string", description: "ID de la entidad" },
          message: { type: "string", description: "Mensaje de la mención" },
        },
        required: ["member_email", "entity_type", "entity_id", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_team_task",
      description: "Crea tarea y la asigna a otro miembro del equipo.",
      parameters: {
        type: "object",
        properties: {
          assignee_email: { type: "string", description: "Email del responsable" },
          title: { type: "string", description: "Título" },
          description: { type: "string", description: "Descripción" },
          due_date: { type: "string", description: "Fecha de vencimiento (YYYY-MM-DD)" },
          priority: { type: "string", enum: ["high", "medium", "low"], description: "Prioridad" },
        },
        required: ["assignee_email", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handoff_deal",
      description: "Transfiere un deal a otro vendedor con contexto.",
      parameters: {
        type: "object",
        properties: {
          deal_title: { type: "string", description: "Título del deal" },
          new_owner_email: { type: "string", description: "Email del nuevo responsable" },
          handoff_notes: { type: "string", description: "Notas para el nuevo owner" },
        },
        required: ["deal_title", "new_owner_email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_manager_approval",
      description: "Solicita aprobación de manager (descuento, cambio de términos).",
      parameters: {
        type: "object",
        properties: {
          deal_title: { type: "string", description: "Título del deal" },
          request_type: { type: "string", enum: ["discount", "terms", "pricing", "other"], description: "Tipo de solicitud" },
          details: { type: "string", description: "Detalles de la solicitud" },
          urgency: { type: "string", enum: ["high", "normal"], description: "Urgencia" },
        },
        required: ["deal_title", "request_type", "details"],
      },
    },
  },

  // ===================================================================
  // ===== FASE 7: DOCUMENTOS (6 nuevos) =====
  // ===================================================================
  {
    type: "function",
    function: {
      name: "search_documents",
      description: "Busca documentos en todo el CRM por nombre, tipo o tags. Busca en repositorio central, documentos de contactos y de empresas.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto de búsqueda (nombre de archivo)" },
          document_type: { type: "string", description: "Tipo de documento (contract, proposal, quote, invoice, presentation, nda, agreement, other)" },
          limit: { type: "number", description: "Máximo de resultados (default: 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_documents",
      description: "Lista los documentos más recientes del repositorio central de la organización.",
      parameters: {
        type: "object",
        properties: {
          document_type: { type: "string", description: "Filtrar por tipo" },
          limit: { type: "number", description: "Máximo de resultados (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_document_stats",
      description: "Obtiene estadísticas de documentos: total, por tipo, almacenamiento usado, compartidos.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_contact_documents",
      description: "Lista documentos asociados a un contacto específico.",
      parameters: {
        type: "object",
        properties: {
          contact_email: { type: "string", description: "Email del contacto" },
          contact_name: { type: "string", description: "Nombre del contacto (alternativa)" },
          limit: { type: "number", description: "Máximo (default: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_company_documents",
      description: "Lista documentos asociados a una empresa específica.",
      parameters: {
        type: "object",
        properties: {
          company_name: { type: "string", description: "Nombre de la empresa" },
          limit: { type: "number", description: "Máximo (default: 10)" },
        },
        required: ["company_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "share_document",
      description: "Genera un link de descarga pública para compartir un documento con clientes. Busca por nombre de archivo.",
      parameters: {
        type: "object",
        properties: {
          file_name: { type: "string", description: "Nombre del archivo a compartir" },
          expires_in_days: { type: "number", description: "Días de vigencia del link (opcional, sin límite por defecto)" },
        },
        required: ["file_name"],
      },
    },
  },
];

// ===== TYPES =====
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
  recentActivity: Array<{ user_name: string; action: string; entity_type: string; entity_name: string; created_at: string }>;
}

// ===== SYSTEM PROMPT =====
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
  const roleLabels: Record<string, string> = { admin: 'Administrador', manager: 'Manager', sales_rep: 'Representante de Ventas', viewer: 'Visor' };
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
    teamSection = `\n## 👥 Equipo:\n**Org:** ${teamContext.organization.name} | **Tu rol:** ${roleLabels[currentRole] || currentRole} | **Miembros:** ${teamContext.teamMembers.filter(m => m.is_active).length}\n${teamContext.teamMembers.length > 0 ? teamContext.teamMembers.map(m => `- ${m.full_name || m.email} (${roleLabels[m.role] || m.role})`).join('\n') : '- Sin miembros'}\n**Puedes:** ${permissions.can.join(', ')}${permissions.cannot.length > 0 ? ` | **No puedes:** ${permissions.cannot.join(', ')}` : ''}\n`;
  }

  let routeContext = '';
  if (currentRoute) {
    const routeMap: Record<string, string> = {
      '/dashboard': 'Dashboard. Prioriza insights, métricas y resúmenes.',
      '/pipeline': 'Pipeline. Prioriza deals, etapas y análisis.',
      '/contacts': 'Contactos. Prioriza búsqueda y seguimiento.',
      '/companies': 'Empresas. Prioriza relaciones comerciales.',
      '/tasks': 'Tareas. Prioriza gestión de pendientes.',
      '/team': 'Equipo. Prioriza miembros, cuotas y asignaciones.',
      '/projects': 'Proyectos. Prioriza métricas por proyecto.',
      '/conversations': 'Conversaciones. Prioriza mensajes omnicanal.',
      '/calendar': 'Calendario. Prioriza eventos, agenda, metas y time blocking.',
      '/settings': 'Configuración.',
    };
    if (currentRoute.startsWith('/contacts/')) routeContext = '📍 Viendo contacto específico.';
    else if (currentRoute.startsWith('/companies/')) routeContext = '📍 Viendo empresa específica.';
    else if (currentRoute.startsWith('/projects/')) routeContext = '📍 Viendo proyecto específico.';
    else routeContext = routeMap[currentRoute] || '';
  }

  return `Eres un copiloto de CRM inteligente y proactivo con 74 herramientas avanzadas.

## 📊 Estado del CRM:
- Contactos: ${crmContext.contactsCount} | Empresas: ${crmContext.companiesCount} | Oportunidades: ${crmContext.opportunitiesCount}
- Tareas: ${crmContext.tasksCount} (${crmContext.pendingTasks} pendientes) | Pipeline: $${crmContext.pipelineValue.toLocaleString()} | Proyectos: ${crmContext.projectsCount || 0}

📇 **Contactos recientes**: ${crmContext.recentContacts.length > 0 ? crmContext.recentContacts.map(c => `${c.name} (${c.email})`).join(', ') : 'Ninguno'}
💰 **Oportunidades activas**: ${crmContext.recentOpportunities.length > 0 ? crmContext.recentOpportunities.map(o => `${o.title}: $${o.value.toLocaleString()}`).join(', ') : 'Ninguna'}
📋 **Tareas próximas**: ${crmContext.upcomingTasks.length > 0 ? crmContext.upcomingTasks.map(t => `${t.title}${t.dueDate ? ` (${t.dueDate})` : ''}`).join(', ') : 'Ninguna'}
${teamSection}
${routeContext ? `## 📍 Contexto: ${routeContext}\n` : ''}

## Capacidades (80 herramientas):
### CRUD: contactos, empresas, oportunidades, tareas
### Pipeline: summary, deal health, stages, forecasting
### 📅 Calendario: crear/listar/actualizar/eliminar eventos, agenda hoy/semana, huecos libres, metas, time blocking
### 🎯 Acciones IA: priorizar día, suggest follow-ups, predecir cierre, upsell, engagement, deal summary
### 📊 Reportes: ventas, actividad, conversión, forecast, comparar performance, top performers, deals perdidos
### 📧 Email: drafts, respuestas, WhatsApp, programar, historial, sentimiento
### 📈 Datos: búsqueda avanzada, duplicados, bulk update, export, calidad de datos
### 👥 Colaboración: menciones, tareas de equipo, handoff deals, aprobaciones de manager
### 📂 Documentos: buscar docs, listar recientes, stats, docs de contacto/empresa, compartir con link público
### Proyectos, Omnicanal, Inteligencia

## Directrices:
- Responde siempre en español con markdown (negritas, listas, emojis)
- Sé conciso pero útil, tono profesional y cercano
- Usa datos reales del contexto
- **NUNCA** simules creaciones sin usar la función correspondiente
- Para eliminar, pide confirmación explícita ANTES
- Si faltan datos obligatorios, pregunta primero
- Usa tools proactivamente, combina múltiples para respuestas completas`;
};

// ===== HELPERS =====
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

function getPeriodDates(period: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date, end: Date = now;
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'this_week': {
      const dayOfWeek = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      end = new Date(start.getTime() + 7 * 86400000);
      break;
    }
    case 'last_week': {
      const d = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d - 7);
      end = new Date(start.getTime() + 7 * 86400000);
      break;
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      end = new Date(now.getFullYear(), q * 3 + 3, 1);
      break;
    }
    case 'next_month':
      start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      end = new Date(now.getFullYear(), now.getMonth() + 2, 1);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear() + 1, 0, 1);
      break;
    case 'custom':
      start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      end = endDate ? new Date(endDate) : now;
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { start, end };
}

async function getOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  return data?.organization_id || null;
}

// ===== CRM CONTEXT FETCHER =====
async function fetchCRMContext(supabase: any, userId: string) {
  try {
    const [contactsResult, companiesResult, opportunitiesResult, activitiesResult, teamMemberResult, projectsResult] = await Promise.all([
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
    const pipelineValue = opportunities.filter((o: any) => o.status === 'open').reduce((sum: number, o: any) => sum + (o.value || 0), 0);

    let teamContext: TeamContext = { organization: null, currentMember: null, teamMembers: [], recentActivity: [] };
    if (currentMember?.organization_id) {
      const [orgResult, teamResult, activityFeedResult] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', currentMember.organization_id).single(),
        supabase.from('team_members').select('*').eq('organization_id', currentMember.organization_id).eq('is_active', true),
        supabase.from('activity_feed').select('*').eq('organization_id', currentMember.organization_id).order('created_at', { ascending: false }).limit(10),
      ]);
      teamContext = {
        organization: orgResult.data,
        currentMember,
        teamMembers: teamResult.data || [],
        recentActivity: (activityFeedResult.data || []).map((a: any) => ({ user_name: a.user_name || 'Usuario', action: a.action, entity_type: a.entity_type, entity_name: a.entity_name || '', created_at: a.created_at })),
      };
    }

    return {
      contactsCount: contacts.length, companiesCount: companies.length, opportunitiesCount: opportunities.length,
      tasksCount: activities.length, pendingTasks: pendingTasks.length, pipelineValue, projectsCount,
      recentContacts: contacts.slice(0, 5).map((c: any) => ({ name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sin nombre', email: c.email, company: c.companies?.name })),
      recentOpportunities: opportunities.slice(0, 5).map((o: any) => ({ title: o.title, value: o.value || 0, stage: o.stages?.name })),
      upcomingTasks: pendingTasks.slice(0, 5).map((t: any) => ({ title: t.title, dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES') : undefined, priority: t.priority })),
      teamContext,
    };
  } catch (error) {
    console.error("Error fetching CRM context:", error);
    return { contactsCount: 0, companiesCount: 0, opportunitiesCount: 0, tasksCount: 0, pendingTasks: 0, pipelineValue: 0, projectsCount: 0, recentContacts: [], recentOpportunities: [], upcomingTasks: [], teamContext: { organization: null, currentMember: null, teamMembers: [], recentActivity: [] } };
  }
}

// ===== EXISTING TOOL IMPLEMENTATIONS =====

async function updateContact(supabase: any, userId: string, args: any) {
  const updates: any = {};
  if (args.first_name !== undefined) updates.first_name = args.first_name;
  if (args.last_name !== undefined) updates.last_name = args.last_name;
  if (args.phone !== undefined) updates.phone = args.phone;
  if (args.whatsapp_number !== undefined) updates.whatsapp_number = args.whatsapp_number;
  if (args.job_title !== undefined) updates.job_title = args.job_title;
  if (args.notes !== undefined) updates.notes = args.notes;
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('contacts').update(updates).eq('user_id', userId).eq('email', args.email).select().single();
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!data) return { success: false, message: `❌ No se encontró contacto "${args.email}"` };
  return { success: true, message: `✅ Contacto ${args.email} actualizado`, data };
}

async function updateCompany(supabase: any, userId: string, args: any) {
  const { data: company } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.name}%`).limit(1).maybeSingle();
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
  return { success: true, message: `✅ Empresa "${args.name}" actualizada` };
}

async function searchContactsAdvanced(supabase: any, userId: string, args: any) {
  let query = supabase.from('contacts').select('id, first_name, last_name, email, phone, whatsapp_number, job_title, companies(name)').eq('user_id', userId);
  if (args.query) query = query.or(`first_name.ilike.%${args.query}%,last_name.ilike.%${args.query}%,email.ilike.%${args.query}%`);
  if (args.has_whatsapp) query = query.not('whatsapp_number', 'is', null);
  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  let contacts = data || [];
  if (args.company_name) contacts = contacts.filter((c: any) => c.companies?.name?.toLowerCase().includes(args.company_name.toLowerCase()));
  if (contacts.length === 0) return { success: true, message: 'No se encontraron contactos', data: [] };
  const results = contacts.map((c: any) => `• ${c.first_name || ''} ${c.last_name || ''} - ${c.email}${c.whatsapp_number ? ` 📱` : ''}${c.companies?.name ? ` @ ${c.companies.name}` : ''}`).join('\n');
  return { success: true, message: `📇 ${contacts.length} contacto(s):\n${results}`, data: contacts };
}

async function listTasks(supabase: any, userId: string, args: any) {
  const now = new Date();
  let query = supabase.from('activities').select('id, title, description, type, priority, due_date, completed, completed_at, created_at').eq('user_id', userId);
  if (args.status === 'pending') query = query.eq('completed', false);
  else if (args.status === 'completed') query = query.eq('completed', true);
  else if (args.status === 'overdue') query = query.eq('completed', false).lt('due_date', now.toISOString());
  else if (args.status === 'today') {
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
  if (tasks.length === 0) return { success: true, message: 'No hay tareas con esos filtros.', data: [] };
  const typeEmoji: Record<string, string> = { task: '📋', call: '📞', email: '📧', meeting: '🤝', follow_up: '🔄' };
  const priorityEmoji: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' };
  let message = `## 📋 Tareas (${tasks.length})\n\n`;
  message += tasks.map((t: any) => {
    const status = t.completed ? '✅' : (t.due_date && new Date(t.due_date) < now ? '⏰ VENCIDA' : '⬜');
    const dueStr = t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES') : 'Sin fecha';
    return `${status} ${typeEmoji[t.type] || '📋'} **${t.title}** ${priorityEmoji[t.priority] || ''}\n   Vence: ${dueStr}`;
  }).join('\n\n');
  return { success: true, message, data: tasks };
}

async function completeTask(supabase: any, userId: string, args: any) {
  const completed = args.completed !== undefined ? args.completed : true;
  const { data: tasks } = await supabase.from('activities').select('id, title').eq('user_id', userId).ilike('title', `%${args.task_title}%`).limit(5);
  if (!tasks?.length) return { success: false, message: `❌ No se encontró tarea "${args.task_title}"` };
  const updates: any = { completed, updated_at: new Date().toISOString() };
  if (completed) updates.completed_at = new Date().toISOString(); else updates.completed_at = null;
  const { error } = await supabase.from('activities').update(updates).eq('id', tasks[0].id);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: completed ? `✅ Tarea "${tasks[0].title}" completada` : `🔄 Tarea "${tasks[0].title}" reabierta` };
}

async function updateTask(supabase: any, userId: string, args: any) {
  const { data: tasks } = await supabase.from('activities').select('id, title').eq('user_id', userId).ilike('title', `%${args.task_title}%`).limit(1);
  if (!tasks?.length) return { success: false, message: `❌ No se encontró tarea "${args.task_title}"` };
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
    const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('user_id', userId).eq('email', entity_identifier).maybeSingle();
    if (!data) return { success: false, message: `❌ No se encontró contacto "${entity_identifier}"` };
    const { error } = await supabase.from('contacts').delete().eq('id', data.id);
    if (error) return { success: false, message: `❌ Error: ${error.message}` };
    return { success: true, message: `🗑️ Contacto eliminado` };
  }
  if (entity_type === 'company') {
    const { data } = await supabase.from('companies').select('id, name').eq('user_id', userId).ilike('name', `%${entity_identifier}%`).limit(1).maybeSingle();
    if (!data) return { success: false, message: `❌ No se encontró empresa "${entity_identifier}"` };
    const { error } = await supabase.from('companies').delete().eq('id', data.id);
    if (error) return { success: false, message: `❌ Error: ${error.message}` };
    return { success: true, message: `🗑️ Empresa "${data.name}" eliminada` };
  }
  if (entity_type === 'opportunity') {
    const { data } = await supabase.from('opportunities').select('id, title').eq('user_id', userId).ilike('title', `%${entity_identifier}%`).limit(1).maybeSingle();
    if (!data) return { success: false, message: `❌ No se encontró oportunidad "${entity_identifier}"` };
    const { error } = await supabase.from('opportunities').delete().eq('id', data.id);
    if (error) return { success: false, message: `❌ Error: ${error.message}` };
    return { success: true, message: `🗑️ Oportunidad "${data.title}" eliminada` };
  }
  return { success: false, message: `❌ Tipo "${entity_type}" no soportado` };
}

async function searchOpportunities(supabase: any, userId: string, args: any) {
  let query = supabase.from('opportunities').select('id, title, value, status, probability, expected_close_date, companies(name), stages(name)').eq('user_id', userId);
  if (args.query) query = query.ilike('title', `%${args.query}%`);
  if (args.status) query = query.eq('status', args.status);
  if (args.min_value) query = query.gte('value', args.min_value);
  if (args.max_value) query = query.lte('value', args.max_value);
  query = query.order('value', { ascending: false });
  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  let opps = data || [];
  if (args.stage_name) opps = opps.filter((o: any) => o.stages?.name?.toLowerCase().includes(args.stage_name.toLowerCase()));
  if (opps.length === 0) return { success: true, message: 'No se encontraron oportunidades.', data: [] };
  const statusEmoji: Record<string, string> = { open: '🔵', won: '✅', lost: '❌' };
  let message = `## 💼 Oportunidades (${opps.length})\n\n`;
  message += opps.map((o: any) => `${statusEmoji[o.status] || '⬜'} **${o.title}** - $${(o.value || 0).toLocaleString()}\n   ${o.stages?.name || 'Sin etapa'}${o.companies?.name ? ` | ${o.companies.name}` : ''}`).join('\n\n');
  return { success: true, message, data: opps };
}

async function searchTimeline(supabase: any, userId: string, args: any) {
  const daysAgo = args.days_ago || 30;
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysAgo);
  let query = supabase.from('timeline_entries').select('*, contacts(first_name, last_name, email), companies(name)').eq('user_id', userId).gte('occurred_at', dateThreshold.toISOString()).order('occurred_at', { ascending: false });
  if (args.entry_type) query = query.eq('entry_type', args.entry_type);
  if (args.contact_email) {
    const { data: contact } = await supabase.from('contacts').select('id').eq('user_id', userId).eq('email', args.contact_email).maybeSingle();
    if (contact) query = query.eq('contact_id', contact.id);
  }
  if (args.company_name) {
    const { data: company } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.company_name}%`).limit(1).maybeSingle();
    if (company) query = query.eq('company_id', company.id);
  }
  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!data?.length) return { success: true, message: 'Sin resultados en timeline.', data: [] };
  let entries = data;
  if (args.search_text) entries = entries.filter((e: any) => e.content?.toLowerCase().includes(args.search_text.toLowerCase()) || e.summary?.toLowerCase().includes(args.search_text.toLowerCase()));
  const typeEmoji: Record<string, string> = { email: '📧', meeting: '🤝', call: '📞', note: '📝', whatsapp: '💬' };
  let message = `## 📜 Timeline (${entries.length})\n\n`;
  message += entries.map((e: any) => `${typeEmoji[e.entry_type] || '📄'} **${e.entry_type}** (${new Date(e.occurred_at).toLocaleDateString('es-ES')})\n${e.summary || e.content?.substring(0, 100) || 'Sin contenido'}`).join('\n\n');
  return { success: true, message, data: entries };
}

async function analyzeDealHealth(supabase: any, userId: string, args: any) {
  let oppQuery = supabase.from('opportunities').select('*, companies(name), stages(name, position)').eq('user_id', userId);
  if (args.opportunity_id) oppQuery = oppQuery.eq('id', args.opportunity_id);
  else if (args.company_name) {
    const { data: company } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.company_name}%`).limit(1).maybeSingle();
    if (company) oppQuery = oppQuery.eq('company_id', company.id);
  }
  const { data: opp } = await oppQuery.limit(1).maybeSingle();
  if (!opp) return { success: false, message: '❌ Oportunidad no encontrada' };
  const { data: activities } = await supabase.from('activities').select('created_at').eq('opportunity_id', opp.id).order('created_at', { ascending: false }).limit(5);
  const daysInPipeline = Math.floor((Date.now() - new Date(opp.created_at).getTime()) / 86400000);
  const lastActivity = activities?.[0]?.created_at ? new Date(activities[0].created_at) : null;
  const daysSinceActivity = lastActivity ? Math.floor((Date.now() - lastActivity.getTime()) / 86400000) : 999;
  let score = 100;
  const warnings: string[] = [];
  if (daysSinceActivity > 14) { score -= 30; warnings.push('⚠️ Sin actividad hace +14 días'); }
  else if (daysSinceActivity > 7) { score -= 15; warnings.push('⚠️ Sin actividad hace +7 días'); }
  if (daysInPipeline > 60) { score -= 20; warnings.push('⚠️ Más de 60 días en pipeline'); }
  const status = score >= 70 ? '🟢 Saludable' : score >= 40 ? '🟡 En riesgo' : '🔴 Crítico';
  let message = `## 🩺 Salud del Deal\n**${opp.title}** - $${(opp.value || 0).toLocaleString()}\n**Score:** ${score}/100 ${status}\n`;
  message += `- Días en pipeline: ${daysInPipeline} | Sin actividad: ${daysSinceActivity} días\n`;
  if (warnings.length) message += `\n${warnings.join('\n')}`;
  return { success: true, message, data: { deal: opp, health: { score, status, daysInPipeline, daysSinceActivity, warnings } } };
}

async function getPipelineSummaryAdvanced(supabase: any, userId: string, args: any) {
  let query = supabase.from('opportunities').select('*, stages(name, position), companies(name)').eq('user_id', userId);
  if (!args.include_closed) query = query.eq('status', 'open');
  const { data: opportunities, error } = await query;
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!opportunities?.length) return { success: true, message: '📊 Pipeline vacío.', data: { total: 0 } };
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
  const { data: entries, error } = await supabase.from('timeline_entries').select('*, contacts(first_name, last_name, email)').eq('user_id', userId).gte('occurred_at', dateThreshold.toISOString()).not('action_items', 'is', null);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  const promises: any[] = [];
  const now = new Date();
  (entries || []).forEach((entry: any) => {
    if (entry.action_items && Array.isArray(entry.action_items)) {
      entry.action_items.forEach((item: any) => {
        const dueDate = item.due_date ? new Date(item.due_date) : null;
        const isOverdue = dueDate && dueDate < now;
        if (args.status === 'overdue' && !isOverdue) return;
        if (args.status === 'pending' && item.status === 'completed') return;
        promises.push({ text: item.text, isOverdue, context: { contact: entry.contacts ? `${entry.contacts.first_name || ''} ${entry.contacts.last_name || ''}`.trim() : null } });
      });
    }
  });
  if (!promises.length) return { success: true, message: `Sin compromisos en los últimos ${daysRange} días.`, data: [] };
  let message = `## 📋 Compromisos (${promises.length})\n\n`;
  message += promises.slice(0, 15).map((p, i) => `${i + 1}. **${p.text}**${p.isOverdue ? ' 🔴 VENCIDO' : ''}${p.context.contact ? ` (con ${p.context.contact})` : ''}`).join('\n');
  return { success: true, message, data: promises };
}

async function getNextBestAction(supabase: any, userId: string, args: any) {
  let entity: any = null, lastInteraction: Date | null = null, entityName = '';
  if (args.entity_type === 'contact') {
    const { data } = await supabase.from('contacts').select('*').eq('user_id', userId).eq('email', args.entity_identifier).single();
    if (data) { entity = data; entityName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email; if (data.last_contacted_at) lastInteraction = new Date(data.last_contacted_at); }
  } else if (args.entity_type === 'company') {
    const { data } = await supabase.from('companies').select('*').eq('user_id', userId).ilike('name', `%${args.entity_identifier}%`).limit(1).single();
    if (data) { entity = data; entityName = data.name; }
  } else if (args.entity_type === 'opportunity') {
    const { data } = await supabase.from('opportunities').select('*, stages(name)').eq('user_id', userId).or(`id.eq.${args.entity_identifier},title.ilike.%${args.entity_identifier}%`).limit(1).single();
    if (data) { entity = data; entityName = data.title; }
  }
  if (!entity) return { success: false, message: `❌ No se encontró "${args.entity_identifier}"` };
  const daysSince = lastInteraction ? Math.floor((Date.now() - lastInteraction.getTime()) / 86400000) : 999;
  let action: string, reason: string, priority: string;
  if (daysSince > 30) { action = '🔄 Reactivar relación'; reason = `${daysSince} días sin contacto`; priority = '🔴 Alta'; }
  else if (daysSince > 14) { action = '📞 Hacer seguimiento'; reason = `${daysSince} días desde último contacto`; priority = '🟡 Media'; }
  else { action = '💡 Continuar nutriendo'; reason = 'Mantén comunicación regular'; priority = '🟢 Baja'; }
  return { success: true, message: `## 🎯 Siguiente Mejor Acción\n**${entityName}** | Último contacto: ${lastInteraction?.toLocaleDateString('es-ES') || 'Nunca'}\n\n**${action}** (${priority})\n_${reason}_` };
}

// ===== TEAM TOOLS =====
async function getTeamSummary(supabase: any, userId: string) {
  const { data: currentMember } = await supabase.from('team_members').select('*, organizations(*)').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: teamMembers } = await supabase.from('team_members').select('*').eq('organization_id', currentMember.organization_id).eq('is_active', true);
  const org = currentMember.organizations;
  const roleLabels: Record<string, string> = { admin: 'Admin', manager: 'Manager', sales_rep: 'Rep. Ventas', viewer: 'Visor' };
  let message = `## 👥 Equipo: ${org?.name || 'N/A'}\n**Plan:** ${org?.plan} | **Miembros:** ${teamMembers?.length || 0}/${org?.max_users}\n\n`;
  message += (teamMembers || []).map((m: any) => `• **${m.full_name || m.email}** (${roleLabels[m.role] || m.role})${m.user_id === userId ? ' ← **Tú**' : ''}`).join('\n');
  return { success: true, message, data: { organization: org, members: teamMembers } };
}

async function getMemberInfo(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: members } = await supabase.from('team_members').select('*').eq('organization_id', currentMember.organization_id).eq('is_active', true);
  const id = args.member_identifier.toLowerCase();
  const member = members?.find((m: any) => m.email.toLowerCase().includes(id) || (m.full_name && m.full_name.toLowerCase().includes(id)));
  if (!member) return { success: false, message: `❌ No se encontró "${args.member_identifier}"` };
  const [c, co, o] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id),
    supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('assigned_to', member.user_id).eq('status', 'open'),
  ]);
  let message = `## 👤 ${member.full_name || member.email}\n**Cuota:** $${(member.quota_monthly || 0).toLocaleString()} | **Cerrado:** $${(member.deals_closed_value || 0).toLocaleString()}\n`;
  message += `**Asignaciones:** ${c.count || 0} contactos, ${co.count || 0} empresas, ${o.count || 0} opps`;
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
    return `${p >= 100 ? '🏆' : p >= 50 ? '🟡' : '🔴'} **${m.full_name || m.email}** ${bar} ${p}%`;
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
  if (entityType === 'contacts') { const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('email', args.contact_email).maybeSingle(); entity = data; entityName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : ''; }
  else if (entityType === 'companies') { const { data } = await supabase.from('companies').select('id, name').ilike('name', `%${args.company_name}%`).limit(1).maybeSingle(); entity = data; entityName = data?.name || ''; }
  else { const { data } = await supabase.from('opportunities').select('id, title').ilike('title', `%${args.opportunity_title}%`).limit(1).maybeSingle(); entity = data; entityName = data?.title || ''; }
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
  if (results.opportunities?.length) message += `### 💰 Opps (${results.opportunities.length})\n${results.opportunities.map((o: any) => `- ${o.title} - $${(o.value || 0).toLocaleString()}`).join('\n')}`;
  const total = (results.contacts?.length || 0) + (results.companies?.length || 0) + (results.opportunities?.length || 0);
  if (total === 0) message = `## 📋 ${targetName}: sin asignaciones`;
  return { success: true, message, data: results };
}

async function addTeamComment(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, role, full_name, avatar_url').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  if (currentMember.role === 'viewer') return { success: false, message: '❌ Sin permisos' };
  let entity: any = null, entityName = '';
  if (args.entity_type === 'contacts') { const { data } = await supabase.from('contacts').select('id, first_name, last_name').eq('email', args.entity_identifier).maybeSingle(); entity = data; entityName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : ''; }
  else if (args.entity_type === 'companies') { const { data } = await supabase.from('companies').select('id, name').ilike('name', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.name || ''; }
  else { const { data } = await supabase.from('opportunities').select('id, title').ilike('title', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.title || ''; }
  if (!entity) return { success: false, message: `❌ Entidad no encontrada` };
  const { error } = await supabase.from('comments').insert({ organization_id: currentMember.organization_id, user_id: userId, user_name: currentMember.full_name, user_avatar: currentMember.avatar_url, entity_type: args.entity_type, entity_id: entity.id, content: args.content, mentions: [] });
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Comentario agregado a "${entityName}"` };
}

async function getEntityComments(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  let entity: any = null, entityName = '';
  if (args.entity_type === 'contacts') { const { data } = await supabase.from('contacts').select('id, first_name, last_name').eq('email', args.entity_identifier).maybeSingle(); entity = data; entityName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : ''; }
  else if (args.entity_type === 'companies') { const { data } = await supabase.from('companies').select('id, name').ilike('name', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.name || ''; }
  else { const { data } = await supabase.from('opportunities').select('id, title').ilike('title', `%${args.entity_identifier}%`).limit(1).maybeSingle(); entity = data; entityName = data?.title || ''; }
  if (!entity) return { success: false, message: `❌ Entidad no encontrada` };
  const { data: comments } = await supabase.from('comments').select('*').eq('entity_type', args.entity_type).eq('entity_id', entity.id).order('created_at', { ascending: false }).limit(args.limit || 10);
  if (!comments?.length) return { success: true, message: `Sin comentarios para "${entityName}"`, data: [] };
  let message = `## 💬 Comentarios de "${entityName}"\n\n`;
  message += comments.map((c: any) => `**${c.user_name || 'Usuario'}** (${new Date(c.created_at).toLocaleDateString('es-ES')}):\n${c.content}`).join('\n\n---\n\n');
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

// ===== PROJECT TOOLS =====
async function listProjects(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  let query = supabase.from('projects').select('id, name, code, type, status, description, budget, revenue_target').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (args.status) query = query.eq('status', args.status);
  if (args.type) query = query.eq('type', args.type);
  const { data: projects, error } = await query.limit(args.limit || 20);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!projects?.length) return { success: true, message: 'No hay proyectos.', data: [] };
  let message = `## 📁 Proyectos (${projects.length})\n\n`;
  message += projects.map((p: any) => `${p.status === 'active' ? '🟢' : '🟡'} **${p.name}**${p.code ? ` (${p.code})` : ''} - ${p.type}${p.budget ? ` | $${p.budget.toLocaleString()}` : ''}`).join('\n');
  return { success: true, message, data: projects };
}

async function createProject(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, role').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  if (!['admin', 'manager'].includes(currentMember.role)) return { success: false, message: '❌ Sin permisos' };
  const { data: project, error } = await supabase.from('projects').insert({ organization_id: currentMember.organization_id, name: args.name, code: args.code || null, description: args.description || null, type: args.type || 'project', status: 'active', budget: args.budget || null, revenue_target: args.revenue_target || null, city: args.city || null, country: args.country || null, color: args.color || '#3B82F6', created_by: userId }).select().single();
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Proyecto creado: **${args.name}**`, data: project };
}

async function getProjectStats(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  let pq = supabase.from('projects').select('id, name, code, budget, revenue_target').eq('organization_id', orgId);
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
  let message = `## 📊 ${project.name}\n| Métrica | Valor |\n|---|---|\n`;
  message += `| Contactos | ${contactsCount || 0} |\n| Empresas | ${companiesCount || 0} |\n| Pipeline | $${pipeline.toLocaleString()} |\n| Ganados | $${won.toLocaleString()} |`;
  return { success: true, message };
}

async function addContactToProject(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: contact } = await supabase.from('contacts').select('id').eq('email', args.contact_email).maybeSingle();
  if (!contact) return { success: false, message: `❌ Contacto no encontrado` };
  const { data: project } = await supabase.from('projects').select('id, name').eq('organization_id', orgId).ilike('name', `%${args.project_name}%`).limit(1).maybeSingle();
  if (!project) return { success: false, message: `❌ Proyecto no encontrado` };
  const { data: existing } = await supabase.from('contact_projects').select('id').eq('contact_id', contact.id).eq('project_id', project.id).maybeSingle();
  if (existing) return { success: false, message: `⚠️ Ya está en el proyecto` };
  const { error } = await supabase.from('contact_projects').insert({ contact_id: contact.id, project_id: project.id, status: args.status || 'lead', interest_level: args.interest_level || null, notes: args.notes || null, added_by: userId });
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Contacto agregado al proyecto **${project.name}**` };
}

async function getProjectContacts(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: project } = await supabase.from('projects').select('id, name').eq('organization_id', orgId).ilike('name', `%${args.project_name}%`).limit(1).maybeSingle();
  if (!project) return { success: false, message: `❌ Proyecto no encontrado` };
  let query = supabase.from('contact_projects').select('status, interest_level, contacts:contact_id (first_name, last_name, email)').eq('project_id', project.id).order('created_at', { ascending: false });
  if (args.status) query = query.eq('status', args.status);
  const { data } = await query.limit(args.limit || 20);
  if (!data?.length) return { success: true, message: `Sin contactos en "${project.name}"`, data: [] };
  let message = `## 👥 Contactos de "${project.name}" (${data.length})\n\n`;
  message += data.map((cp: any) => { const c = cp.contacts; return `**${c?.first_name || ''} ${c?.last_name || ''}** (${c?.email})${cp.interest_level ? ` ⭐${cp.interest_level}` : ''}`; }).join('\n');
  return { success: true, message, data };
}

async function searchProjects(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: projects } = await supabase.from('projects').select('id, name, code, type, status').eq('organization_id', orgId).or(`name.ilike.%${args.query}%,code.ilike.%${args.query}%`).limit(args.limit || 10);
  if (!projects?.length) return { success: true, message: `Sin resultados para "${args.query}"`, data: [] };
  let message = `## 🔍 Proyectos (${projects.length})\n\n`;
  message += projects.map((p: any) => `- **${p.name}**${p.code ? ` (${p.code})` : ''}`).join('\n');
  return { success: true, message, data: projects };
}

// ===== CONVERSATION TOOLS =====
async function listConversations(supabase: any, userId: string, args: any) {
  let query = supabase.from('conversations').select('id, channel, status, external_name, external_phone, last_message_at, last_message_preview, unread_count').eq('user_id', userId).order('last_message_at', { ascending: false });
  if (args.channel) query = query.eq('channel', args.channel);
  query = query.eq('status', args.status || 'open');
  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  const convs = data || [];
  if (convs.length === 0) return { success: true, message: 'No hay conversaciones activas.', data: [] };
  const channelEmoji: Record<string, string> = { whatsapp: '💬', instagram: '📸', webchat: '🌐', email: '📧' };
  let message = `## 💬 Conversaciones (${convs.length})\n\n`;
  message += convs.map((c: any) => `${channelEmoji[c.channel] || '💬'} **${c.external_name || 'Desconocido'}**${c.unread_count > 0 ? ` 🔴 ${c.unread_count}` : ''} ${c.last_message_at ? getTimeAgo(new Date(c.last_message_at)) : ''}`).join('\n');
  return { success: true, message, data: convs };
}

async function getConversationSummary(supabase: any, userId: string, args: any) {
  const { data: convs } = await supabase.from('conversations').select('id, channel, external_name, status, unread_count').eq('user_id', userId).ilike('external_name', `%${args.contact_name}%`).limit(1);
  if (!convs?.length) return { success: false, message: `❌ No se encontró conversación con "${args.contact_name}"` };
  const conv = convs[0];
  const { data: messages } = await supabase.from('conversation_messages').select('content, is_from_contact, sender_name, created_at').eq('conversation_id', conv.id).order('created_at', { ascending: false }).limit(args.limit || 10);
  if (!messages?.length) return { success: true, message: `Sin mensajes con "${args.contact_name}"`, data: [] };
  let message = `## 💬 ${conv.external_name || args.contact_name}\nCanal: ${conv.channel} | Sin leer: ${conv.unread_count}\n\n`;
  message += messages.reverse().map((m: any) => `**${m.is_from_contact ? conv.external_name : 'Tú'}** (${new Date(m.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}):\n${m.content || '[sin contenido]'}`).join('\n\n');
  return { success: true, message, data: messages };
}

// ===== INTELLIGENCE TOOLS =====
async function smartSearch(supabase: any, userId: string, args: any) {
  const q = args.query;
  const types = args.entity_types || ['contacts', 'companies', 'opportunities', 'tasks'];
  const results: any = {};
  if (types.includes('contacts')) { const { data } = await supabase.from('contacts').select('id, first_name, last_name, email').eq('user_id', userId).or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`).limit(5); results.contacts = data || []; }
  if (types.includes('companies')) { const { data } = await supabase.from('companies').select('id, name, industry').eq('user_id', userId).or(`name.ilike.%${q}%,domain.ilike.%${q}%`).limit(5); results.companies = data || []; }
  if (types.includes('opportunities')) { const { data } = await supabase.from('opportunities').select('id, title, value, status').eq('user_id', userId).ilike('title', `%${q}%`).limit(5); results.opportunities = data || []; }
  if (types.includes('tasks')) { const { data } = await supabase.from('activities').select('id, title, type, priority, completed').eq('user_id', userId).ilike('title', `%${q}%`).limit(5); results.tasks = data || []; }
  let message = `## 🔍 Resultados para "${q}"\n\n`;
  let total = 0;
  if (results.contacts?.length) { message += `### 📇 Contactos\n${results.contacts.map((c: any) => `- ${c.first_name || ''} ${c.last_name || ''} (${c.email})`).join('\n')}\n\n`; total += results.contacts.length; }
  if (results.companies?.length) { message += `### 🏢 Empresas\n${results.companies.map((c: any) => `- ${c.name}`).join('\n')}\n\n`; total += results.companies.length; }
  if (results.opportunities?.length) { message += `### 💼 Oportunidades\n${results.opportunities.map((o: any) => `- ${o.title} - $${(o.value || 0).toLocaleString()}`).join('\n')}\n\n`; total += results.opportunities.length; }
  if (results.tasks?.length) { message += `### 📋 Tareas\n${results.tasks.map((t: any) => `- ${t.completed ? '✅' : '⬜'} ${t.title}`).join('\n')}\n\n`; total += results.tasks.length; }
  if (total === 0) message = `Sin resultados para "${q}"`;
  return { success: true, message, data: results };
}

async function generateCRMReport(supabase: any, userId: string, args: any) {
  const days = args.period_days || 30;
  const dateThreshold = new Date(); dateThreshold.setDate(dateThreshold.getDate() - days);
  const [{ data: contacts }, { data: opps }, { data: tasks }] = await Promise.all([
    supabase.from('contacts').select('id, created_at').eq('user_id', userId).gte('created_at', dateThreshold.toISOString()),
    supabase.from('opportunities').select('id, value, status, created_at').eq('user_id', userId),
    supabase.from('activities').select('id, completed, type').eq('user_id', userId).gte('created_at', dateThreshold.toISOString()),
  ]);
  const newContacts = contacts?.length || 0;
  const openOpps = opps?.filter((o: any) => o.status === 'open') || [];
  const wonOpps = opps?.filter((o: any) => o.status === 'won') || [];
  const pipelineValue = openOpps.reduce((s: number, o: any) => s + (o.value || 0), 0);
  const wonValue = wonOpps.reduce((s: number, o: any) => s + (o.value || 0), 0);
  const completedTasks = tasks?.filter((t: any) => t.completed).length || 0;
  let message = `## 📊 Reporte CRM (${days} días)\n\n`;
  message += `| Métrica | Valor |\n|---|---|\n`;
  message += `| Nuevos contactos | ${newContacts} |\n| Pipeline abierto | $${pipelineValue.toLocaleString()} |\n| Deals ganados | ${wonOpps.length} ($${wonValue.toLocaleString()}) |\n| Tareas completadas | ${completedTasks}/${tasks?.length || 0} |`;
  return { success: true, message };
}

// ===================================================================
// ===== NEW PHASE 1: CALENDAR TOOLS =====
// ===================================================================

async function createCalendarEvent(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data, error } = await supabase.from('calendar_events').insert({
    user_id: userId, organization_id: orgId, title: args.title, description: args.description || null,
    event_type: args.event_type || 'meeting', start_time: args.start_time, end_time: args.end_time,
    all_day: args.all_day || false, location: args.location || null, meeting_url: args.meeting_url || null,
    contact_id: args.contact_id || null, company_id: args.company_id || null, opportunity_id: args.opportunity_id || null,
    color: args.color || '#3B82F6',
  }).select().single();
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Evento creado: **${args.title}** (${new Date(args.start_time).toLocaleString('es-ES')})`, data };
}

async function listCalendarEvents(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const startDate = new Date(args.start_date).toISOString();
  const endDate = new Date(args.end_date + 'T23:59:59').toISOString();
  const { data, error } = await supabase.rpc('get_calendar_items', { p_start_date: startDate, p_end_date: endDate, p_org_id: orgId });
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  const items = data || [];
  const filtered = args.event_type ? items.filter((i: any) => i.item_type === 'event' && i.metadata?.event_type === args.event_type) : items;
  if (!filtered.length) return { success: true, message: `Sin eventos del ${args.start_date} al ${args.end_date}`, data: [] };
  const typeEmoji: Record<string, string> = { event: '📅', task: '📋', goal: '🎯' };
  let message = `## 📅 Calendario (${filtered.length} items)\n\n`;
  message += filtered.map((i: any) => {
    const time = i.all_day ? 'Todo el día' : new Date(i.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${typeEmoji[i.item_type] || '📄'} **${i.title}** - ${time}`;
  }).join('\n');
  return { success: true, message, data: filtered };
}

async function getTodayAgenda(supabase: any, userId: string) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const { data, error } = await supabase.rpc('get_calendar_items', { p_start_date: startOfDay, p_end_date: endOfDay, p_org_id: orgId });
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  const items = (data || []).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  if (!items.length) return { success: true, message: '📅 No tienes eventos programados para hoy.', data: [] };
  const typeEmoji: Record<string, string> = { event: '📅', task: '📋', goal: '🎯' };
  let message = `## 📅 Agenda de Hoy (${items.length} items)\n\n`;
  message += items.map((i: any) => {
    const time = i.all_day ? '🕐 Todo el día' : `🕐 ${new Date(i.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    return `${typeEmoji[i.item_type] || '📄'} ${time} - **${i.title}**`;
  }).join('\n');
  return { success: true, message, data: items };
}

async function updateCalendarEvent(supabase: any, userId: string, args: any) {
  const updates: any = { updated_at: new Date().toISOString() };
  if (args.title) updates.title = args.title;
  if (args.start_time) updates.start_time = args.start_time;
  if (args.end_time) updates.end_time = args.end_time;
  if (args.location !== undefined) updates.location = args.location;
  if (args.description !== undefined) updates.description = args.description;
  if (args.meeting_url !== undefined) updates.meeting_url = args.meeting_url;
  const { error } = await supabase.from('calendar_events').update(updates).eq('id', args.event_id).eq('user_id', userId);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Evento actualizado` };
}

async function deleteCalendarEvent(supabase: any, userId: string, args: any) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', args.event_id).eq('user_id', userId);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `🗑️ Evento eliminado` };
}

async function findAvailableSlots(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const daysAhead = args.days_ahead || 7;
  const duration = args.duration_minutes || 60;
  const now = new Date();
  const endSearch = new Date(now.getTime() + daysAhead * 86400000);
  const { data: events } = await supabase.from('calendar_events').select('start_time, end_time').eq('user_id', userId).gte('start_time', now.toISOString()).lte('start_time', endSearch.toISOString()).order('start_time');
  const slots: Array<{ date: string; start: string; end: string }> = [];
  const workStart = 9, workEnd = 18;
  for (let d = 0; d < daysAhead && slots.length < 10; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d + (d === 0 ? 1 : 0));
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    if (args.date && day.toISOString().split('T')[0] !== args.date) continue;
    const dayEvents = (events || []).filter((e: any) => new Date(e.start_time).toDateString() === day.toDateString());
    for (let hour = workStart; hour <= workEnd - (duration / 60); hour++) {
      const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      const hasConflict = dayEvents.some((e: any) => new Date(e.start_time) < slotEnd && new Date(e.end_time) > slotStart);
      if (!hasConflict) {
        slots.push({
          date: day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
          start: slotStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          end: slotEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }
  }
  if (!slots.length) return { success: true, message: `No hay huecos disponibles de ${duration} min en los próximos ${daysAhead} días`, data: [] };
  let message = `## 📅 Huecos Disponibles (${duration} min)\n\n`;
  message += slots.slice(0, 8).map((s, i) => `${i + 1}. **${s.date}** ${s.start} - ${s.end}`).join('\n');
  return { success: true, message, data: slots };
}

async function createGoal(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data, error } = await supabase.from('calendar_goals').insert({
    user_id: userId, organization_id: orgId, title: args.title, goal_type: args.goal_type || 'revenue',
    target_value: args.target_value, start_date: args.start_date, end_date: args.end_date,
    color: args.color || '#10B981',
  }).select().single();
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Meta creada: **${args.title}** (objetivo: ${args.target_value})`, data };
}

async function updateGoalProgress(supabase: any, userId: string, args: any) {
  const { error } = await supabase.from('calendar_goals').update({ current_value: args.current_value, updated_at: new Date().toISOString() }).eq('id', args.goal_id).eq('user_id', userId);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Progreso actualizado a ${args.current_value}` };
}

async function listGoals(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const now = new Date().toISOString().split('T')[0];
  let query = supabase.from('calendar_goals').select('*').eq('organization_id', orgId).order('end_date');
  if (args.status === 'active') query = query.gte('end_date', now);
  else if (args.status === 'completed') query = query.lt('end_date', now);
  const { data: goals, error } = await query.limit(20);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!goals?.length) return { success: true, message: 'Sin metas.', data: [] };
  let message = `## 🎯 Metas (${goals.length})\n\n`;
  message += goals.map((g: any) => {
    const progress = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0;
    const bar = '█'.repeat(Math.min(10, Math.round(progress / 10))) + '░'.repeat(10 - Math.min(10, Math.round(progress / 10)));
    return `${progress >= 100 ? '🏆' : '🎯'} **${g.title}** ${bar} ${progress}%\n   ${g.current_value}/${g.target_value} | Vence: ${new Date(g.end_date).toLocaleDateString('es-ES')}`;
  }).join('\n\n');
  return { success: true, message, data: goals };
}

async function rescheduleEvent(supabase: any, userId: string, args: any) {
  const updates: any = { start_time: args.new_start_time, updated_at: new Date().toISOString() };
  if (args.new_end_time) updates.end_time = args.new_end_time;
  else {
    const { data: event } = await supabase.from('calendar_events').select('start_time, end_time').eq('id', args.event_id).single();
    if (event) {
      const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
      updates.end_time = new Date(new Date(args.new_start_time).getTime() + duration).toISOString();
    }
  }
  const { error } = await supabase.from('calendar_events').update(updates).eq('id', args.event_id).eq('user_id', userId);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Evento reprogramado a ${new Date(args.new_start_time).toLocaleString('es-ES')}` };
}

async function getWeekSummary(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const offset = args.week_offset || 0;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + (offset * 7));
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const { data } = await supabase.rpc('get_calendar_items', { p_start_date: weekStart.toISOString(), p_end_date: weekEnd.toISOString(), p_org_id: orgId });
  const items = data || [];
  const events = items.filter((i: any) => i.item_type === 'event');
  const tasks = items.filter((i: any) => i.item_type === 'task');
  const goals = items.filter((i: any) => i.item_type === 'goal');
  const weekLabel = offset === 0 ? 'Esta semana' : offset === 1 ? 'Próxima semana' : offset === -1 ? 'Semana pasada' : `Semana ${offset > 0 ? '+' : ''}${offset}`;
  let message = `## 📅 ${weekLabel}\n${weekStart.toLocaleDateString('es-ES')} - ${weekEnd.toLocaleDateString('es-ES')}\n\n`;
  message += `📅 **${events.length}** eventos | 📋 **${tasks.length}** tareas | 🎯 **${goals.length}** metas\n\n`;
  if (events.length) {
    message += `### Eventos:\n${events.map((e: any) => `- ${new Date(e.start_time).toLocaleDateString('es-ES', { weekday: 'short' })} ${e.all_day ? '' : new Date(e.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} **${e.title}**`).join('\n')}\n\n`;
  }
  if (tasks.length) message += `### Tareas:\n${tasks.map((t: any) => `- ${t.metadata?.completed ? '✅' : '⬜'} ${t.title}`).join('\n')}`;
  return { success: true, message, data: { events, tasks, goals } };
}

async function blockTime(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const startTime = new Date(`${args.date}T${args.start_time}:00`).toISOString();
  const endTime = new Date(new Date(startTime).getTime() + args.duration_hours * 3600000).toISOString();
  const { data, error } = await supabase.from('calendar_events').insert({
    user_id: userId, organization_id: orgId, title: `🔒 ${args.title}`, event_type: 'other',
    start_time: startTime, end_time: endTime, color: '#6B7280',
  }).select().single();
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Tiempo bloqueado: **${args.title}** (${args.date} ${args.start_time} - ${args.duration_hours}h)`, data };
}

// ===================================================================
// ===== NEW PHASE 2: SMART ACTIONS =====
// ===================================================================

async function prioritizeMyDay(supabase: any, userId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const [{ data: todayTasks }, { data: overdueT }, { data: todayEvents }, { data: stalledDeals }] = await Promise.all([
    supabase.from('activities').select('id, title, priority, type, due_date').eq('user_id', userId).eq('completed', false).gte('due_date', startOfDay).lt('due_date', endOfDay),
    supabase.from('activities').select('id, title, priority, type, due_date').eq('user_id', userId).eq('completed', false).lt('due_date', startOfDay).not('due_date', 'is', null).limit(5),
    supabase.from('calendar_events').select('id, title, start_time, event_type').eq('user_id', userId).gte('start_time', startOfDay).lt('start_time', endOfDay).order('start_time'),
    supabase.from('opportunities').select('id, title, value, updated_at').eq('user_id', userId).eq('status', 'open').order('updated_at', { ascending: true }).limit(3),
  ]);
  let message = `## 🎯 Tu Día Priorizado\n\n`;
  if (overdueT?.length) {
    message += `### 🔴 URGENTE (vencidas)\n${overdueT.map((t: any) => `- **${t.title}** (vencida ${new Date(t.due_date).toLocaleDateString('es-ES')})`).join('\n')}\n\n`;
  }
  if (todayEvents?.length) {
    message += `### 📅 Reuniones Hoy\n${todayEvents.map((e: any) => `- ${new Date(e.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} **${e.title}**`).join('\n')}\n\n`;
  }
  if (todayTasks?.length) {
    const sorted = todayTasks.sort((a: any, b: any) => { const p: Record<string, number> = { high: 0, medium: 1, low: 2 }; return (p[a.priority] || 1) - (p[b.priority] || 1); });
    message += `### 📋 Tareas de Hoy\n${sorted.map((t: any) => `- ${t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'} **${t.title}**`).join('\n')}\n\n`;
  }
  if (stalledDeals?.length) {
    const stalled = stalledDeals.filter((d: any) => (Date.now() - new Date(d.updated_at).getTime()) > 7 * 86400000);
    if (stalled.length) message += `### ⚠️ Deals sin actividad\n${stalled.map((d: any) => `- **${d.title}** ($${(d.value || 0).toLocaleString()}) - sin actividad ${Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000)} días`).join('\n')}`;
  }
  if (!overdueT?.length && !todayEvents?.length && !todayTasks?.length) message += '¡Tu día está libre! 🎉';
  return { success: true, message };
}

async function suggestFollowUps(supabase: any, userId: string, args: any) {
  const daysThreshold = args.urgency === 'high' ? 7 : args.urgency === 'medium' ? 14 : 30;
  const threshold = new Date(); threshold.setDate(threshold.getDate() - daysThreshold);
  const { data: contacts } = await supabase.from('contacts').select('id, first_name, last_name, email, last_contacted_at').eq('user_id', userId).lt('last_contacted_at', threshold.toISOString()).not('last_contacted_at', 'is', null).order('last_contacted_at', { ascending: true }).limit(10);
  const { data: deals } = await supabase.from('opportunities').select('id, title, value, updated_at, companies(name)').eq('user_id', userId).eq('status', 'open').lt('updated_at', threshold.toISOString()).order('updated_at', { ascending: true }).limit(5);
  let message = `## 🔄 Seguimientos Sugeridos\n\n`;
  if (deals?.length) {
    message += `### 💼 Deals sin actividad (+${daysThreshold} días)\n`;
    message += deals.map((d: any) => `- 🔴 **${d.title}** ($${(d.value || 0).toLocaleString()}) - ${Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000)} días sin actividad`).join('\n') + '\n\n';
  }
  if (contacts?.length) {
    message += `### 📇 Contactos sin contactar\n`;
    message += contacts.map((c: any) => `- **${c.first_name || ''} ${c.last_name || ''}** (${c.email}) - último contacto ${new Date(c.last_contacted_at).toLocaleDateString('es-ES')}`).join('\n');
  }
  if (!deals?.length && !contacts?.length) message += 'No hay seguimientos urgentes. ¡Todo al día! ✅';
  return { success: true, message, data: { deals, contacts } };
}

async function predictDealCloseProbability(supabase: any, userId: string, args: any) {
  let query = supabase.from('opportunities').select('*, stages(name, position, probability), companies(name)').eq('user_id', userId);
  if (args.deal_id) query = query.eq('id', args.deal_id);
  else if (args.deal_title) query = query.ilike('title', `%${args.deal_title}%`);
  const { data: deal } = await query.limit(1).maybeSingle();
  if (!deal) return { success: false, message: '❌ Deal no encontrado' };
  const { data: activities } = await supabase.from('activities').select('id, type, created_at').eq('opportunity_id', deal.id).order('created_at', { ascending: false }).limit(10);
  const daysInPipeline = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000);
  const activityCount = activities?.length || 0;
  const daysSinceActivity = activities?.[0] ? Math.floor((Date.now() - new Date(activities[0].created_at).getTime()) / 86400000) : 999;
  let score = deal.stages?.probability || deal.probability || 50;
  if (activityCount > 5) score += 10;
  if (daysSinceActivity < 3) score += 10;
  else if (daysSinceActivity > 14) score -= 20;
  if (daysInPipeline > 90) score -= 15;
  if (deal.value > 50000) score -= 5;
  score = Math.max(5, Math.min(95, score));
  const confidence = score >= 70 ? '🟢 Alta' : score >= 40 ? '🟡 Media' : '🔴 Baja';
  let message = `## 📊 Predicción de Cierre\n**${deal.title}** - $${(deal.value || 0).toLocaleString()}\n\n`;
  message += `**Probabilidad:** ${score}% ${confidence}\n`;
  message += `**Factores:**\n`;
  message += `- Días en pipeline: ${daysInPipeline}\n- Actividades: ${activityCount}\n- Sin actividad: ${daysSinceActivity} días\n- Etapa: ${deal.stages?.name || 'N/A'}`;
  return { success: true, message, data: { deal_id: deal.id, probability: score, factors: { daysInPipeline, activityCount, daysSinceActivity } } };
}

async function suggestUpsellOpportunities(supabase: any, userId: string, args: any) {
  const { data: wonDeals } = await supabase.from('opportunities').select('*, contacts(first_name, last_name, email), companies(name)').eq('user_id', userId).eq('status', 'won').order('closed_at', { ascending: false }).limit(args.limit || 5);
  if (!wonDeals?.length) return { success: true, message: 'Sin clientes ganados para sugerir upsell.', data: [] };
  let message = `## 💡 Oportunidades de Upsell\n\n`;
  message += wonDeals.map((d: any, i: number) => {
    const contact = d.contacts ? `${d.contacts.first_name || ''} ${d.contacts.last_name || ''}`.trim() : '';
    return `${i + 1}. **${d.companies?.name || contact || 'Cliente'}** - Deal ganado: $${(d.value || 0).toLocaleString()}\n   💡 Potencial upsell basado en historial de compra`;
  }).join('\n\n');
  return { success: true, message, data: wonDeals };
}

async function analyzeContactEngagement(supabase: any, userId: string, args: any) {
  let contactQuery = supabase.from('contacts').select('*').eq('user_id', userId);
  if (args.contact_id) contactQuery = contactQuery.eq('id', args.contact_id);
  else if (args.contact_email) contactQuery = contactQuery.eq('email', args.contact_email);
  const { data: contact } = await contactQuery.limit(1).maybeSingle();
  if (!contact) return { success: false, message: '❌ Contacto no encontrado' };
  const { data: activities } = await supabase.from('activities').select('id, type, created_at').eq('contact_id', contact.id).order('created_at', { ascending: false }).limit(20);
  const { data: convMessages } = await supabase.from('conversations').select('id, last_message_at, unread_count, channel').ilike('external_email', contact.email || '').limit(5);
  const actCount = activities?.length || 0;
  const lastContact = contact.last_contacted_at ? new Date(contact.last_contacted_at) : null;
  const daysSince = lastContact ? Math.floor((Date.now() - lastContact.getTime()) / 86400000) : 999;
  let engagementLevel = 'Bajo';
  let emoji = '🔴';
  if (actCount > 10 && daysSince < 7) { engagementLevel = 'Alto'; emoji = '🟢'; }
  else if (actCount > 3 && daysSince < 30) { engagementLevel = 'Medio'; emoji = '🟡'; }
  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;
  let message = `## 📊 Engagement: ${name}\n\n`;
  message += `${emoji} **Nivel:** ${engagementLevel}\n`;
  message += `- Actividades registradas: ${actCount}\n- Último contacto: ${lastContact ? `${daysSince} días (${lastContact.toLocaleDateString('es-ES')})` : 'Nunca'}\n`;
  message += `- Conversaciones activas: ${convMessages?.length || 0}`;
  return { success: true, message, data: { contact, engagement: engagementLevel, actCount, daysSince } };
}

async function smartMeetingScheduler(supabase: any, userId: string, args: any) {
  const duration = args.duration_minutes || 60;
  const daysAhead = args.days_ahead || 5;
  const preferred = args.preferred_time || 'any';
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const now = new Date();
  const endSearch = new Date(now.getTime() + daysAhead * 86400000);
  const { data: events } = await supabase.from('calendar_events').select('start_time, end_time').eq('user_id', userId).gte('start_time', now.toISOString()).lte('start_time', endSearch.toISOString()).order('start_time');
  const slots: Array<{ date: string; time: string; iso: string }> = [];
  const workStartMorning = 9, workEndMorning = 12, workStartAfternoon = 14, workEndAfternoon = 18;
  for (let d = 1; d <= daysAhead && slots.length < 5; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const dayEvents = (events || []).filter((e: any) => new Date(e.start_time).toDateString() === day.toDateString());
    const ranges = preferred === 'morning' ? [[workStartMorning, workEndMorning]] : preferred === 'afternoon' ? [[workStartAfternoon, workEndAfternoon]] : [[workStartMorning, workEndMorning], [workStartAfternoon, workEndAfternoon]];
    for (const [rStart, rEnd] of ranges) {
      for (let hour = rStart; hour <= rEnd - (duration / 60); hour++) {
        const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        const hasConflict = dayEvents.some((e: any) => new Date(e.start_time) < slotEnd && new Date(e.end_time) > slotStart);
        if (!hasConflict && slots.length < 5) {
          slots.push({ date: day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }), time: `${slotStart.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${slotEnd.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, iso: slotStart.toISOString() });
        }
      }
    }
  }
  if (!slots.length) return { success: true, message: `Sin huecos disponibles de ${duration} min`, data: [] };
  let message = `## 📅 Mejores horarios (${duration} min)\n\n`;
  message += slots.map((s, i) => `${i + 1}. **${s.date}** ${s.time}`).join('\n');
  message += `\n\n💡 Basado en tu disponibilidad${preferred !== 'any' ? ` (${preferred === 'morning' ? 'mañana' : 'tarde'})` : ''}.`;
  return { success: true, message, data: slots };
}

async function generateDealSummary(supabase: any, userId: string, args: any) {
  let query = supabase.from('opportunities').select('*, stages(name), companies(name), contacts(first_name, last_name, email)').eq('user_id', userId);
  if (args.deal_id) query = query.eq('id', args.deal_id);
  else if (args.deal_title) query = query.ilike('title', `%${args.deal_title}%`);
  const { data: deal } = await query.limit(1).maybeSingle();
  if (!deal) return { success: false, message: '❌ Deal no encontrado' };
  const { data: activities } = await supabase.from('activities').select('id, title, type, completed, created_at').eq('opportunity_id', deal.id).order('created_at', { ascending: false }).limit(5);
  const daysInPipeline = Math.floor((Date.now() - new Date(deal.created_at).getTime()) / 86400000);
  const pendingTasks = activities?.filter((a: any) => !a.completed).length || 0;
  let message = `## 📋 Resumen: ${deal.title}\n\n`;
  message += `| Campo | Valor |\n|---|---|\n`;
  message += `| Valor | $${(deal.value || 0).toLocaleString()} |\n`;
  message += `| Etapa | ${deal.stages?.name || 'N/A'} |\n`;
  message += `| Empresa | ${deal.companies?.name || 'N/A'} |\n`;
  message += `| Contacto | ${deal.contacts ? `${deal.contacts.first_name || ''} ${deal.contacts.last_name || ''}`.trim() : 'N/A'} |\n`;
  message += `| Días en pipeline | ${daysInPipeline} |\n`;
  message += `| Prob. cierre | ${deal.probability || 50}% |\n`;
  message += `| Tareas pendientes | ${pendingTasks} |\n\n`;
  if (activities?.length) {
    message += `### Actividad Reciente:\n${activities.slice(0, 3).map((a: any) => `- ${a.completed ? '✅' : '⬜'} ${a.title} (${new Date(a.created_at).toLocaleDateString('es-ES')})`).join('\n')}`;
  }
  return { success: true, message, data: deal };
}

// ===================================================================
// ===== NEW PHASE 3: REPORTS & ANALYTICS =====
// ===================================================================

async function getSalesReport(supabase: any, userId: string, args: any) {
  const { start, end } = getPeriodDates(args.period || 'this_month', args.start_date, args.end_date);
  const { data: opps } = await supabase.from('opportunities').select('id, title, value, status, closed_at, created_at').eq('user_id', userId);
  const won = (opps || []).filter((o: any) => o.status === 'won' && o.closed_at && new Date(o.closed_at) >= start && new Date(o.closed_at) < end);
  const lost = (opps || []).filter((o: any) => o.status === 'lost' && o.closed_at && new Date(o.closed_at) >= start && new Date(o.closed_at) < end);
  const created = (opps || []).filter((o: any) => new Date(o.created_at) >= start && new Date(o.created_at) < end);
  const wonValue = won.reduce((s: number, o: any) => s + (o.value || 0), 0);
  const lostValue = lost.reduce((s: number, o: any) => s + (o.value || 0), 0);
  const winRate = (won.length + lost.length) > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  let message = `## 📊 Reporte de Ventas\n${start.toLocaleDateString('es-ES')} - ${end.toLocaleDateString('es-ES')}\n\n`;
  message += `| Métrica | Valor |\n|---|---|\n`;
  message += `| Deals ganados | ${won.length} ($${wonValue.toLocaleString()}) |\n`;
  message += `| Deals perdidos | ${lost.length} ($${lostValue.toLocaleString()}) |\n`;
  message += `| Nuevas opps | ${created.length} |\n`;
  message += `| Win rate | ${winRate}% |`;
  return { success: true, message, data: { won: wonValue, lost: lostValue, winRate, newDeals: created.length } };
}

async function getActivityReport(supabase: any, userId: string, args: any) {
  const { start, end } = getPeriodDates(args.period || 'this_week');
  const { data: activities } = await supabase.from('activities').select('id, type, completed, created_at').eq('user_id', userId).gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
  const acts = activities || [];
  const byType: Record<string, { total: number; completed: number }> = {};
  acts.forEach((a: any) => {
    if (!byType[a.type]) byType[a.type] = { total: 0, completed: 0 };
    byType[a.type].total++;
    if (a.completed) byType[a.type].completed++;
  });
  const typeEmoji: Record<string, string> = { task: '📋', call: '📞', email: '📧', meeting: '🤝', follow_up: '🔄' };
  let message = `## 📊 Reporte de Actividad\n\n**Total:** ${acts.length} | **Completadas:** ${acts.filter((a: any) => a.completed).length}\n\n`;
  message += Object.entries(byType).map(([type, data]) => `${typeEmoji[type] || '📄'} **${type}**: ${data.completed}/${data.total}`).join('\n');
  return { success: true, message, data: byType };
}

async function getConversionFunnel(supabase: any, userId: string, args: any) {
  const { data: opps } = await supabase.from('opportunities').select('id, status, stages(name, position)').eq('user_id', userId);
  if (!opps?.length) return { success: true, message: 'Sin datos de conversión.', data: {} };
  const byStage: Record<string, number> = {};
  (opps || []).forEach((o: any) => { const stage = o.stages?.name || 'Sin etapa'; byStage[stage] = (byStage[stage] || 0) + 1; });
  const total = opps.length;
  let message = `## 📊 Embudo de Conversión\n\n`;
  message += Object.entries(byStage).map(([stage, count]) => {
    const pct = Math.round((count / total) * 100);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    return `**${stage}** ${bar} ${count} (${pct}%)`;
  }).join('\n');
  return { success: true, message, data: byStage };
}

async function getDealForecast(supabase: any, userId: string, args: any) {
  const { start, end } = getPeriodDates(args.period || 'this_month');
  const { data: opps } = await supabase.from('opportunities').select('id, title, value, probability, expected_close_date, stages(name)').eq('user_id', userId).eq('status', 'open');
  const relevant = (opps || []).filter((o: any) => o.expected_close_date && new Date(o.expected_close_date) >= start && new Date(o.expected_close_date) < end);
  const conservative = relevant.reduce((s: number, o: any) => s + ((o.value || 0) * Math.min((o.probability || 50), 50) / 100), 0);
  const probable = relevant.reduce((s: number, o: any) => s + ((o.value || 0) * (o.probability || 50) / 100), 0);
  const optimistic = relevant.reduce((s: number, o: any) => s + (o.value || 0), 0);
  let message = `## 📈 Forecast de Ventas\n\n`;
  message += `| Escenario | Valor |\n|---|---|\n`;
  message += `| Conservador | $${Math.round(conservative).toLocaleString()} |\n`;
  message += `| Probable | $${Math.round(probable).toLocaleString()} |\n`;
  message += `| Optimista | $${Math.round(optimistic).toLocaleString()} |\n\n`;
  message += `Basado en **${relevant.length}** deals con cierre esperado en el período.`;
  if (relevant.length) {
    message += `\n\n### Top deals:\n${relevant.sort((a: any, b: any) => (b.value || 0) - (a.value || 0)).slice(0, 5).map((o: any) => `- **${o.title}** $${(o.value || 0).toLocaleString()} (${o.probability || 50}%)`).join('\n')}`;
  }
  return { success: true, message, data: { conservative, probable, optimistic, dealsCount: relevant.length } };
}

async function comparePerformance(supabase: any, userId: string, args: any) {
  const current = getPeriodDates(args.current_period || 'this_month');
  const compare = getPeriodDates(args.compare_to || 'last_month');
  let currentVal = 0, compareVal = 0;
  if (args.metric === 'revenue' || args.metric === 'deals_closed') {
    const { data: currentOpps } = await supabase.from('opportunities').select('value, status, closed_at').eq('user_id', userId).eq('status', 'won').gte('closed_at', current.start.toISOString()).lt('closed_at', current.end.toISOString());
    const { data: compareOpps } = await supabase.from('opportunities').select('value, status, closed_at').eq('user_id', userId).eq('status', 'won').gte('closed_at', compare.start.toISOString()).lt('closed_at', compare.end.toISOString());
    if (args.metric === 'revenue') {
      currentVal = (currentOpps || []).reduce((s: number, o: any) => s + (o.value || 0), 0);
      compareVal = (compareOpps || []).reduce((s: number, o: any) => s + (o.value || 0), 0);
    } else {
      currentVal = currentOpps?.length || 0;
      compareVal = compareOpps?.length || 0;
    }
  } else {
    const { data: currentActs } = await supabase.from('activities').select('id').eq('user_id', userId).gte('created_at', current.start.toISOString()).lt('created_at', current.end.toISOString());
    const { data: compareActs } = await supabase.from('activities').select('id').eq('user_id', userId).gte('created_at', compare.start.toISOString()).lt('created_at', compare.end.toISOString());
    currentVal = currentActs?.length || 0;
    compareVal = compareActs?.length || 0;
  }
  const change = compareVal > 0 ? Math.round(((currentVal - compareVal) / compareVal) * 100) : 0;
  const trend = change > 0 ? `📈 +${change}%` : change < 0 ? `📉 ${change}%` : '➡️ Sin cambio';
  let message = `## 📊 Comparación: ${args.metric}\n\n`;
  message += `| Período | Valor |\n|---|---|\n`;
  message += `| ${args.current_period} | ${args.metric === 'revenue' ? '$' : ''}${currentVal.toLocaleString()} |\n`;
  message += `| ${args.compare_to} | ${args.metric === 'revenue' ? '$' : ''}${compareVal.toLocaleString()} |\n`;
  message += `| Cambio | ${trend} |`;
  return { success: true, message, data: { current: currentVal, previous: compareVal, change } };
}

async function getTopPerformers(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: members } = await supabase.from('team_members').select('*').eq('organization_id', orgId).eq('is_active', true).order('deals_closed_value', { ascending: false }).limit(args.limit || 5);
  if (!members?.length) return { success: true, message: 'Sin datos de equipo.', data: [] };
  let message = `## 🏆 Top Performers\n\n`;
  message += members.map((m: any, i: number) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} **${m.full_name || m.email}** - $${(m.deals_closed_value || 0).toLocaleString()}`;
  }).join('\n');
  return { success: true, message, data: members };
}

async function getLostDealsAnalysis(supabase: any, userId: string, args: any) {
  const days = args.period_days || 90;
  const threshold = new Date(); threshold.setDate(threshold.getDate() - days);
  const { data: lostDeals } = await supabase.from('opportunities').select('id, title, value, lost_reason, closed_at, stages(name), companies(name)').eq('user_id', userId).eq('status', 'lost').gte('closed_at', threshold.toISOString()).order('closed_at', { ascending: false });
  if (!lostDeals?.length) return { success: true, message: `Sin deals perdidos en los últimos ${days} días. ¡Bien! ✅`, data: [] };
  const totalLost = lostDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);
  const reasons: Record<string, number> = {};
  lostDeals.forEach((d: any) => { const r = d.lost_reason || 'Sin razón'; reasons[r] = (reasons[r] || 0) + 1; });
  let message = `## ❌ Análisis de Deals Perdidos (${days} días)\n\n`;
  message += `**Total:** ${lostDeals.length} deals | **Valor perdido:** $${totalLost.toLocaleString()}\n\n`;
  message += `### Razones:\n${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([r, c]) => `- **${r}**: ${c} deal(s)`).join('\n')}\n\n`;
  message += `### Últimos perdidos:\n${lostDeals.slice(0, 5).map((d: any) => `- **${d.title}** $${(d.value || 0).toLocaleString()}${d.lost_reason ? ` - ${d.lost_reason}` : ''}`).join('\n')}`;
  return { success: true, message, data: lostDeals };
}

async function getResponseTimeStats(supabase: any, userId: string, args: any) {
  const { start } = getPeriodDates(args.period || 'this_week');
  const { data: contacts } = await supabase.from('contacts').select('id, created_at, last_contacted_at').eq('user_id', userId).gte('created_at', start.toISOString()).not('last_contacted_at', 'is', null);
  if (!contacts?.length) return { success: true, message: 'Sin datos de tiempo de respuesta.', data: {} };
  const responseTimes = contacts.map((c: any) => {
    const created = new Date(c.created_at).getTime();
    const contacted = new Date(c.last_contacted_at).getTime();
    return Math.max(0, (contacted - created) / 3600000);
  });
  const avg = responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length;
  const fastest = Math.min(...responseTimes);
  const slowest = Math.max(...responseTimes);
  let message = `## ⏱️ Tiempos de Respuesta\n\n`;
  message += `| Métrica | Valor |\n|---|---|\n`;
  message += `| Promedio | ${avg < 24 ? `${Math.round(avg)}h` : `${Math.round(avg / 24)} días`} |\n`;
  message += `| Más rápido | ${fastest < 1 ? '<1h' : `${Math.round(fastest)}h`} |\n`;
  message += `| Más lento | ${slowest < 24 ? `${Math.round(slowest)}h` : `${Math.round(slowest / 24)} días`} |\n`;
  message += `| Leads analizados | ${contacts.length} |`;
  return { success: true, message, data: { avg, fastest, slowest } };
}

// ===================================================================
// ===== NEW PHASE 4: EMAIL & COMMUNICATION =====
// ===================================================================

async function draftEmail(supabase: any, userId: string, args: any) {
  const { data: contact } = await supabase.from('contacts').select('first_name, last_name, email, job_title, companies(name)').eq('user_id', userId).eq('email', args.recipient_email).maybeSingle();
  const name = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : args.recipient_email.split('@')[0];
  const company = contact?.companies?.name || '';
  const tone = args.tone || 'friendly';
  const templates: Record<string, { subject: string; body: string }> = {
    follow_up: { subject: `Seguimiento - ${company || 'Nuestra conversación'}`, body: `Hola ${name},\n\nEspero que estés bien. Quería dar seguimiento a nuestra última conversación.\n\n${args.context || '¿Has tenido oportunidad de revisar lo que hablamos?'}\n\nQuedo a tus órdenes.\n\nSaludos cordiales` },
    proposal: { subject: `Propuesta para ${company || name}`, body: `Hola ${name},\n\nGracias por tu interés. Adjunto encontrarás nuestra propuesta.\n\n${args.context || 'Los puntos clave son los siguientes:'}\n\nQuedo atento a tus comentarios.\n\nSaludos` },
    introduction: { subject: `Presentación - ${company || ''}`, body: `Hola ${name},\n\nMucho gusto en conocerte. ${args.context || 'Me gustaría presentarme y explorar cómo podemos colaborar.'}\n\nQuedo a tus órdenes.\n\nSaludos cordiales` },
    closing: { subject: `Próximos pasos - ${company || ''}`, body: `Hola ${name},\n\nMe da gusto que avancemos. ${args.context || 'Para formalizar, los próximos pasos serían:'}\n\nQuedo a la espera.\n\nSaludos` },
    thank_you: { subject: `¡Gracias ${name}!`, body: `Hola ${name},\n\nQuiero agradecerte ${args.context || 'por tu tiempo y confianza'}.\n\n¡Seguimos en contacto!\n\nSaludos cordiales` },
    custom: { subject: args.context || 'Sin asunto', body: args.context || '' },
  };
  const template = templates[args.purpose] || templates.custom;
  let message = `## 📧 Borrador de Email\n\n**Para:** ${args.recipient_email}\n**Asunto:** ${template.subject}\n\n---\n\n${template.body}\n\n---\n\n💡 *Tono: ${tone} | Basado en datos del CRM*`;
  return { success: true, message, data: { to: args.recipient_email, subject: template.subject, body: template.body } };
}

async function suggestEmailResponse(supabase: any, _userId: string, args: any) {
  const responseType = args.response_type || 'neutral';
  const content = args.email_content.substring(0, 500);
  let suggestion = '';
  if (responseType === 'positive') suggestion = `Gracias por tu mensaje. Me da gusto saber esto. Estoy de acuerdo y procedo con los siguientes pasos.\n\nQuedo a tus órdenes.`;
  else if (responseType === 'negative') suggestion = `Agradezco tu mensaje. Lamentablemente en este momento no me es posible proceder de esa manera. ¿Podríamos explorar alternativas?\n\nQuedo atento.`;
  else suggestion = `Gracias por tu mensaje. He tomado nota de lo que mencionas. Te confirmo los próximos pasos a la brevedad.\n\nSaludos.`;
  let message = `## 💡 Respuesta Sugerida\n\n**Email recibido:**\n> ${content.substring(0, 200)}...\n\n**Respuesta (${responseType}):**\n\n${suggestion}`;
  return { success: true, message, data: { suggestion, type: responseType } };
}

async function sendWhatsappMessage(supabase: any, userId: string, args: any) {
  let contact: any = null;
  if (args.contact_id) { const { data } = await supabase.from('contacts').select('id, first_name, last_name, whatsapp_number').eq('id', args.contact_id).maybeSingle(); contact = data; }
  else if (args.contact_email) { const { data } = await supabase.from('contacts').select('id, first_name, last_name, whatsapp_number').eq('user_id', userId).eq('email', args.contact_email).maybeSingle(); contact = data; }
  if (!contact) return { success: false, message: '❌ Contacto no encontrado' };
  if (!contact.whatsapp_number) return { success: false, message: `❌ ${contact.first_name || 'Contacto'} no tiene número de WhatsApp registrado` };
  // Log the message as an activity
  await supabase.from('activities').insert({ user_id: userId, title: `WhatsApp a ${contact.first_name || 'Contacto'}`, description: args.message.substring(0, 500), type: 'task', contact_id: contact.id, completed: true, completed_at: new Date().toISOString() });
  return { success: true, message: `✅ Mensaje de WhatsApp registrado para **${contact.first_name || ''} ${contact.last_name || ''}** (${contact.whatsapp_number})` };
}

async function scheduleEmail(supabase: any, userId: string, args: any) {
  const sendAt = new Date(args.send_at);
  const { data, error } = await supabase.from('activities').insert({
    user_id: userId, title: `📧 Enviar email: ${args.subject}`,
    description: `Para: ${args.recipient_email}\nAsunto: ${args.subject}\n\n${args.body || ''}`,
    type: 'email', priority: 'medium', due_date: sendAt.toISOString(), completed: false,
  }).select().single();
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ Email programado para ${sendAt.toLocaleString('es-ES')}`, data };
}

async function getEmailHistory(supabase: any, userId: string, args: any) {
  let contactId = args.contact_id;
  if (!contactId && args.contact_email) {
    const { data } = await supabase.from('contacts').select('id').eq('user_id', userId).eq('email', args.contact_email).maybeSingle();
    contactId = data?.id;
  }
  if (!contactId) return { success: false, message: '❌ Contacto no encontrado' };
  const { data: activities } = await supabase.from('activities').select('id, title, description, type, created_at, completed').eq('contact_id', contactId).in('type', ['email', 'call', 'meeting']).order('created_at', { ascending: false }).limit(args.limit || 10);
  if (!activities?.length) return { success: true, message: 'Sin historial de comunicaciones.', data: [] };
  let message = `## 📧 Historial de Comunicaciones (${activities.length})\n\n`;
  message += activities.map((a: any) => {
    const emoji = a.type === 'email' ? '📧' : a.type === 'call' ? '📞' : '🤝';
    return `${emoji} **${a.title}** (${new Date(a.created_at).toLocaleDateString('es-ES')})`;
  }).join('\n');
  return { success: true, message, data: activities };
}

async function analyzeEmailSentiment(_supabase: any, _userId: string, args: any) {
  const content = args.email_content.toLowerCase();
  const positiveWords = ['gracias', 'excelente', 'perfecto', 'genial', 'me encanta', 'de acuerdo', 'adelante', 'fantástico', 'increíble', 'great', 'thanks', 'love', 'perfect'];
  const negativeWords = ['problema', 'queja', 'cancelar', 'insatisfecho', 'mal', 'error', 'no puedo', 'imposible', 'decepcionado', 'complaint', 'cancel', 'issue'];
  const posCount = positiveWords.filter(w => content.includes(w)).length;
  const negCount = negativeWords.filter(w => content.includes(w)).length;
  let sentiment: string, emoji: string, score: number;
  if (posCount > negCount) { sentiment = 'Positivo'; emoji = '😊'; score = Math.min(100, 50 + posCount * 15); }
  else if (negCount > posCount) { sentiment = 'Negativo'; emoji = '😟'; score = Math.max(0, 50 - negCount * 15); }
  else { sentiment = 'Neutral'; emoji = '😐'; score = 50; }
  let message = `## 📊 Análisis de Sentimiento\n\n${emoji} **${sentiment}** (score: ${score}/100)\n\n`;
  if (posCount) message += `✅ Palabras positivas detectadas: ${posCount}\n`;
  if (negCount) message += `⚠️ Palabras negativas detectadas: ${negCount}`;
  return { success: true, message, data: { sentiment, score, posCount, negCount } };
}

// ===================================================================
// ===== NEW PHASE 5: DATA & ADVANCED SEARCH =====
// ===================================================================

async function advancedSearch(supabase: any, userId: string, args: any) {
  const limit = args.limit || 20;
  let data: any[] = [];
  const entityType = args.entity_type;
  if (entityType === 'contacts') {
    const { data: results } = await supabase.from('contacts').select('id, first_name, last_name, email, phone, job_title, companies(name), created_at').eq('user_id', userId).order(args.sort_by || 'created_at', { ascending: false }).limit(limit);
    data = results || [];
  } else if (entityType === 'companies') {
    const { data: results } = await supabase.from('companies').select('id, name, industry, website, city, country, created_at').eq('user_id', userId).order(args.sort_by || 'created_at', { ascending: false }).limit(limit);
    data = results || [];
  } else if (entityType === 'opportunities') {
    const { data: results } = await supabase.from('opportunities').select('id, title, value, status, probability, stages(name), companies(name), created_at').eq('user_id', userId).order(args.sort_by || 'value', { ascending: false }).limit(limit);
    data = results || [];
  } else if (entityType === 'activities') {
    const { data: results } = await supabase.from('activities').select('id, title, type, priority, due_date, completed, created_at').eq('user_id', userId).order(args.sort_by || 'due_date', { ascending: true }).limit(limit);
    data = results || [];
  }
  let message = `## 🔍 Búsqueda: ${entityType} (${data.length})\n\n`;
  if (entityType === 'contacts') message += data.map((c: any) => `- **${c.first_name || ''} ${c.last_name || ''}** (${c.email})${c.companies?.name ? ` @ ${c.companies.name}` : ''}`).join('\n');
  else if (entityType === 'companies') message += data.map((c: any) => `- **${c.name}**${c.industry ? ` (${c.industry})` : ''}`).join('\n');
  else if (entityType === 'opportunities') message += data.map((o: any) => `- **${o.title}** $${(o.value || 0).toLocaleString()} - ${o.stages?.name || o.status}`).join('\n');
  else message += data.map((a: any) => `- ${a.completed ? '✅' : '⬜'} **${a.title}** (${a.type})`).join('\n');
  return { success: true, message, data };
}

async function findDuplicatesAI(supabase: any, userId: string, args: any) {
  const entityType = args.entity_type;
  const duplicates: Array<{ group: any[] }> = [];
  if (entityType === 'contacts') {
    const { data: contacts } = await supabase.from('contacts').select('id, first_name, last_name, email, phone').eq('user_id', userId).limit(500);
    const emailMap: Record<string, any[]> = {};
    (contacts || []).forEach((c: any) => {
      const key = c.email?.toLowerCase();
      if (key) { if (!emailMap[key]) emailMap[key] = []; emailMap[key].push(c); }
    });
    Object.values(emailMap).filter(g => g.length > 1).forEach(group => duplicates.push({ group }));
  } else {
    const { data: companies } = await supabase.from('companies').select('id, name, domain').eq('user_id', userId).limit(500);
    const nameMap: Record<string, any[]> = {};
    (companies || []).forEach((c: any) => {
      const key = c.name?.toLowerCase().trim();
      if (key) { if (!nameMap[key]) nameMap[key] = []; nameMap[key].push(c); }
    });
    Object.values(nameMap).filter(g => g.length > 1).forEach(group => duplicates.push({ group }));
  }
  if (!duplicates.length) return { success: true, message: `✅ No se encontraron duplicados en ${entityType}.`, data: [] };
  let message = `## 🔍 Duplicados en ${entityType} (${duplicates.length} grupos)\n\n`;
  message += duplicates.slice(0, 10).map((d, i) => `### Grupo ${i + 1}:\n${d.group.map((item: any) => `- ${entityType === 'contacts' ? `${item.first_name || ''} ${item.last_name || ''} (${item.email})` : item.name} [ID: ${item.id.substring(0, 8)}]`).join('\n')}`).join('\n\n');
  return { success: true, message, data: duplicates };
}

async function bulkUpdate(supabase: any, userId: string, args: any) {
  const { entity_type, filter_field, filter_value, update_field, update_value } = args;
  const allowedFields: Record<string, string[]> = {
    contacts: ['source', 'notes', 'job_title', 'department'],
    companies: ['industry', 'city', 'country', 'description'],
    opportunities: ['status', 'probability', 'description'],
  };
  if (!allowedFields[entity_type]?.includes(update_field)) return { success: false, message: `❌ Campo "${update_field}" no permitido para actualización masiva` };
  let query = supabase.from(entity_type).update({ [update_field]: update_value, updated_at: new Date().toISOString() }).eq('user_id', userId);
  if (filter_field && filter_value) query = query.ilike(filter_field, `%${filter_value}%`);
  const { error, count } = await query;
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  return { success: true, message: `✅ ${count || 'Registros'} actualizados: ${update_field} = "${update_value}"` };
}

async function exportData(supabase: any, userId: string, args: any) {
  const limit = args.limit || 100;
  let data: any[] = [];
  if (args.entity_type === 'contacts') {
    const { data: results } = await supabase.from('contacts').select('first_name, last_name, email, phone, job_title, companies(name), created_at').eq('user_id', userId).limit(limit);
    data = results || [];
  } else if (args.entity_type === 'companies') {
    const { data: results } = await supabase.from('companies').select('name, industry, website, phone, city, country, created_at').eq('user_id', userId).limit(limit);
    data = results || [];
  } else {
    const { data: results } = await supabase.from('opportunities').select('title, value, status, probability, expected_close_date, companies(name), stages(name), created_at').eq('user_id', userId).limit(limit);
    data = results || [];
  }
  let message = `## 📥 Datos de ${args.entity_type} (${data.length} registros)\n\n`;
  message += `Los datos están disponibles. Para exportar a CSV, usa la función de exportación desde la página de Datos.\n\n`;
  message += `**Resumen:**\n- Total registros: ${data.length}\n- Tipo: ${args.entity_type}`;
  return { success: true, message, data };
}

async function getDataQualityScore(supabase: any, userId: string) {
  const [{ data: contacts }, { data: companies }, { data: opps }] = await Promise.all([
    supabase.from('contacts').select('id, email, phone, first_name, last_name, job_title').eq('user_id', userId).limit(500),
    supabase.from('companies').select('id, name, industry, website, phone').eq('user_id', userId).limit(500),
    supabase.from('opportunities').select('id, title, value, expected_close_date, contact_id, company_id').eq('user_id', userId).limit(500),
  ]);
  const c = contacts || [], co = companies || [], o = opps || [];
  const issues: string[] = [];
  const noPhone = c.filter((x: any) => !x.phone).length;
  const noName = c.filter((x: any) => !x.first_name && !x.last_name).length;
  const noTitle = c.filter((x: any) => !x.job_title).length;
  const noIndustry = co.filter((x: any) => !x.industry).length;
  const noWebsite = co.filter((x: any) => !x.website).length;
  const noValue = o.filter((x: any) => !x.value || x.value === 0).length;
  const noClose = o.filter((x: any) => !x.expected_close_date).length;
  if (noPhone > 0) issues.push(`📱 ${noPhone} contactos sin teléfono`);
  if (noName > 0) issues.push(`👤 ${noName} contactos sin nombre`);
  if (noTitle > 0) issues.push(`💼 ${noTitle} contactos sin cargo`);
  if (noIndustry > 0) issues.push(`🏭 ${noIndustry} empresas sin industria`);
  if (noWebsite > 0) issues.push(`🌐 ${noWebsite} empresas sin website`);
  if (noValue > 0) issues.push(`💰 ${noValue} oportunidades sin valor`);
  if (noClose > 0) issues.push(`📅 ${noClose} oportunidades sin fecha de cierre`);
  const totalFields = c.length * 3 + co.length * 2 + o.length * 2;
  const missingFields = noPhone + noName + noTitle + noIndustry + noWebsite + noValue + noClose;
  const score = totalFields > 0 ? Math.round(((totalFields - missingFields) / totalFields) * 100) : 100;
  let message = `## 📊 Calidad de Datos: ${score}%\n\n`;
  const bar = '█'.repeat(Math.round(score / 5)) + '░'.repeat(20 - Math.round(score / 5));
  message += `${bar}\n\n`;
  if (issues.length) message += `### Problemas encontrados:\n${issues.join('\n')}`;
  else message += '✅ Tus datos están completos. ¡Excelente!';
  return { success: true, message, data: { score, issues } };
}

// ===================================================================
// ===== NEW PHASE 6: ADVANCED COLLABORATION =====
// ===================================================================

async function mentionTeamMember(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, full_name, avatar_url').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: target } = await supabase.from('team_members').select('user_id, full_name, email').eq('organization_id', currentMember.organization_id).eq('email', args.member_email).eq('is_active', true).maybeSingle();
  if (!target) return { success: false, message: `❌ Miembro ${args.member_email} no encontrado` };
  const { error } = await supabase.from('comments').insert({ organization_id: currentMember.organization_id, user_id: userId, user_name: currentMember.full_name, user_avatar: currentMember.avatar_url, entity_type: args.entity_type, entity_id: args.entity_id, content: `@${target.full_name || target.email} ${args.message}`, mentions: [target.user_id] });
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  await supabase.from('notifications').insert({ user_id: target.user_id, type: 'mention', title: `${currentMember.full_name || 'Alguien'} te mencionó`, message: args.message, entity_type: args.entity_type, entity_id: args.entity_id });
  return { success: true, message: `✅ @${target.full_name || target.email} mencionado y notificado` };
}

async function createTeamTask(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: assignee } = await supabase.from('team_members').select('user_id, full_name').eq('organization_id', orgId).eq('email', args.assignee_email).eq('is_active', true).maybeSingle();
  if (!assignee) return { success: false, message: `❌ Miembro ${args.assignee_email} no encontrado` };
  const dueDate = args.due_date ? new Date(args.due_date + 'T09:00:00').toISOString() : null;
  const { data, error } = await supabase.from('activities').insert({
    user_id: assignee.user_id, title: args.title, description: args.description || null,
    type: 'task', priority: args.priority || 'medium', due_date: dueDate,
    completed: false, assigned_to: assignee.user_id, created_by: userId, organization_id: orgId,
  }).select().single();
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  await supabase.from('notifications').insert({ user_id: assignee.user_id, type: 'task_assigned', title: 'Nueva tarea asignada', message: args.title });
  return { success: true, message: `✅ Tarea "${args.title}" asignada a **${assignee.full_name || args.assignee_email}**`, data };
}

async function handoffDeal(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: deal } = await supabase.from('opportunities').select('id, title, value').eq('user_id', userId).ilike('title', `%${args.deal_title}%`).limit(1).maybeSingle();
  if (!deal) return { success: false, message: `❌ Deal "${args.deal_title}" no encontrado` };
  const { data: newOwner } = await supabase.from('team_members').select('user_id, full_name').eq('organization_id', orgId).eq('email', args.new_owner_email).eq('is_active', true).maybeSingle();
  if (!newOwner) return { success: false, message: `❌ Miembro ${args.new_owner_email} no encontrado` };
  const { error } = await supabase.from('opportunities').update({ assigned_to: newOwner.user_id, updated_at: new Date().toISOString() }).eq('id', deal.id);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  await supabase.from('notifications').insert({ user_id: newOwner.user_id, type: 'deal_handoff', title: 'Deal transferido', message: `"${deal.title}" ($${(deal.value || 0).toLocaleString()}) - ${args.handoff_notes || 'Sin notas'}` });
  await supabase.from('activity_feed').insert({ organization_id: orgId, user_id: userId, action: 'assigned', entity_type: 'opportunities', entity_id: deal.id, entity_name: deal.title, metadata: { assigned_to: args.new_owner_email, notes: args.handoff_notes } });
  return { success: true, message: `✅ Deal "${deal.title}" transferido a **${newOwner.full_name || args.new_owner_email}**${args.handoff_notes ? `\n📝 Notas: ${args.handoff_notes}` : ''}` };
}

async function requestManagerApproval(supabase: any, userId: string, args: any) {
  const { data: currentMember } = await supabase.from('team_members').select('organization_id, full_name').eq('user_id', userId).eq('is_active', true).maybeSingle();
  if (!currentMember) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const { data: managers } = await supabase.from('team_members').select('user_id, full_name, email').eq('organization_id', currentMember.organization_id).in('role', ['admin', 'manager']).eq('is_active', true).neq('user_id', userId);
  if (!managers?.length) return { success: false, message: '❌ No hay managers disponibles' };
  const { data: deal } = await supabase.from('opportunities').select('id, title, value').eq('user_id', userId).ilike('title', `%${args.deal_title}%`).limit(1).maybeSingle();
  const dealInfo = deal ? `Deal: "${deal.title}" ($${(deal.value || 0).toLocaleString()})` : `Deal: ${args.deal_title}`;
  for (const manager of managers) {
    await supabase.from('notifications').insert({
      user_id: manager.user_id, type: 'approval_request', title: `Solicitud de aprobación: ${args.request_type}`,
      message: `${currentMember.full_name || 'Usuario'} solicita aprobación.\n${dealInfo}\n${args.details}`,
      priority: args.urgency === 'high' ? 'high' : 'normal',
    });
  }
  return { success: true, message: `✅ Solicitud de aprobación enviada a ${managers.length} manager(s):\n${managers.map((m: any) => `- ${m.full_name || m.email}`).join('\n')}` };
}

// ===================================================================
// ===== FASE 7: DOCUMENTOS =====
// ===================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const docTypeLabels: Record<string, string> = {
  contract: '📄 Contrato', proposal: '📝 Propuesta', quote: '💰 Cotización',
  invoice: '🧾 Factura', presentation: '📊 Presentación', nda: '🔒 NDA',
  agreement: '🤝 Acuerdo', other: '📎 Otro',
};

async function searchDocuments(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  const query = args.query || '';
  const docType = args.document_type;
  const limit = args.limit || 20;

  const buildQuery = (table: string, extraSelect = '') => {
    let q = supabase.from(table).select(`id, file_name, file_size, document_type, created_at, is_shared, description, tags${extraSelect}`);
    if (table === 'org_documents') q = q.eq('organization_id', orgId);
    else q = q.eq('organization_id', orgId);
    if (query) q = q.or(`file_name.ilike.%${query}%,description.ilike.%${query}%`);
    if (docType) q = q.eq('document_type', docType);
    return q.order('created_at', { ascending: false }).limit(limit);
  };

  const [orgDocs, contactDocs, companyDocs] = await Promise.all([
    buildQuery('org_documents'),
    buildQuery('contact_documents', ', contact_id'),
    buildQuery('company_documents', ', company_id'),
  ]);

  const all = [
    ...(orgDocs.data || []).map((d: any) => ({ ...d, source: '🏢 Repositorio' })),
    ...(contactDocs.data || []).map((d: any) => ({ ...d, source: '👤 Contacto' })),
    ...(companyDocs.data || []).map((d: any) => ({ ...d, source: '🏭 Empresa' })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);

  if (!all.length) return { success: true, message: `No se encontraron documentos${query ? ` para "${query}"` : ''}.`, data: [] };

  let message = `## 📂 Documentos encontrados (${all.length})\n\n`;
  message += all.map((d: any) => {
    const label = docTypeLabels[d.document_type] || `📎 ${d.document_type}`;
    return `${label} **${d.file_name}** (${formatFileSize(d.file_size)}) ${d.source}${d.is_shared ? ' 🔗' : ''}\n   ${getTimeAgo(new Date(d.created_at))}`;
  }).join('\n\n');
  return { success: true, message, data: all };
}

async function listRecentDocuments(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };
  let query = supabase.from('org_documents').select('id, file_name, file_size, document_type, created_at, is_shared, description, tags').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (args.document_type) query = query.eq('document_type', args.document_type);
  const { data, error } = await query.limit(args.limit || 10);
  if (error) return { success: false, message: `❌ Error: ${error.message}` };
  if (!data?.length) return { success: true, message: 'No hay documentos en el repositorio.', data: [] };
  let message = `## 📂 Documentos Recientes (${data.length})\n\n`;
  message += data.map((d: any) => {
    const label = docTypeLabels[d.document_type] || `📎 ${d.document_type}`;
    return `${label} **${d.file_name}** (${formatFileSize(d.file_size)})${d.is_shared ? ' 🔗' : ''}\n   ${getTimeAgo(new Date(d.created_at))}${d.tags?.length ? ` | Tags: ${d.tags.join(', ')}` : ''}`;
  }).join('\n\n');
  return { success: true, message, data };
}

async function getDocumentStats(supabase: any, userId: string) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const [orgDocs, contactDocs, companyDocs] = await Promise.all([
    supabase.from('org_documents').select('id, file_size, document_type, is_shared').eq('organization_id', orgId),
    supabase.from('contact_documents').select('id, file_size, document_type').eq('organization_id', orgId),
    supabase.from('company_documents').select('id, file_size, document_type').eq('organization_id', orgId),
  ]);

  const allDocs = [...(orgDocs.data || []), ...(contactDocs.data || []), ...(companyDocs.data || [])];
  const totalSize = allDocs.reduce((s, d: any) => s + (d.file_size || 0), 0);
  const shared = (orgDocs.data || []).filter((d: any) => d.is_shared).length;

  const byType: Record<string, number> = {};
  allDocs.forEach((d: any) => { byType[d.document_type] = (byType[d.document_type] || 0) + 1; });

  let message = `## 📊 Estadísticas de Documentos\n\n`;
  message += `| Métrica | Valor |\n|---|---|\n`;
  message += `| Total documentos | ${allDocs.length} |\n`;
  message += `| Repositorio central | ${orgDocs.data?.length || 0} |\n`;
  message += `| En contactos | ${contactDocs.data?.length || 0} |\n`;
  message += `| En empresas | ${companyDocs.data?.length || 0} |\n`;
  message += `| Compartidos | ${shared} |\n`;
  message += `| Almacenamiento | ${formatFileSize(totalSize)} |\n\n`;
  message += `### Por tipo:\n`;
  message += Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
    const label = docTypeLabels[type] || `📎 ${type}`;
    return `${label}: ${count}`;
  }).join('\n');

  return { success: true, message, data: { total: allDocs.length, byType, totalSize, shared } };
}

async function listContactDocumentsTool(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };

  let contactQuery = supabase.from('contacts').select('id, first_name, last_name, email').eq('organization_id', orgId);
  if (args.contact_email) contactQuery = contactQuery.eq('email', args.contact_email);
  else if (args.contact_name) contactQuery = contactQuery.or(`first_name.ilike.%${args.contact_name}%,last_name.ilike.%${args.contact_name}%`);
  else return { success: false, message: '❌ Proporciona email o nombre del contacto' };

  const { data: contact } = await contactQuery.limit(1).maybeSingle();
  if (!contact) return { success: false, message: '❌ Contacto no encontrado' };

  const { data: docs } = await supabase.from('contact_documents').select('id, file_name, file_size, document_type, created_at, is_shared, description').eq('contact_id', contact.id).order('created_at', { ascending: false }).limit(args.limit || 10);

  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.email;
  if (!docs?.length) return { success: true, message: `Sin documentos para ${name}.`, data: [] };

  let message = `## 📂 Documentos de ${name} (${docs.length})\n\n`;
  message += docs.map((d: any) => {
    const label = docTypeLabels[d.document_type] || `📎 ${d.document_type}`;
    return `${label} **${d.file_name}** (${formatFileSize(d.file_size)})${d.is_shared ? ' 🔗' : ''}\n   ${getTimeAgo(new Date(d.created_at))}`;
  }).join('\n\n');
  return { success: true, message, data: docs };
}

async function listCompanyDocumentsTool(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const { data: company } = await supabase.from('companies').select('id, name').eq('organization_id', orgId).ilike('name', `%${args.company_name}%`).limit(1).maybeSingle();
  if (!company) return { success: false, message: `❌ Empresa "${args.company_name}" no encontrada` };

  const { data: docs } = await supabase.from('company_documents').select('id, file_name, file_size, document_type, created_at, is_shared, description').eq('company_id', company.id).order('created_at', { ascending: false }).limit(args.limit || 10);

  if (!docs?.length) return { success: true, message: `Sin documentos para ${company.name}.`, data: [] };

  let message = `## 📂 Documentos de ${company.name} (${docs.length})\n\n`;
  message += docs.map((d: any) => {
    const label = docTypeLabels[d.document_type] || `📎 ${d.document_type}`;
    return `${label} **${d.file_name}** (${formatFileSize(d.file_size)})${d.is_shared ? ' 🔗' : ''}\n   ${getTimeAgo(new Date(d.created_at))}`;
  }).join('\n\n');
  return { success: true, message, data: docs };
}

async function shareDocumentTool(supabase: any, userId: string, args: any) {
  const orgId = await getOrgId(supabase, userId);
  if (!orgId) return { success: false, message: '❌ No perteneces a ninguna organización' };

  const { data: doc } = await supabase.from('org_documents').select('id, file_name, is_shared, share_token').eq('organization_id', orgId).ilike('file_name', `%${args.file_name}%`).limit(1).maybeSingle();
  if (!doc) return { success: false, message: `❌ Documento "${args.file_name}" no encontrado en el repositorio` };

  if (doc.is_shared && doc.share_token) {
    return { success: true, message: `🔗 Este documento ya tiene un link activo.\nToken: \`${doc.share_token}\`\nComparte la URL: **/shared/${doc.share_token}**` };
  }

  const shareToken = crypto.randomUUID();
  const expiresAt = args.expires_in_days
    ? new Date(Date.now() + args.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.from('org_documents').update({
    is_shared: true,
    share_token: shareToken,
    share_expires_at: expiresAt,
    share_views: 0,
  }).eq('id', doc.id);

  if (error) return { success: false, message: `❌ Error: ${error.message}` };

  let message = `✅ Link generado para **${doc.file_name}**\n\n🔗 Token: \`${shareToken}\`\nURL: **/shared/${shareToken}**`;
  if (args.expires_in_days) message += `\n⏰ Expira en ${args.expires_in_days} días`;
  else message += `\n♾️ Sin fecha de expiración`;

  return { success: true, message, data: { shareToken, fileName: doc.file_name } };
}

// ===== MAIN TOOL EXECUTOR =====
async function executeTool(supabase: any, userId: string, toolName: string, args: any): Promise<{ success: boolean; message: string; data?: any }> {
  console.log(`Executing tool: ${toolName}`, args);
  try {
    switch (toolName) {
      // CONTACTS
      case "create_contact": {
        let companyId = null;
        if (args.company_name) { const { data } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.company_name}%`).limit(1).single(); companyId = data?.id || null; }
        const { data, error } = await supabase.from('contacts').insert({ user_id: userId, email: args.email, first_name: args.first_name || null, last_name: args.last_name || null, phone: args.phone || null, whatsapp_number: args.whatsapp_number || null, job_title: args.job_title || null, notes: args.notes || null, company_id: companyId }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Contacto creado: ${args.first_name || ''} ${args.last_name || ''} (${args.email})`, data };
      }
      case "update_contact": return await updateContact(supabase, userId, args);
      case "search_contacts": return await searchContactsAdvanced(supabase, userId, args);
      // COMPANIES
      case "create_company": {
        const { data, error } = await supabase.from('companies').insert({ user_id: userId, name: args.name, industry: args.industry || null, website: args.website || null, phone: args.phone || null, city: args.city || null, country: args.country || null, description: args.description || null }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Empresa creada: ${args.name}`, data };
      }
      case "search_companies": {
        const { data, error } = await supabase.from('companies').select('id, name, industry, website, phone, city').eq('user_id', userId).or(`name.ilike.%${args.query}%,domain.ilike.%${args.query}%`).limit(10);
        if (error) throw error;
        if (!data?.length) return { success: true, message: 'No se encontraron empresas', data: [] };
        return { success: true, message: `🏢 ${data.length} empresa(s):\n${data.map((c: any) => `• **${c.name}**${c.industry ? ` (${c.industry})` : ''}`).join('\n')}`, data };
      }
      case "update_company": return await updateCompany(supabase, userId, args);
      // TASKS
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
        if (args.contact_email) { const { data } = await supabase.from('contacts').select('id').eq('user_id', userId).eq('email', args.contact_email).single(); contactId = data?.id || null; }
        const { data, error } = await supabase.from('activities').insert({ user_id: userId, title: args.title, description: args.description || null, type: 'meeting', priority: 'medium', due_date: meetingDate, completed: false, contact_id: contactId }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Reunión programada: "${args.title}"${args.date ? ` el ${args.date}` : ''}` };
      }
      // OPPORTUNITIES
      case "create_opportunity": {
        let companyId = null, contactId = null;
        if (args.company_name) { const { data } = await supabase.from('companies').select('id').eq('user_id', userId).ilike('name', `%${args.company_name}%`).limit(1).single(); companyId = data?.id || null; }
        if (args.contact_email) { const { data } = await supabase.from('contacts').select('id').eq('user_id', userId).eq('email', args.contact_email).single(); contactId = data?.id || null; }
        const { data: pipeline } = await supabase.from('pipelines').select('id').eq('user_id', userId).eq('is_default', true).limit(1).single();
        let stageId = null;
        if (pipeline) { const { data: stage } = await supabase.from('stages').select('id').eq('pipeline_id', pipeline.id).order('position', { ascending: true }).limit(1).single(); stageId = stage?.id || null; }
        const { data, error } = await supabase.from('opportunities').insert({ user_id: userId, title: args.title, value: args.value || 0, description: args.description || null, expected_close_date: args.expected_close_date || null, company_id: companyId, contact_id: contactId, pipeline_id: pipeline?.id || null, stage_id: stageId, status: 'open', probability: 50 }).select().single();
        if (error) throw error;
        return { success: true, message: `✅ Oportunidad creada: "${args.title}" - $${(args.value || 0).toLocaleString()}`, data };
      }
      case "update_opportunity_stage": {
        const { data: opp } = await supabase.from('opportunities').select('id, pipeline_id').eq('user_id', userId).ilike('title', `%${args.opportunity_title}%`).limit(1).single();
        if (!opp) return { success: false, message: `❌ Oportunidad no encontrada` };
        const { data: stage } = await supabase.from('stages').select('id, name').eq('pipeline_id', opp.pipeline_id).ilike('name', `%${args.new_stage}%`).limit(1).single();
        if (!stage) return { success: false, message: `❌ Etapa "${args.new_stage}" no encontrada` };
        const { error } = await supabase.from('opportunities').update({ stage_id: stage.id }).eq('id', opp.id);
        if (error) throw error;
        return { success: true, message: `✅ Oportunidad movida a "${stage.name}"` };
      }
      case "search_opportunities": return await searchOpportunities(supabase, userId, args);
      case "get_pipeline_summary": return await getPipelineSummaryAdvanced(supabase, userId, args);
      case "analyze_deal_health": return await analyzeDealHealth(supabase, userId, args);
      // TIMELINE
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
      case "notify_team_member": return await addTeamComment(supabase, userId, { entity_type: args.entity_type, entity_identifier: args.entity_identifier, content: `@${args.member_email.split('@')[0]} ${args.message}` });
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

      // ===== NEW: CALENDARIO =====
      case "create_calendar_event": return await createCalendarEvent(supabase, userId, args);
      case "list_calendar_events": return await listCalendarEvents(supabase, userId, args);
      case "get_today_agenda": return await getTodayAgenda(supabase, userId);
      case "update_calendar_event": return await updateCalendarEvent(supabase, userId, args);
      case "delete_calendar_event": return await deleteCalendarEvent(supabase, userId, args);
      case "find_available_slots": return await findAvailableSlots(supabase, userId, args);
      case "create_goal": return await createGoal(supabase, userId, args);
      case "update_goal_progress": return await updateGoalProgress(supabase, userId, args);
      case "list_goals": return await listGoals(supabase, userId, args);
      case "reschedule_event": return await rescheduleEvent(supabase, userId, args);
      case "get_week_summary": return await getWeekSummary(supabase, userId, args);
      case "block_time": return await blockTime(supabase, userId, args);

      // ===== NEW: ACCIONES INTELIGENTES =====
      case "prioritize_my_day": return await prioritizeMyDay(supabase, userId);
      case "suggest_follow_ups": return await suggestFollowUps(supabase, userId, args);
      case "predict_deal_close_probability": return await predictDealCloseProbability(supabase, userId, args);
      case "suggest_upsell_opportunities": return await suggestUpsellOpportunities(supabase, userId, args);
      case "analyze_contact_engagement": return await analyzeContactEngagement(supabase, userId, args);
      case "smart_meeting_scheduler": return await smartMeetingScheduler(supabase, userId, args);
      case "generate_deal_summary": return await generateDealSummary(supabase, userId, args);

      // ===== NEW: REPORTES =====
      case "get_sales_report": return await getSalesReport(supabase, userId, args);
      case "get_activity_report": return await getActivityReport(supabase, userId, args);
      case "get_conversion_funnel": return await getConversionFunnel(supabase, userId, args);
      case "get_deal_forecast": return await getDealForecast(supabase, userId, args);
      case "compare_performance": return await comparePerformance(supabase, userId, args);
      case "get_top_performers": return await getTopPerformers(supabase, userId, args);
      case "get_lost_deals_analysis": return await getLostDealsAnalysis(supabase, userId, args);
      case "get_response_time_stats": return await getResponseTimeStats(supabase, userId, args);

      // ===== NEW: EMAIL =====
      case "draft_email": return await draftEmail(supabase, userId, args);
      case "suggest_email_response": return await suggestEmailResponse(supabase, userId, args);
      case "send_whatsapp_message": return await sendWhatsappMessage(supabase, userId, args);
      case "schedule_email": return await scheduleEmail(supabase, userId, args);
      case "get_email_history": return await getEmailHistory(supabase, userId, args);
      case "analyze_email_sentiment": return await analyzeEmailSentiment(supabase, userId, args);

      // ===== NEW: DATOS =====
      case "advanced_search": return await advancedSearch(supabase, userId, args);
      case "find_duplicates_ai": return await findDuplicatesAI(supabase, userId, args);
      case "bulk_update": return await bulkUpdate(supabase, userId, args);
      case "export_data": return await exportData(supabase, userId, args);
      case "get_data_quality_score": return await getDataQualityScore(supabase, userId);

      // ===== NEW: COLABORACIÓN =====
      case "mention_team_member": return await mentionTeamMember(supabase, userId, args);
      case "create_team_task": return await createTeamTask(supabase, userId, args);
      case "handoff_deal": return await handoffDeal(supabase, userId, args);
      case "request_manager_approval": return await requestManagerApproval(supabase, userId, args);

      // ===== NEW: DOCUMENTOS =====
      case "search_documents": return await searchDocuments(supabase, userId, args);
      case "list_recent_documents": return await listRecentDocuments(supabase, userId, args);
      case "get_document_stats": return await getDocumentStats(supabase, userId);
      case "list_contact_documents": return await listContactDocumentsTool(supabase, userId, args);
      case "list_company_documents": return await listCompanyDocumentsTool(supabase, userId, args);
      case "share_document": return await shareDocumentTool(supabase, userId, args);

      default:
        return { success: false, message: `❌ Función desconocida: ${toolName}` };
    }
  } catch (error) {
    console.error(`Error in ${toolName}:`, error);
    return { success: false, message: `❌ Error en ${toolName}: ${error instanceof Error ? error.message : 'Error desconocido'}` };
  }
}

// ===== AUTH HELPER =====
async function getUserIdFromToken(supabase: any, authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user.id;
  } catch { return null; }
}

// ===== MAIN HANDLER =====
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, currentRoute } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: "AI service not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { global: { headers: authHeader ? { Authorization: authHeader } : {} } });

    const userId = await getUserIdFromToken(supabase, authHeader);
    if (!userId) return new Response(JSON.stringify({ error: "Usuario no autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ===== AI USAGE LIMIT CHECK =====
    try {
      // Get organization ID for this user
      const { data: teamData } = await supabase
        .from('team_members')
        .select('organization_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (teamData?.organization_id) {
        const orgId = teamData.organization_id;

        // Use service role client for usage functions (bypass RLS)
        const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const serviceClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!, {});

        const { data: usageData } = await serviceClient
          .rpc('get_current_usage', { p_org_id: orgId });

        const usage = usageData?.[0];
        if (usage && !usage.can_use_ai) {
          const isNoPlan = usage.ai_conversations_limit === 0;
          const message = isNoPlan
            ? "Tu plan no incluye asistente IA. Contacta a tu administrador para cambiar de plan."
            : `Has alcanzado el límite de ${usage.ai_conversations_limit} conversaciones IA este mes. El límite se reinicia el próximo período.`;
          return new Response(
            JSON.stringify({ error: message, code: "AI_LIMIT_REACHED" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Increment usage asynchronously (non-blocking)
        if (usage?.can_use_ai) {
          serviceClient.rpc('increment_ai_usage', { p_org_id: orgId, p_user_id: userId })
            .then(() => {})
            .catch((e: Error) => console.warn("increment_ai_usage error:", e.message));
        }
      }
    } catch (limitErr) {
      // Non-critical: if usage check fails, allow the request to proceed
      console.warn("Usage limit check failed (non-blocking):", limitErr);
    }
    // ===== END AI USAGE LIMIT CHECK =====

    console.log("Chat request - user:", userId, "route:", currentRoute, "tools:", tools.length);
    const crmContext = await fetchCRMContext(supabase, userId);
    const systemPrompt = buildSystemPrompt(crmContext, currentRoute);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "system", content: systemPrompt }, ...messages], tools, tool_choice: "auto", stream: false }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Límite de solicitudes excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Error al conectar con IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiResponse = await response.json();
    const choice = aiResponse.choices?.[0];

    if (choice?.message?.tool_calls?.length > 0) {
      console.log("Tool calls:", choice.message.tool_calls.map((tc: any) => tc.function.name));
      const toolResults: any[] = [];
      for (const toolCall of choice.message.tool_calls) {
        const toolArgs = typeof toolCall.function.arguments === 'string' ? JSON.parse(toolCall.function.arguments) : toolCall.function.arguments;
        const result = await executeTool(supabase, userId, toolCall.function.name, toolArgs);
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
