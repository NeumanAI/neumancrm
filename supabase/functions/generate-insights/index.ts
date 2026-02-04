import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DealAtRisk {
  id: string;
  title: string;
  value: number;
  days_inactive: number;
  company_name: string | null;
  reason: string;
}

interface ContactFollowUp {
  id: string;
  name: string;
  email: string;
  company_name: string | null;
  days_since_contact: number;
  reason: string;
}

interface InsightsResponse {
  deals_at_risk: DealAtRisk[];
  contacts_followup: ContactFollowUp[];
  suggestions: string[];
  pipeline_health: {
    total_value: number;
    win_rate: number;
    avg_deal_cycle: number;
    deals_won_this_month: number;
  };
  generated_at: string;
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
    console.log("Generating insights for user:", userId);

    // Create service role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch opportunities with company info
    const { data: opportunities } = await supabase
      .from("opportunities")
      .select(`
        id, title, value, status, created_at, updated_at, expected_close_date,
        companies(name)
      `)
      .eq("user_id", userId);

    // Fetch recent timeline entries
    const { data: recentActivity } = await supabase
      .from("timeline_entries")
      .select("id, contact_id, opportunity_id, occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Fetch contacts with company info
    const { data: contacts } = await supabase
      .from("contacts")
      .select(`
        id, first_name, last_name, email, last_contacted_at, created_at,
        companies(name)
      `)
      .eq("user_id", userId);

    // Calculate deals at risk (no activity in 7+ days, still open)
    const now = new Date();
    const dealsAtRisk: DealAtRisk[] = [];

    const openDeals = (opportunities || []).filter(o => o.status === "open");
    
    for (const deal of openDeals) {
      const lastActivity = (recentActivity || [])
        .filter(a => a.opportunity_id === deal.id)
        .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())[0];

      const lastActivityDate = lastActivity 
        ? new Date(lastActivity.occurred_at) 
        : new Date(deal.updated_at);
      
      const daysInactive = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysInactive >= 7) {
        dealsAtRisk.push({
          id: deal.id,
          title: deal.title,
          value: Number(deal.value) || 0,
          days_inactive: daysInactive,
          company_name: (deal.companies as any)?.name || null,
          reason: daysInactive >= 14 
            ? `Sin actividad por ${daysInactive} días - riesgo alto`
            : `${daysInactive} días sin contacto`,
        });
      }
    }

    // Sort by value (highest first)
    dealsAtRisk.sort((a, b) => b.value - a.value);

    // Calculate contacts needing follow-up
    const contactsFollowUp: ContactFollowUp[] = [];
    
    for (const contact of contacts || []) {
      const lastContactDate = contact.last_contacted_at 
        ? new Date(contact.last_contacted_at) 
        : new Date(contact.created_at);
      
      const daysSinceContact = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceContact >= 14) {
        contactsFollowUp.push({
          id: contact.id,
          name: `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || contact.email,
          email: contact.email,
          company_name: (contact.companies as any)?.name || null,
          days_since_contact: daysSinceContact,
          reason: daysSinceContact >= 30 
            ? "Contacto frío - más de 30 días sin interacción"
            : `${daysSinceContact} días sin contacto`,
        });
      }
    }

    // Sort by days (most urgent first)
    contactsFollowUp.sort((a, b) => b.days_since_contact - a.days_since_contact);

    // Calculate pipeline health
    const allDeals = opportunities || [];
    const wonDeals = allDeals.filter(o => o.status === "won");
    const lostDeals = allDeals.filter(o => o.status === "lost");
    const closedDeals = wonDeals.length + lostDeals.length;
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const wonThisMonth = wonDeals.filter(d => new Date(d.updated_at) >= startOfMonth).length;

    const totalValue = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const winRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0;

    // Calculate average deal cycle for won deals
    let avgCycle = 0;
    if (wonDeals.length > 0) {
      const cycles = wonDeals.map(d => {
        const created = new Date(d.created_at);
        const closed = new Date(d.updated_at);
        return Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
      avgCycle = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length);
    }

    // Generate AI suggestions
    let suggestions: string[] = [];

    if (LOVABLE_API_KEY) {
      const context = {
        open_deals: openDeals.length,
        deals_at_risk: dealsAtRisk.length,
        total_pipeline: totalValue,
        win_rate: winRate,
        contacts_cold: contactsFollowUp.length,
      };

      const prompt = `Eres un asistente de ventas. Analiza estos datos del CRM y genera 3-4 sugerencias accionables y específicas:

Datos:
- ${context.open_deals} deals abiertos por valor de $${context.total_pipeline.toLocaleString()}
- ${context.deals_at_risk} deals en riesgo (sin actividad reciente)
- Tasa de conversión: ${context.win_rate}%
- ${context.contacts_cold} contactos sin interacción en 2+ semanas

Genera sugerencias cortas, directas y accionables. Por ejemplo:
- "Prioriza el deal X de $50K que lleva 10 días sin seguimiento"
- "Agenda llamadas con los 3 contactos más importantes que no has contactado"

Responde SOLO con un array JSON de strings, máximo 4 sugerencias. Sin markdown.`;

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
              { role: "system", content: "Eres un asistente de ventas conciso. Responde solo con JSON." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "[]";
          const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          suggestions = JSON.parse(cleanContent);
        }
      } catch (err) {
        console.error("AI suggestions error:", err);
      }
    }

    // Fallback suggestions if AI fails
    if (suggestions.length === 0) {
      if (dealsAtRisk.length > 0) {
        suggestions.push(`Tienes ${dealsAtRisk.length} deals en riesgo. Prioriza el seguimiento de los de mayor valor.`);
      }
      if (contactsFollowUp.length > 0) {
        suggestions.push(`${contactsFollowUp.length} contactos necesitan follow-up. Agenda reuniones esta semana.`);
      }
      if (winRate < 30) {
        suggestions.push("Tu tasa de conversión está baja. Revisa tu proceso de calificación de leads.");
      }
      if (suggestions.length === 0) {
        suggestions.push("¡Buen trabajo! Tu pipeline está saludable. Mantén el ritmo de seguimiento.");
      }
    }

    const response: InsightsResponse = {
      deals_at_risk: dealsAtRisk.slice(0, 5),
      contacts_followup: contactsFollowUp.slice(0, 5),
      suggestions,
      pipeline_health: {
        total_value: totalValue,
        win_rate: winRate,
        avg_deal_cycle: avgCycle,
        deals_won_this_month: wonThisMonth,
      },
      generated_at: new Date().toISOString(),
    };

    console.log("Insights generated successfully");

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
