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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ suggestions: [], error: "No auth" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[CoWorker] Loading suggestions for user:", user.id);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    // Parallel queries
    const [dealsAtRisk, overdueTasks, recentDeals] = await Promise.all([
      // Deals sin actividad 7+ días
      supabase.from('opportunities')
        .select('id, title, value, updated_at, currency')
        .eq('status', 'open')
        .lt('updated_at', sevenDaysAgo)
        .order('value', { ascending: false })
        .limit(3),
      
      // Tareas vencidas
      supabase.from('activities')
        .select('id, title, due_date, priority, type')
        .eq('completed', false)
        .not('due_date', 'is', null)
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5),
      
      // Deals recientes con alto valor (hot)
      supabase.from('opportunities')
        .select('id, title, value, updated_at, currency, probability')
        .eq('status', 'open')
        .gte('probability', 60)
        .gte('updated_at', threeDaysAgo)
        .order('value', { ascending: false })
        .limit(3),
    ]);

    const suggestions: any[] = [];

    // Deals en riesgo
    (dealsAtRisk.data || []).forEach(deal => {
      const daysInactive = Math.floor((Date.now() - new Date(deal.updated_at).getTime()) / 86400000);
      const formatted = new Intl.NumberFormat('es', { style: 'currency', currency: deal.currency || 'USD', maximumFractionDigits: 0 }).format(Number(deal.value) || 0);
      
      suggestions.push({
        id: `risk-${deal.id}`,
        type: 'urgent',
        title: `Deal en riesgo: ${deal.title}`,
        description: `Sin actividad hace ${daysInactive} días. Valor: ${formatted}`,
        action: 'Contactar ahora',
        action_data: { type: 'navigate', route: '/pipeline' },
        impact: 'high',
        confidence: 90,
        entity_type: 'opportunity',
        entity_id: deal.id,
      });
    });

    // Tareas vencidas
    if (overdueTasks.data && overdueTasks.data.length > 0) {
      const count = overdueTasks.data.length;
      const oldest = overdueTasks.data[0];
      const daysOverdue = Math.floor((Date.now() - new Date(oldest.due_date).getTime()) / 86400000);

      suggestions.push({
        id: 'overdue-tasks',
        type: 'urgent',
        title: `${count} tarea${count > 1 ? 's' : ''} vencida${count > 1 ? 's' : ''}`,
        description: `La más antigua: "${oldest.title}" (${daysOverdue} día${daysOverdue > 1 ? 's' : ''} de retraso)`,
        action: 'Ver tareas',
        action_data: { type: 'navigate', route: '/tasks' },
        impact: 'medium',
        confidence: 100,
      });
    }

    // Deals hot
    (recentDeals.data || []).forEach(deal => {
      const formatted = new Intl.NumberFormat('es', { style: 'currency', currency: deal.currency || 'USD', maximumFractionDigits: 0 }).format(Number(deal.value) || 0);
      
      suggestions.push({
        id: `hot-${deal.id}`,
        type: 'important',
        title: `Oportunidad caliente: ${deal.title}`,
        description: `Prob: ${deal.probability}% · Valor: ${formatted}`,
        action: 'Ver deal',
        action_data: { type: 'navigate', route: '/pipeline' },
        impact: 'high',
        confidence: 85,
        entity_type: 'opportunity',
        entity_id: deal.id,
      });
    });

    // If no suggestions, add a positive one
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'all-good',
        type: 'suggestion',
        title: '¡Todo al día! 🎉',
        description: 'No hay acciones urgentes. Buen trabajo.',
        action: 'Ver dashboard',
        action_data: { type: 'navigate', route: '/dashboard' },
        impact: 'low',
        confidence: 100,
      });
    }

    console.log(`[CoWorker] Generated ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, 5), total_count: suggestions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('[CoWorker] Error:', error);
    return new Response(
      JSON.stringify({ suggestions: [], error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
