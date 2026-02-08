import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    console.log(`[CMD] Interpreting command: "${query}"`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Also do a parallel DB search
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    // Parallel: AI interpretation + DB search
    const [aiResult, searchResults] = await Promise.all([
      interpretWithAI(query, LOVABLE_API_KEY),
      searchDatabase(query, supabase),
    ]);

    // If AI says search, merge with DB results
    if (aiResult.intent === 'search' && searchResults.length > 0) {
      aiResult.search_results = searchResults;
    }

    // If no AI results but DB has results, return search
    if (aiResult.confidence < 50 && searchResults.length > 0) {
      aiResult.intent = 'search';
      aiResult.search_results = searchResults;
      aiResult.description = `Resultados para "${query}"`;
      aiResult.confidence = 75;
    }

    console.log(`[CMD] Result: intent=${aiResult.intent}, confidence=${aiResult.confidence}`);

    return new Response(
      JSON.stringify(aiResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('[CMD] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function interpretWithAI(query: string, apiKey: string) {
  const systemPrompt = `Eres un intérprete de comandos para un CRM en español. Analiza el comando en lenguaje natural.

COMANDO: "${query}"

RUTAS DISPONIBLES:
- /dashboard - Dashboard principal
- /contacts - Lista de contactos
- /companies - Lista de empresas  
- /pipeline - Pipeline de ventas (kanban)
- /tasks - Tareas y actividades
- /conversations - Conversaciones omnicanal
- /team - Equipo
- /projects - Proyectos
- /settings - Configuración
- /data-management - Gestión de datos

INTENCIONES POSIBLES:
1. navigate - Ir a una página del CRM
2. create - Crear entidad (contact, company, opportunity, task)
3. search - Buscar algo en el CRM
4. filter - Aplicar filtros
5. execute_action - Ejecutar acción directa

RESPONDE ÚNICAMENTE en JSON válido (sin markdown, sin backticks):
{
  "intent": "navigate|create|search|filter|execute_action",
  "params": {},
  "confidence": number (0-100),
  "description": "descripción corta en español",
  "suggested_route": "ruta o null"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
      }),
    });

    if (!response.ok) {
      console.error("[CMD] AI error:", response.status);
      return { intent: "search", params: { query }, confidence: 30, description: `Buscando: ${query}` };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("[CMD] Parse error:", e);
    return { intent: "search", params: { query }, confidence: 30, description: `Buscando: ${query}` };
  }
}

async function searchDatabase(query: string, supabase: any) {
  const searchTerm = `%${query}%`;
  const results: any[] = [];

  try {
    const [contacts, companies, opportunities] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name, email')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(5),
      supabase.from('companies').select('id, name, industry')
        .or(`name.ilike.${searchTerm},industry.ilike.${searchTerm}`)
        .limit(5),
      supabase.from('opportunities').select('id, title, value')
        .ilike('title', searchTerm)
        .limit(5),
    ]);

    contacts.data?.forEach((c: any) => results.push({
      type: 'contact', id: c.id,
      title: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      subtitle: c.email, route: `/contacts/${c.id}`
    }));

    companies.data?.forEach((c: any) => results.push({
      type: 'company', id: c.id,
      title: c.name, subtitle: c.industry || 'Empresa',
      route: `/companies/${c.id}`
    }));

    opportunities.data?.forEach((o: any) => results.push({
      type: 'opportunity', id: o.id,
      title: o.title, subtitle: `$${o.value?.toLocaleString() || 0}`,
      route: `/pipeline`
    }));
  } catch (e) {
    console.error("[CMD] Search error:", e);
  }

  return results;
}
