import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TaskSummary {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  type: string;
}

interface DealAlert {
  id: string;
  title: string;
  value: number;
  days_inactive: number;
  company_name: string | null;
}

interface DailyBriefResponse {
  greeting: string;
  date: string;
  overdue_tasks: TaskSummary[];
  today_tasks: TaskSummary[];
  deals_alert: DealAlert[];
  new_interactions: number;
  ai_summary: string;
  suggested_actions: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Create client with user's token to get their identity
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log("Generating daily brief for user:", userId);

    // Create service role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Fetch overdue tasks
    const { data: overdueTasks } = await supabase
      .from("activities")
      .select("id, title, priority, due_date, type")
      .eq("user_id", userId)
      .eq("completed", false)
      .lt("due_date", today.toISOString())
      .order("due_date", { ascending: true })
      .limit(10);

    // Fetch today's tasks
    const { data: todayTasks } = await supabase
      .from("activities")
      .select("id, title, priority, due_date, type")
      .eq("user_id", userId)
      .eq("completed", false)
      .gte("due_date", today.toISOString())
      .lt("due_date", todayEnd.toISOString())
      .order("priority", { ascending: true })
      .limit(10);

    // Fetch deals with no recent activity (7+ days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const { data: opportunities } = await supabase
      .from("opportunities")
      .select(`
        id, title, value, updated_at,
        companies(name)
      `)
      .eq("user_id", userId)
      .eq("status", "open")
      .lt("updated_at", sevenDaysAgo.toISOString())
      .order("value", { ascending: false })
      .limit(5);

    const dealsAlert: DealAlert[] = (opportunities || []).map(opp => ({
      id: opp.id,
      title: opp.title,
      value: Number(opp.value) || 0,
      days_inactive: Math.floor((now.getTime() - new Date(opp.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
      company_name: (opp.companies as any)?.name || null,
    }));

    // Count new interactions in last 24h
    const { count: newInteractions } = await supabase
      .from("timeline_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("occurred_at", yesterday.toISOString());

    // Generate greeting based on time
    const hour = now.getHours();
    let greeting = "Buenos días";
    if (hour >= 12 && hour < 18) greeting = "Buenas tardes";
    if (hour >= 18) greeting = "Buenas noches";

    // Generate AI summary
    let aiSummary = "";
    let suggestedActions: string[] = [];

    if (LOVABLE_API_KEY) {
      const context = {
        overdue_count: overdueTasks?.length || 0,
        today_count: todayTasks?.length || 0,
        deals_at_risk: dealsAlert.length,
        total_value_at_risk: dealsAlert.reduce((sum, d) => sum + d.value, 0),
        new_interactions: newInteractions || 0,
      };

      const prompt = `Eres un asistente de ventas personal. Genera un resumen breve del día para el usuario.

Datos de hoy:
- ${context.overdue_count} tareas vencidas
- ${context.today_count} tareas para hoy
- ${context.deals_at_risk} deals en riesgo (sin actividad en 7+ días) por $${context.total_value_at_risk.toLocaleString()}
- ${context.new_interactions} nuevas interacciones en últimas 24h

Genera:
1. "summary": Un párrafo corto (2-3 oraciones) describiendo las prioridades del día
2. "actions": Array de 2-3 acciones específicas y accionables

Responde en JSON: { "summary": "...", "actions": ["...", "..."] }
Sin markdown, solo JSON.`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Eres un asistente de productividad conciso. Responde solo con JSON." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "{}";
          const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(cleanContent);
          aiSummary = parsed.summary || "";
          suggestedActions = parsed.actions || [];
        }
      } catch (err) {
        console.error("AI brief error:", err);
      }
    }

    // Fallback summary
    if (!aiSummary) {
      const parts = [];
      if ((overdueTasks?.length || 0) > 0) {
        parts.push(`Tienes ${overdueTasks?.length} tareas vencidas que requieren atención inmediata.`);
      }
      if (dealsAlert.length > 0) {
        parts.push(`${dealsAlert.length} deals necesitan seguimiento urgente.`);
      }
      if ((todayTasks?.length || 0) > 0) {
        parts.push(`Hay ${todayTasks?.length} tareas programadas para hoy.`);
      }
      aiSummary = parts.join(" ") || "Tu agenda está despejada. Buen momento para prospección.";
    }

    // Fallback actions
    if (suggestedActions.length === 0) {
      if ((overdueTasks?.length || 0) > 0) {
        suggestedActions.push("Completa las tareas vencidas antes del mediodía");
      }
      if (dealsAlert.length > 0) {
        suggestedActions.push(`Contacta al cliente del deal "${dealsAlert[0]?.title}" hoy`);
      }
      if ((todayTasks?.length || 0) > 0) {
        suggestedActions.push("Revisa y prioriza las tareas del día");
      }
      if (suggestedActions.length === 0) {
        suggestedActions.push("Dedica tiempo a prospección de nuevos leads");
      }
    }

    const response: DailyBriefResponse = {
      greeting,
      date: now.toISOString(),
      overdue_tasks: (overdueTasks || []) as TaskSummary[],
      today_tasks: (todayTasks || []) as TaskSummary[],
      deals_alert: dealsAlert,
      new_interactions: newInteractions || 0,
      ai_summary: aiSummary,
      suggested_actions: suggestedActions,
    };

    console.log("Daily brief generated successfully");

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate daily brief error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
