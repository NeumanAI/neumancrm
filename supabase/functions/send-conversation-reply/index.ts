import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendReplyPayload {
  conversation_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SendReplyPayload = await req.json();
    const { conversation_id, content, message_type = 'text' } = payload;

    if (!conversation_id || !content) {
      return new Response(
        JSON.stringify({ error: 'conversation_id and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-reply] Sending reply to conversation ${conversation_id}`);

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { channel, external_id, metadata } = conversation;

    // Send message via appropriate channel
    let externalSendSuccess = false;
    let externalError: string | null = null;

    if (['whatsapp', 'instagram', 'messenger'].includes(channel)) {
      // Send via ManyChat API
      const manychatApiKey = Deno.env.get('MANYCHAT_API_KEY');
      
      if (manychatApiKey && external_id) {
        try {
          console.log(`[send-reply] Sending via ManyChat to subscriber ${external_id}`);
          
          const manychatResponse = await fetch(
            `https://api.manychat.com/fb/sending/sendContent`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${manychatApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                subscriber_id: external_id,
                data: {
                  version: 'v2',
                  content: {
                    messages: [
                      {
                        type: 'text',
                        text: content,
                      },
                    ],
                  },
                },
              }),
            }
          );

          if (manychatResponse.ok) {
            externalSendSuccess = true;
            console.log('[send-reply] ManyChat send successful');
          } else {
            const errorData = await manychatResponse.json();
            externalError = errorData.message || 'ManyChat API error';
            console.error('[send-reply] ManyChat error:', externalError);
          }
        } catch (mcError) {
          externalError = mcError instanceof Error ? mcError.message : 'ManyChat error';
          console.error('[send-reply] ManyChat error:', mcError);
        }
      } else {
        console.log('[send-reply] No ManyChat API key configured or no external_id');
        externalError = 'ManyChat not configured';
      }
    } else if (channel === 'webchat') {
      // Webchat messages are real-time via Supabase - just saving is enough
      externalSendSuccess = true;
    } else if (channel === 'email') {
      // Email would go through a different flow
      externalError = 'Email replies not yet implemented';
    }

    // The message is already saved by the frontend/hook
    // But we can update it with delivery status if needed

    return new Response(
      JSON.stringify({
        success: true,
        channel,
        external_send: externalSendSuccess,
        external_error: externalError,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-reply] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
