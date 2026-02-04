import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebchatPayload {
  session_id: string;
  message: string;
  visitor_name?: string;
  visitor_email?: string;
  user_id: string; // The CRM user who owns this webchat
  organization_id?: string;
  n8n_webhook_url?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebchatPayload = await req.json();
    const { 
      session_id, 
      message, 
      visitor_name, 
      visitor_email, 
      user_id,
      organization_id,
      n8n_webhook_url 
    } = payload;

    if (!session_id || !message || !user_id) {
      return new Response(
        JSON.stringify({ error: 'session_id, message, and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[n8n-chat] Processing message from session ${session_id}`);

    // Find or create conversation
    let conversationId: string;
    
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user_id)
      .eq('channel', 'webchat')
      .eq('external_id', session_id)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
      console.log(`[n8n-chat] Found existing conversation: ${conversationId}`);
    } else {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id,
          organization_id,
          channel: 'webchat',
          external_id: session_id,
          external_name: visitor_name || 'Visitante Web',
          external_email: visitor_email,
          status: 'open',
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[n8n-chat] Error creating conversation:', convError);
        throw convError;
      }

      conversationId = newConv.id;
      console.log(`[n8n-chat] Created new conversation: ${conversationId}`);
    }

    // Save user message
    const { error: msgError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        content: message,
        is_from_contact: true,
        sender_name: visitor_name || 'Visitante',
        message_type: 'text',
      });

    if (msgError) {
      console.error('[n8n-chat] Error saving user message:', msgError);
      throw msgError;
    }

    // Call n8n webhook if configured
    let botResponse = 'Gracias por tu mensaje. Un agente te responderá pronto.';
    
    if (n8n_webhook_url) {
      try {
        console.log(`[n8n-chat] Calling n8n webhook: ${n8n_webhook_url}`);
        
        const n8nResponse = await fetch(n8n_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id,
            message,
            conversation_id: conversationId,
            visitor_name,
            visitor_email,
          }),
        });

        if (n8nResponse.ok) {
          const n8nData = await n8nResponse.json();
          botResponse = n8nData.response || n8nData.output || n8nData.message || botResponse;
          console.log(`[n8n-chat] Got n8n response: ${botResponse.substring(0, 100)}...`);
        } else {
          console.error('[n8n-chat] n8n webhook error:', n8nResponse.status);
        }
      } catch (n8nError) {
        console.error('[n8n-chat] Error calling n8n:', n8nError);
        // Continue with default response
      }
    }

    // Save bot response
    const { error: botMsgError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        content: botResponse,
        is_from_contact: false,
        sender_name: 'Bot',
        is_bot: true,
        message_type: 'text',
      });

    if (botMsgError) {
      console.error('[n8n-chat] Error saving bot response:', botMsgError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
        response: botResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[n8n-chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
