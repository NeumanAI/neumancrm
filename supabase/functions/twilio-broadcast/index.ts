import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id requerido' }), {
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

    // Get campaign
    const { data: campaign, error: campError } = await supabaseAdmin
      .from('broadcast_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaña no encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as sending
    await supabaseAdmin.from('broadcast_campaigns').update({
      status: 'sending', started_at: new Date().toISOString(),
    }).eq('id', campaign_id);

    // Get pending messages
    const { data: messages } = await supabaseAdmin
      .from('broadcast_messages')
      .select('*')
      .eq('campaign_id', campaign_id)
      .eq('status', 'pending');

    if (!messages || messages.length === 0) {
      await supabaseAdmin.from('broadcast_campaigns').update({
        status: 'completed', completed_at: new Date().toISOString(),
      }).eq('id', campaign_id);

      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    let sentCount = 0;
    let failedCount = 0;

    for (const msg of messages) {
      try {
        const body = new URLSearchParams({
          From: `whatsapp:${fromNumber}`,
          To: `whatsapp:${msg.phone_number}`,
          Body: campaign.message_template,
        });

        const res = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        const data = await res.json();

        if (res.ok) {
          await supabaseAdmin.from('broadcast_messages').update({
            status: 'sent', twilio_sid: data.sid, sent_at: new Date().toISOString(),
          }).eq('id', msg.id);
          sentCount++;
        } else {
          await supabaseAdmin.from('broadcast_messages').update({
            status: 'failed', error_message: data.message || 'Error desconocido',
          }).eq('id', msg.id);
          failedCount++;
        }

        // Update campaign counters
        await supabaseAdmin.rpc('increment_campaign_sent', { campaign_id_param: campaign_id });

      } catch (err) {
        console.error(`Error sending to ${msg.phone_number}:`, err);
        await supabaseAdmin.from('broadcast_messages').update({
          status: 'failed', error_message: err instanceof Error ? err.message : 'Error',
        }).eq('id', msg.id);
        failedCount++;
      }

      // Delay 1s between messages
      await delay(1000);
    }

    // Mark campaign completed
    await supabaseAdmin.from('broadcast_campaigns').update({
      status: failedCount === messages.length ? 'failed' : 'completed',
      completed_at: new Date().toISOString(),
      sent_count: sentCount,
      failed_count: failedCount,
    }).eq('id', campaign_id);

    return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in twilio-broadcast:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
