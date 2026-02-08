import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { input, entity, current_step, collected_data, conversation_history } = await req.json();
    
    console.log(`[NLI] Processing input for entity: ${entity}, step: ${current_step}`);
    console.log(`[NLI] Collected so far:`, JSON.stringify(collected_data));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Eres un asistente experto en extraer datos estructurados de conversaciones naturales para un CRM.
Responde SIEMPRE en español.

CONTEXTO:
- Estamos creando un: ${entity}
- Datos recolectados hasta ahora: ${JSON.stringify(collected_data || {})}
- Paso actual: ${current_step}

INPUT DEL USUARIO: "${input}"

TAREA:
1. Extrae TODOS los datos relevantes del input (nombres, emails, empresas, cargos, teléfonos, valores monetarios, etc.)
2. Determina si ya tienes suficiente información mínima
3. Si falta información CRÍTICA, genera la siguiente pregunta amigable
4. Si tienes suficiente, genera un mensaje de confirmación con los datos

INFORMACIÓN MÍNIMA REQUERIDA:
- contact: email O (first_name + last_name) — mínimo uno de estos
- company: name — obligatorio
- opportunity: title — obligatorio

MAPEO DE CAMPOS:
- contact: first_name, last_name, email, phone, job_title, company_name, notes
- company: name, domain, website, industry, phone, city, country, description
- opportunity: title, value (número), company_name, contact_name, expected_close_date, description

RESPONDE ÚNICAMENTE en JSON válido (sin markdown, sin backticks):
{
  "extracted_data": {},
  "is_complete": boolean,
  "next_question": "string o null",
  "confirmation_message": "string o null (resumen legible de los datos cuando is_complete=true)",
  "confidence": number (0-100),
  "missing_fields": ["campos que faltan"]
}`;

    const messages = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history for context
    if (conversation_history && Array.isArray(conversation_history)) {
      conversation_history.forEach((msg: any) => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    messages.push({ role: "user", content: input });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes, intenta en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("[NLI] AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let aiResponse;
    
    try {
      const content = data.choices[0].message.content;
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiResponse = JSON.parse(cleaned);
      console.log("[NLI] Parsed response:", JSON.stringify(aiResponse));
    } catch (e) {
      console.error("[NLI] Error parsing AI response:", e);
      aiResponse = {
        extracted_data: {},
        is_complete: false,
        next_question: "No entendí bien. ¿Puedes darme más detalles?",
        confidence: 30,
        missing_fields: []
      };
    }

    // Merge collected data
    if (aiResponse.is_complete) {
      const enrichedData = { ...collected_data, ...aiResponse.extracted_data };
      return new Response(
        JSON.stringify({ ...aiResponse, enriched_data: enrichedData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(aiResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('[NLI] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
