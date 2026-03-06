import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsAppIfRuleActive(
  supabase: ReturnType<typeof createClient>,
  ruleId: string,
  orgId: string,
  notificationType: string,
  recipientUserId: string,
  templateData: Record<string, string>
) {
  // Check if WhatsApp rule is active for this org
  const { data: rule } = await supabase
    .from('whatsapp_notification_rules')
    .select('is_active')
    .eq('organization_id', orgId)
    .eq('rule_id', ruleId)
    .single();

  if (!rule?.is_active) return;

  // Get team member's WhatsApp number
  const { data: member } = await supabase
    .from('team_members')
    .select('whatsapp')
    .eq('user_id', recipientUserId)
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .maybeSingle();

  if (!member?.whatsapp) return;

  // Get Twilio credentials for the org
  const { data: integration } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('provider', 'twilio')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!integration?.metadata) return;

  const meta = integration.metadata as Record<string, string>;
  if (!meta.account_sid_hash || !meta.auth_token_hash || !meta.whatsapp_number) return;

  const accountSid = atob(meta.account_sid_hash);
  const authToken = atob(meta.auth_token_hash);
  const fromNumber = meta.whatsapp_number;

  // Build message from templates
  const MESSAGE_TEMPLATES: Record<string, (d: Record<string, string>) => string> = {
    overdue_alert: (d) =>
      `⚠️ *Alerta de Mora*\nComprador: *${d.buyer_name || 'N/A'}*\nMonto: ${d.amount || 'N/A'}\nDías de mora: ${d.days_overdue || 'N/A'}`,
    deal_stale: (d) =>
      `📊 *Deal sin movimiento*\n"${d.deal_title || 'N/A'}" lleva ${d.days_stale || 'N/A'} días sin actividad.`,
    new_lead: (d) =>
      `🆕 *Nuevo Lead*\n${d.contact_name || 'N/A'}\nEmail: ${d.email || 'N/A'}`,
    task_due: (d) =>
      `📋 *Tarea próxima*\n${d.task_title || 'N/A'}\nVence: ${d.due_date || 'N/A'}\nPrioridad: ${d.priority || 'normal'}`,
  };

  const templateFn = MESSAGE_TEMPLATES[notificationType];
  if (!templateFn) return;

  const messageText = templateFn(templateData);
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  try {
    const body = new URLSearchParams({
      From: `whatsapp:${fromNumber}`,
      To: `whatsapp:${member.whatsapp}`,
      Body: messageText,
    });

    await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    console.log(`WhatsApp sent for ${ruleId} to ${member.whatsapp}`);
  } catch (err) {
    console.error(`WhatsApp send failed for ${ruleId}:`, err);
  }
}

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
      // Get user's organization for WhatsApp rule checks
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('organization_id')
        .eq('user_id', pref.user_id)
        .eq('is_active', true)
        .maybeSingle();

      const userOrgId = teamMember?.organization_id;

      // Check for upcoming tasks
      if (pref.task_reminders) {
        const reminderThreshold = new Date();
        reminderThreshold.setHours(reminderThreshold.getHours() + (pref.reminder_hours || 24));

        const { data: upcomingTasks } = await supabase
          .from('activities')
          .select('id, title, due_date, priority')
          .eq('user_id', pref.user_id)
          .eq('completed', false)
          .not('due_date', 'is', null)
          .lte('due_date', reminderThreshold.toISOString())
          .gte('due_date', new Date().toISOString());

        if (upcomingTasks && upcomingTasks.length > 0) {
          for (const task of upcomingTasks) {
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

              // Send WhatsApp if rule active
              if (userOrgId) {
                await sendWhatsAppIfRuleActive(supabase, 'task_due', userOrgId, 'task_due', pref.user_id, {
                  task_title: task.title,
                  due_date: dueDate.toLocaleDateString('es-MX'),
                  priority: task.priority || 'normal',
                });
              }
            }
          }
        }
      }

      // Check for deal updates
      if (pref.deal_updates) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: recentOpportunities } = await supabase
          .from('opportunities')
          .select('id, title, value, stages(name)')
          .eq('user_id', pref.user_id)
          .gte('updated_at', oneHourAgo);

        if (recentOpportunities && recentOpportunities.length > 0) {
          for (const opp of recentOpportunities) {
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

              // Send WhatsApp if rule active
              if (userOrgId) {
                await sendWhatsAppIfRuleActive(supabase, 'deal_stale', userOrgId, 'deal_stale', pref.user_id, {
                  deal_title: opp.title,
                  value: `$${(opp.value || 0).toLocaleString()}`,
                  days_stale: '7+',
                });
              }
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
