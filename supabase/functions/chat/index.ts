import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for function calling
const tools = [
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
          job_title: { type: "string", description: "Cargo o puesto" },
          notes: { type: "string", description: "Notas adicionales" },
        },
        required: ["email"],
      },
    },
  },
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
  // ===== NEW TOOLS =====
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
      name: "search_contacts",
      description: "Busca contactos en el CRM por nombre o email. Usa esta función para encontrar información de un contacto.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Término de búsqueda (nombre, apellido o email)" },
        },
        required: ["query"],
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
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Obtiene un resumen completo del pipeline de ventas con valor por etapa. Usa esta función para reportes o análisis.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
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
- **Buscar**: Puedes buscar contactos y empresas por nombre, email o dominio
- **Pipeline**: Puedes ver el resumen del pipeline y mover oportunidades entre etapas
- **Reuniones**: Puedes programar reuniones y llamadas
- **Notas**: Puedes agregar notas a contactos y empresas
- **Análisis**: Proporcionar insights sobre la actividad comercial basándote en los datos reales
- **Recomendaciones**: Sugerir acciones basadas en el estado actual del CRM

## IMPORTANTE - Funciones disponibles:
- **create_contact**: Crear un nuevo contacto (requiere email)
- **create_company**: Crear una nueva empresa (requiere nombre)
- **create_task**: Crear una tarea o actividad
- **create_opportunity**: Crear una oportunidad de venta en el pipeline
- **update_opportunity_stage**: Mover una oportunidad a otra etapa
- **search_contacts**: Buscar contactos por nombre o email
- **search_companies**: Buscar empresas por nombre o dominio
- **get_pipeline_summary**: Obtener resumen del pipeline con valores por etapa
- **schedule_meeting**: Programar una reunión o llamada
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

// Execute tool calls
async function executeTool(supabase: any, userId: string, toolName: string, args: any): Promise<{ success: boolean; message: string; data?: any }> {
  console.log(`Executing tool: ${toolName} with args:`, args);
  
  try {
    switch (toolName) {
      case "create_contact": {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            email: args.email,
            first_name: args.first_name || null,
            last_name: args.last_name || null,
            phone: args.phone || null,
            job_title: args.job_title || null,
            notes: args.notes || null,
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

      // ===== NEW TOOL IMPLEMENTATIONS =====
      case "create_opportunity": {
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

        // Find contact if provided
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

        // Get default pipeline and first stage
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
        // Find the opportunity
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

        // Find the stage
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

      case "search_contacts": {
        const { data: contacts, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone, job_title, companies(name)')
          .eq('user_id', userId)
          .or(`first_name.ilike.%${args.query}%,last_name.ilike.%${args.query}%,email.ilike.%${args.query}%`)
          .limit(10);

        if (error) throw error;

        if (!contacts || contacts.length === 0) {
          return {
            success: true,
            message: `No se encontraron contactos que coincidan con "${args.query}"`,
            data: [],
          };
        }

        const results = contacts.map((c: any) => 
          `• ${c.first_name || ''} ${c.last_name || ''} - ${c.email}${c.job_title ? ` (${c.job_title})` : ''}${c.companies?.name ? ` @ ${c.companies.name}` : ''}`
        ).join('\n');

        return {
          success: true,
          message: `📇 Encontrados ${contacts.length} contacto(s):\n${results}`,
          data: contacts,
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

      case "get_pipeline_summary": {
        // Get all opportunities with stages
        const { data: opportunities, error } = await supabase
          .from('opportunities')
          .select('id, title, value, status, stages(name, position)')
          .eq('user_id', userId)
          .eq('status', 'open');

        if (error) throw error;

        if (!opportunities || opportunities.length === 0) {
          return {
            success: true,
            message: `📊 Pipeline vacío. No hay oportunidades activas.`,
            data: { total: 0, byStage: {} },
          };
        }

        // Group by stage
        const byStage: Record<string, { count: number; value: number }> = {};
        let totalValue = 0;

        for (const opp of opportunities) {
          const stageName = opp.stages?.name || 'Sin etapa';
          if (!byStage[stageName]) {
            byStage[stageName] = { count: 0, value: 0 };
          }
          byStage[stageName].count++;
          byStage[stageName].value += opp.value || 0;
          totalValue += opp.value || 0;
        }

        const summary = Object.entries(byStage)
          .map(([stage, data]) => `• ${stage}: ${data.count} deal(s) - $${data.value.toLocaleString()}`)
          .join('\n');

        return {
          success: true,
          message: `📊 **Resumen del Pipeline**\n\n${summary}\n\n**Total:** ${opportunities.length} oportunidades por $${totalValue.toLocaleString()}`,
          data: { total: totalValue, count: opportunities.length, byStage },
        };
      }

      case "schedule_meeting": {
        // Find contact if provided
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

        // Build due_date from date and time
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

      case "add_note": {
        const entityType = args.entity_type || 'contact';
        
        if (entityType === 'contact') {
          // Find and update contact
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
          // Find and update company
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

    console.log("Calling Lovable AI Gateway with", messages.length, "messages and tools");

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
        stream: false, // Non-streaming first to handle tool calls
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
    // Re-call with streaming since first call was non-streaming
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
