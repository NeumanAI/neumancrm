import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Running notification check...");

    // Get all users with notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*');

    if (!preferences || preferences.length === 0) {
      console.log("No users with notification preferences");
      return new Response(
        JSON.stringify({ message: "No notification preferences found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsCreated = 0;

    for (const pref of preferences) {
      // Check for upcoming tasks
      if (pref.task_reminders) {
        const reminderThreshold = new Date();
        reminderThreshold.setHours(reminderThreshold.getHours() + (pref.reminder_hours || 24));

        const { data: upcomingTasks } = await supabase
          .from('activities')
          .select('id, title, due_date')
          .eq('user_id', pref.user_id)
          .eq('completed', false)
          .not('due_date', 'is', null)
          .lte('due_date', reminderThreshold.toISOString())
          .gte('due_date', new Date().toISOString());

        if (upcomingTasks && upcomingTasks.length > 0) {
          for (const task of upcomingTasks) {
            // Check if notification already exists for this task
            const { data: existingNotification } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', pref.user_id)
              .eq('entity_type', 'task')
              .eq('entity_id', task.id)
              .eq('type', 'task_due')
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .single();

            if (!existingNotification) {
              const dueDate = new Date(task.due_date);
              const hoursUntilDue = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60));

              await supabase.from('notifications').insert({
                user_id: pref.user_id,
                type: 'task_due',
                title: 'Tarea próxima a vencer',
                message: `"${task.title}" vence en ${hoursUntilDue} hora${hoursUntilDue !== 1 ? 's' : ''}`,
                entity_type: 'task',
                entity_id: task.id,
                action_url: '/tasks',
                priority: hoursUntilDue <= 2 ? 'urgent' : hoursUntilDue <= 12 ? 'high' : 'normal',
              });

              notificationsCreated++;
            }
          }
        }
      }

      // Check for deal updates (opportunities created in last hour)
      if (pref.deal_updates) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: recentOpportunities } = await supabase
          .from('opportunities')
          .select('id, title, value, stages(name)')
          .eq('user_id', pref.user_id)
          .gte('updated_at', oneHourAgo);

        if (recentOpportunities && recentOpportunities.length > 0) {
          for (const opp of recentOpportunities) {
            // Check for existing notification
            const { data: existingNotification } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', pref.user_id)
              .eq('entity_type', 'opportunity')
              .eq('entity_id', opp.id)
              .gte('created_at', oneHourAgo)
              .single();

            if (!existingNotification) {
              await supabase.from('notifications').insert({
                user_id: pref.user_id,
                type: 'deal_update',
                title: 'Oportunidad actualizada',
                message: `"${opp.title}" - $${(opp.value || 0).toLocaleString()}`,
                entity_type: 'opportunity',
                entity_id: opp.id,
                action_url: '/pipeline',
                priority: 'normal',
              });

              notificationsCreated++;
            }
          }
        }
      }
    }

    console.log(`Created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${notificationsCreated} notifications`,
        notificationsCreated 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check notifications error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
