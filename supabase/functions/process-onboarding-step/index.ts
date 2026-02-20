import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── 6 PASOS DEL ONBOARDING ──────────────────────────────────
const STEPS = [
  {
    step: 0,
    field: "preferred_name",
    systemPrompt: `Eres el asistente de onboarding de NeumanCRM. 
Saluda cálidamente al nuevo usuario y pregunta su nombre. 
Sé breve, amigable y usa 1 emoji máximo. 
Responde SOLO en español. Máximo 2 oraciones.`,
    suggestions: [],
  },
  {
    step: 1,
    field: "whatsapp",
    systemPrompt: `El usuario se llama {preferred_name}. 
Salúdalo por su nombre y pide su número de WhatsApp con código de país.
Ejemplo: +57 300 123 4567
Sé breve y amigable. Máximo 2 oraciones.`,
    suggestions: [],
  },
  {
    step: 2,
    field: "country",
    systemPrompt: `Pregunta al usuario desde qué país opera su negocio principalmente.
Sé breve. Máximo 1 oración.`,
    suggestions: [
      "🇨🇴 Colombia", "🇲🇽 México", "🇦🇷 Argentina", "🇪🇸 España",
      "🇵🇪 Perú", "🇨🇱 Chile", "🌎 Otro país",
    ],
  },
  {
    step: 3,
    field: "company_name",
    systemPrompt: `Pregunta el nombre de la empresa u organización del usuario.
Si trabaja solo, acepta "Soy freelancer" o su nombre personal.
Sé breve. Máximo 1 oración.`,
    suggestions: [],
  },
  {
    step: 4,
    field: "industry",
    systemPrompt: `Pregunta en qué industria o sector trabaja.
Sé breve. Máximo 1 oración.`,
    suggestions: [
      "🏗 Construcción / Inmobiliaria", "💼 Servicios profesionales",
      "🛒 Comercio / Ventas", "💻 Tecnología",
      "🏥 Salud", "📚 Educación", "📦 Otro sector",
    ],
  },
  {
    step: 5,
    field: "first_goal",
    systemPrompt: `Última pregunta. Pregunta qué quiere lograr primero con el CRM.
Sé breve y entusiasta. Máximo 1 oración.`,
    suggestions: [
      "📋 Organizar mis contactos", "📈 Hacer seguimiento a ventas",
      "🤖 Automatizar comunicaciones", "📊 Ver mis métricas",
    ],
  },
];

const COUNTRY_CODES: Record<string, string> = {
  "colombia": "CO", "méxico": "MX", "mexico": "MX",
  "argentina": "AR", "españa": "ES", "espana": "ES",
  "perú": "PE", "peru": "PE", "chile": "CL",
  "venezuela": "VE", "ecuador": "EC", "bolivia": "BO",
  "uruguay": "UY", "paraguay": "PY", "panamá": "PA",
  "costa rica": "CR", "guatemala": "GT", "honduras": "HN",
};

function getCountryCode(country: string): string {
  const normalized = country.toLowerCase()
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[^\w\s]/g, "")
    .trim();
  for (const [key, code] of Object.entries(COUNTRY_CODES)) {
    if (normalized.includes(key)) return code;
  }
  return "XX";
}

function getPipelineForIndustry(industry: string): string[] {
  const i = industry.toLowerCase();
  if (i.includes("inmobi") || i.includes("construc")) {
    return ["Prospecto", "Visita al proyecto", "Propuesta", "Negociación", "Cierre"];
  }
  if (i.includes("salud") || i.includes("médic")) {
    return ["Consulta inicial", "Diagnóstico", "Propuesta de tratamiento", "Seguimiento", "Alta"];
  }
  if (i.includes("tecnolog")) {
    return ["Lead", "Demo", "Propuesta técnica", "Negociación", "Contrato"];
  }
  if (i.includes("educac")) {
    return ["Interesado", "Inscripción", "Matrícula", "Activo", "Egresado"];
  }
  return ["Prospecto", "Contactado", "Propuesta enviada", "Negociación", "Cerrado"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { user_input, current_step } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get or create progress
    let { data: progress } = await supabase
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!progress) {
      const { data: newProgress, error: createError } = await supabase
        .from("onboarding_progress")
        .insert({
          user_id: userId,
          current_step: 0,
          total_steps: 6,
          collected_data: {},
          conversation_history: [],
          registered_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (createError) throw createError;
      progress = newProgress;
    }

    const stepConfig = STEPS[current_step] ?? STEPS[0];
    const collectedData: Record<string, string> = progress.collected_data || {};
    const conversationHistory = progress.conversation_history || [];

    // Save user input
    if (user_input && current_step <= 5) {
      collectedData[stepConfig.field] = user_input;
      if (stepConfig.field === "country") {
        collectedData.country_code = getCountryCode(user_input);
      }
    }

    // Build system prompt
    const systemPromptFinal = stepConfig.systemPrompt
      .replace("{preferred_name}", collectedData.preferred_name ?? "");

    const systemPrompt = `${systemPromptFinal}

CONTEXTO DEL USUARIO:
${Object.entries(collectedData).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

REGLAS:
- Responde SIEMPRE en español
- Sé cálido, breve y profesional
- Máximo 2 oraciones
- Sin markdown, sin listas numeradas
- Usa el nombre del usuario si ya lo tienes`;

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory.slice(-8),
          ...(user_input ? [{ role: "user", content: user_input }] : []),
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content ?? "¡Sigamos!";

    // Update history
    if (user_input) conversationHistory.push({ role: "user", content: user_input });
    conversationHistory.push({ role: "assistant", content: aiMessage });

    const nextStep = user_input ? Math.min(current_step + 1, 6) : current_step;
    const isCompleted = nextStep >= 6;

    // Suggestions for next step
    const nextStepConfig = STEPS[nextStep];
    const suggestions = nextStepConfig?.suggestions ?? [];

    // Save progress
    const updatePayload: Record<string, unknown> = {
      current_step: nextStep,
      total_steps: 6,
      completed: isCompleted,
      collected_data: collectedData,
      conversation_history: conversationHistory,
      last_interaction_at: new Date().toISOString(),
      preferred_name: collectedData.preferred_name ?? progress.preferred_name ?? null,
      whatsapp: collectedData.whatsapp ?? progress.whatsapp ?? null,
      country: collectedData.country ?? progress.country ?? null,
      country_code: collectedData.country_code ?? progress.country_code ?? null,
      company_name: collectedData.company_name ?? progress.company_name ?? null,
      industry: collectedData.industry ?? progress.industry ?? null,
      first_goal: collectedData.first_goal ?? progress.first_goal ?? null,
    };

    if (isCompleted) {
      updatePayload.completed_at = new Date().toISOString();
    }

    await supabase
      .from("onboarding_progress")
      .update(updatePayload)
      .eq("id", progress.id);

    // ── On completion: automatic setup ───────────────────────
    let setupSteps: Array<{ label: string; done: boolean }> = [];

    if (isCompleted) {
      setupSteps = [
        { label: `Creando tu espacio "${collectedData.company_name ?? "Mi empresa"}"`, done: false },
        { label: "Configurando pipeline de ventas", done: false },
        { label: "Preparando categorías para tu industria", done: false },
        { label: "Activando tu plan gratuito — 14 días con IA completa", done: false },
      ];

      // 1. Update user metadata
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          display_name: collectedData.preferred_name,
          whatsapp: collectedData.whatsapp,
          country: collectedData.country,
        },
      });

      // 2. Get user's org
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (teamMember?.organization_id) {
        const orgId = teamMember.organization_id;
        const industry = collectedData.industry ?? "";

        // 3. Update organization
        await supabase
          .from("organizations")
          .update({
            name: collectedData.company_name ?? "Mi empresa",
            industry: industry,
            country: collectedData.country ?? null,
            country_code: collectedData.country_code ?? null,
            team_size: collectedData.team_size ?? null,
            first_goal: collectedData.first_goal ?? null,
          })
          .eq("id", orgId);

        // 4. Update team member
        await supabase
          .from("team_members")
          .update({
            display_name: collectedData.preferred_name ?? null,
            full_name: collectedData.preferred_name ?? null,
            whatsapp: collectedData.whatsapp ?? null,
          })
          .eq("user_id", userId);

        // 5. Create industry-specific pipeline
        const pipelineStages = getPipelineForIndustry(industry);
        
        // Check if user already has a pipeline
        const { data: existingPipeline } = await supabase
          .from("pipelines")
          .select("id")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (existingPipeline?.id) {
          // Delete existing stages and recreate
          await supabase.from("stages").delete().eq("pipeline_id", existingPipeline.id);
          
          const stageColors = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#22c55e"];
          for (let i = 0; i < pipelineStages.length; i++) {
            await supabase.from("stages").insert({
              pipeline_id: existingPipeline.id,
              name: pipelineStages[i],
              position: i,
              probability: Math.round(((i + 1) / pipelineStages.length) * 100),
              color: stageColors[i] ?? "#6366f1",
              is_closed_won: i === pipelineStages.length - 1,
            });
          }
        }

        // 6. Update onboarding_progress with organization_id
        await supabase
          .from("onboarding_progress")
          .update({ organization_id: orgId })
          .eq("id", progress.id);
      }

      setupSteps = setupSteps.map(s => ({ ...s, done: true }));
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      current_step: nextStep,
      completed: isCompleted,
      suggestions,
      collected_data: collectedData,
      setup_steps: setupSteps,
      first_goal: collectedData.first_goal ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("onboarding error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
