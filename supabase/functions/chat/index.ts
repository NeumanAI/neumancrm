import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `Eres un asistente de CRM inteligente y amigable. Tu objetivo es ayudar a los usuarios a gestionar sus contactos, empresas, oportunidades de venta y tareas de manera eficiente.

## Tus capacidades:
- **Gestión de Contactos**: Ayudar a crear, buscar y organizar contactos
- **Gestión de Empresas**: Información sobre empresas y sus relaciones con contactos
- **Pipeline de Ventas**: Explicar etapas del pipeline y cómo mover oportunidades
- **Tareas y Actividades**: Ayudar a organizar y priorizar el trabajo diario
- **Análisis**: Proporcionar insights sobre la actividad comercial

## Directrices:
- Responde siempre en español
- Usa formato markdown para mejor legibilidad (negritas, listas, emojis)
- Sé conciso pero útil
- Si el usuario pregunta algo que no puedes hacer, sugiere alternativas
- Mantén un tono profesional pero cercano

## Navegación del CRM:
- **Dashboard**: Vista general con estadísticas
- **Contactos**: Gestión de personas
- **Empresas**: Gestión de organizaciones
- **Pipeline**: Tablero Kanban de oportunidades
- **Tareas**: Lista de actividades pendientes
- **Chat**: Asistente IA (donde estamos ahora)`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling Lovable AI Gateway with", messages.length, "messages");

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
        stream: true,
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

    // Return streaming response
    return new Response(response.body, {
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
