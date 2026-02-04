import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
];

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
}) => {
  return `Eres un asistente de CRM inteligente y amigable. Tu objetivo es ayudar a los usuarios a gestionar sus contactos, empresas, oportunidades de venta y tareas de manera eficiente.

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

## IMPORTANTE - Funciones disponibles:
- **create_contact**: Crear un nuevo contacto (requiere email)
- **update_contact**: Actualizar información de un contacto existente
- **search_contacts**: Buscar contactos con filtros avanzados (nombre, empresa, WhatsApp)
- **create_company**: Crear una nueva empresa (requiere nombre)
- **search_companies**: Buscar empresas por nombre o dominio
- **create_task**: Crear una tarea o actividad
- **schedule_meeting**: Programar una reunión o llamada
- **create_opportunity**: Crear una oportunidad de venta en el pipeline
- **update_opportunity_stage**: Mover una oportunidad a otra etapa
- **get_pipeline_summary**: Obtener resumen del pipeline con valores por etapa y deals en riesgo
- **analyze_deal_health**: Analizar la salud de una oportunidad específica
- **search_timeline**: Buscar en el historial de interacciones
- **find_promises**: Buscar compromisos y action items pendientes
- **get_next_best_action**: Obtener sugerencia de la siguiente mejor acción
- **add_note**: Agregar una nota a un contacto o empresa

## Directrices:
- Responde siempre en español
- Usa formato markdown para mejor legibilidad (negritas, listas, emojis)
- Sé conciso pero útil
- Cuando el usuario pregunte por datos, usa la información real proporcionada arriba
- Si el usuario pregunta algo que no puedes hacer, sugiere alternativas
- Mantén un tono profesional pero cercano

## REGLAS ESTRICTAS DE FUNCTION CALLING:
1. **NUNCA** digas que creaste algo sin usar la función correspondiente
2. Si el usuario pide crear un contacto, **DEBES** usar create_contact - NO simules la creación
3. Si el usuario pide crear una empresa, **DEBES** usar create_company - NO simules la creación
4. Si el usuario pide crear una tarea, **DEBES** usar create_task - NO simules la creación
5. Si el usuario pide crear una oportunidad/deal, **DEBES** usar create_opportunity
6. Si faltan datos obligatorios (email para contactos, nombre para empresas/tareas/oportunidades), **PRIMERO** pregunta por esos datos
7. Solo confirma la creación **DESPUÉS** de recibir el resultado exitoso de la función
8. Si la función falla, informa al usuario del error específico

## Navegación del CRM:
- **Dashboard** (/dashboard): Vista general con estadísticas
- **Contactos** (/contacts): Gestión de personas
- **Empresas** (/companies): Gestión de organizaciones
- **Pipeline** (/pipeline): Tablero Kanban de oportunidades
- **Tareas** (/tasks): Lista de actividades pendientes
- **Configuración** (/settings): Integraciones y preferencias
- **Chat** (/chat): Asistente IA (donde estamos ahora)`;
};

async function fetchCRMContext(supabase: any) {
  try {
    const [
      contactsResult,
      companiesResult,
      opportunitiesResult,
      activitiesResult,
    ] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name, email, companies(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('companies').select('id').limit(1000),
      supabase.from('opportunities').select('id, title, value, status, stage_id, stages(name)').order('created_at', { ascending: false }).limit(5),
      supabase.from('activities').select('id, title, due_date, priority, completed').order('due_date', { ascending: true }).limit(10),
    ]);

    const contacts = contactsResult.data || [];
    const companies = companiesResult.data || [];
    const opportunities = opportunitiesResult.data || [];
    const activities = activitiesResult.data || [];

    const pendingTasks = activities.filter((a: any) => !a.completed);
    const pipelineValue = opportunities
      .filter((o: any) => o.status === 'open')
      .reduce((sum: number, o: any) => sum + (o.value || 0), 0);

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
    const crmContext = await fetchCRMContext(supabase);
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
