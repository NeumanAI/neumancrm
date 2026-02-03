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
- **Crear registros**: Puedes crear contactos, empresas y tareas usando las funciones disponibles
- **Análisis**: Proporcionar insights sobre la actividad comercial basándote en los datos reales
- **Recomendaciones**: Sugerir acciones basadas en el estado actual del CRM

## IMPORTANTE - Creación de registros:
Cuando el usuario te pida crear un contacto, empresa o tarea, DEBES usar las funciones correspondientes:
- Para crear contactos: usa la función create_contact
- Para crear empresas: usa la función create_company  
- Para crear tareas: usa la función create_task

Pregunta los datos necesarios si el usuario no los proporciona (especialmente el email para contactos y el nombre para empresas).

## Directrices:
- Responde siempre en español
- Usa formato markdown para mejor legibilidad (negritas, listas, emojis)
- Sé conciso pero útil
- Cuando el usuario pregunte por datos, usa la información real proporcionada arriba
- Si el usuario pregunta algo que no puedes hacer, sugiere alternativas
- Mantén un tono profesional pero cercano

## Navegación del CRM:
- **Dashboard** (/dashboard): Vista general con estadísticas
- **Contactos** (/contacts): Gestión de personas
- **Empresas** (/companies): Gestión de organizaciones
- **Pipeline** (/pipeline): Tablero Kanban de oportunidades
- **Tareas** (/tasks): Lista de actividades pendientes
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

// Get user ID from auth token
async function getUserId(supabase: any): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error("Error getting user:", error);
      return null;
    }
    return user.id;
  } catch (error) {
    console.error("Error in getUserId:", error);
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
    const userId = await getUserId(supabase);
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
        model: "google/gemini-3-flash-preview",
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
    
    // Check if AI wants to call tools
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      console.log("AI requested tool calls:", choice.message.tool_calls);
      
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
          model: "google/gemini-3-flash-preview",
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
    // Re-call with streaming since first call was non-streaming
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
