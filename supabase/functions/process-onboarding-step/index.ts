import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONBOARDING_STEPS = [
  {
    step: 0,
    field: "preferred_name",
    prompt: "Pregunta al usuario cómo le gustaría que le llamen. Sé cálido y amigable. Máximo 2 oraciones."
  },
  {
    step: 1,
    field: "company_name",
    prompt: "El usuario ya dio su nombre. Ahora pregunta el nombre de su empresa o negocio. Si es freelancer, acepta eso también. Máximo 2 oraciones."
  },
  {
    step: 2,
    field: "team_size",
    prompt: "Pregunta cuántas personas hay en su equipo de ventas. Ofrece opciones: solo yo, 2-5, 6-20, 20+. Máximo 2 oraciones."
  },
  {
    step: 3,
    field: "industry",
    prompt: "Pregunta en qué industria o sector trabajan. Sugiere algunas opciones comunes: inmobiliaria, tecnología, servicios, retail, etc. Máximo 2 oraciones."
  },
  {
    step: 4,
    field: "sample_data",
    prompt: "Pregunta si quieren que generes datos de ejemplo para explorar el CRM, o si prefieren empezar vacío. Máximo 2 oraciones."
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { user_input, current_step, session_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get or create onboarding progress
    let { data: progress } = await supabase
      .from("onboarding_progress")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!progress) {
      const { data: newProgress, error: createError } = await supabase
        .from("onboarding_progress")
        .insert({ user_id: userId, current_step: 0 })
        .select()
        .single();
      if (createError) throw createError;
      progress = newProgress;
    }

    const stepConfig = ONBOARDING_STEPS[current_step] || ONBOARDING_STEPS[0];
    const collectedData = progress.collected_data || {};
    const conversationHistory = progress.conversation_history || [];

    // If user provided input, save it for current step
    if (user_input && current_step < 5) {
      collectedData[stepConfig.field] = user_input;
    }

    // Build AI prompt
    const systemPrompt = `Eres el asistente de onboarding de un CRM inteligente. Tu personalidad es cálida, profesional y concisa. Responde SIEMPRE en español.

Contexto del usuario hasta ahora: ${JSON.stringify(collectedData)}
Paso actual: ${current_step + 1} de 5

${stepConfig.prompt}

IMPORTANTE: Responde SOLO con el mensaje conversacional. No uses markdown, no uses listas numeradas, no uses emojis excesivos. Máximo 1-2 emojis. Sé natural y breve.`;

    // Call AI for response
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
          ...conversationHistory.slice(-6),
          ...(user_input ? [{ role: "user", content: user_input }] : []),
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "¡Continuemos con la configuración!";

    // Update conversation history
    if (user_input) {
      conversationHistory.push({ role: "user", content: user_input });
    }
    conversationHistory.push({ role: "assistant", content: aiMessage });

    const nextStep = user_input ? Math.min(current_step + 1, 5) : current_step;
    const isCompleted = nextStep >= 5;

    // Determine suggestions for current step
    let suggestions: string[] = [];
    if (!isCompleted) {
      const nextStepConfig = ONBOARDING_STEPS[nextStep];
      if (nextStepConfig?.field === "team_size") {
        suggestions = ["Solo yo", "2-5 personas", "6-20 personas", "Más de 20"];
      } else if (nextStepConfig?.field === "industry") {
        suggestions = ["Inmobiliaria", "Tecnología", "Servicios", "Retail", "Otra"];
      } else if (nextStepConfig?.field === "sample_data") {
        suggestions = ["Sí, generar datos de ejemplo", "No, empezar vacío"];
      }
    }

    // Update progress
    await supabase
      .from("onboarding_progress")
      .update({
        current_step: nextStep,
        completed: isCompleted,
        collected_data: collectedData,
        conversation_history: conversationHistory,
        last_interaction_at: new Date().toISOString(),
        ...(isCompleted ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", progress.id);

    // If completed, update user metadata
    if (isCompleted) {
      await supabase.auth.updateUser({
        data: { onboarding_completed: true, ...collectedData }
      });

      // Update organization name if provided
      if (collectedData.company_name) {
        const { data: teamMember } = await supabase
          .from("team_members")
          .select("organization_id")
          .eq("user_id", userId)
          .eq("is_active", true)
          .single();

        if (teamMember?.organization_id) {
          await supabase
            .from("organizations")
            .update({ name: collectedData.company_name })
            .eq("id", teamMember.organization_id);
        }

        // Update team member name
        if (collectedData.preferred_name) {
          await supabase
            .from("team_members")
            .update({ full_name: collectedData.preferred_name })
            .eq("user_id", userId);
        }
      }
    }

    return new Response(JSON.stringify({
      message: aiMessage,
      current_step: nextStep,
      completed: isCompleted,
      suggestions,
      collected_data: collectedData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("onboarding error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
