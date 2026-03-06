import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESSAGE_TEMPLATES: Record<string, (data: Record<string, string>) => string> = {
  overdue_alert: (d) =>
    `⚠️ *Alerta de Mora*\n\nEl comprador *${d.buyer_name}* tiene cuotas vencidas por *${d.amount}*.\nContrato: ${d.contract_number}\nDías de mora: ${d.days_overdue}\n\nRevisa la cartera en NeumanCRM.`,
  deal_stale: (d) =>
    `📊 *Deal sin movimiento*\n\nEl deal "${d.deal_title}" con ${d.contact_name} lleva ${d.days_stale} días sin actividad.\nValor: ${d.value}\n\n¿Necesitas seguimiento?`,
  new_lead: (d) =>
    `🆕 *Nuevo Lead Asignado*\n\nSe te ha asignado un nuevo prospecto:\n*${d.contact_name}*\nEmail: ${d.email}\nFuente: ${d.source}\n\nContáctalo pronto.`,
  task_due: (d) =>
    `📋 *Tarea próxima a vencer*\n\nTarea: ${d.task_title}\nVence: ${d.due_date}\nPrioridad: ${d.priority}\n\nNo olvides completarla.`,
  custom: (d) => d.message || 'Notificación de NeumanCRM',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getUser(token);
    if (authError || !claims?.user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { notification_type, recipients, data } = await req.json();

    if (!notification_type || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'notification_type y recipients[] requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const templateFn = MESSAGE_TEMPLATES[notification_type];
    if (!templateFn) {
      return new Response(JSON.stringify({ error: `Tipo de notificación inválido: ${notification_type}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.user.id;
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get Twilio credentials
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', 'twilio')
      .eq('is_active', true)
      .single();

    if (!integration?.metadata) {
      return new Response(JSON.stringify({ error: 'Twilio no configurado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const meta = integration.metadata as Record<string, string>;
    const accountSid = atob(meta.account_sid_hash);
    const authToken = atob(meta.auth_token_hash);
    const fromNumber = meta.whatsapp_number;

    const messageText = templateFn(data || {});
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const results: { phone: string; status: string; error?: string }[] = [];

    for (const phone of recipients) {
      try {
        const body = new URLSearchParams({
          From: `whatsapp:${fromNumber}`,
          To: `whatsapp:${phone}`,
          Body: messageText,
        });

        const res = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        const resData = await res.json();
        results.push({
          phone,
          status: res.ok ? 'sent' : 'failed',
          error: res.ok ? undefined : resData.message,
        });
      } catch (err) {
        results.push({
          phone,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Error',
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in twilio-notify-team:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
