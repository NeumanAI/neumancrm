import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManyChatPayload {
  // ManyChat subscriber data
  id: string; // subscriber_id
  key?: string; // API key from ManyChat
  name?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  profile_pic?: string;
  locale?: string;
  language?: string;
  timezone?: string;
  live_chat_url?: string;
  phone?: string;
  email?: string;
  
  // Message data
  last_input_text?: string;
  last_widget_input?: string;
  
  // Channel identification
  wa_phone?: string; // WhatsApp phone
  ig_username?: string; // Instagram username
  
  // Custom fields
  custom_fields?: Record<string, unknown>;
  
  // CRM configuration (passed from ManyChat flow)
  crm_user_id?: string;
  crm_organization_id?: string;
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

    const payload: ManyChatPayload = await req.json();
    
    console.log('[manychat-webhook] Received payload:', JSON.stringify(payload, null, 2));

    const subscriberId = payload.id;
    const message = payload.last_input_text || payload.last_widget_input;
    const crmUserId = payload.crm_user_id;
    const crmOrgId = payload.crm_organization_id;

    if (!subscriberId) {
      return new Response(
        JSON.stringify({ error: 'subscriber id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine channel from payload
    let channel: 'whatsapp' | 'instagram' | 'messenger' = 'messenger';
    if (payload.wa_phone) {
      channel = 'whatsapp';
    } else if (payload.ig_username) {
      channel = 'instagram';
    }

    console.log(`[manychat-webhook] Channel detected: ${channel}, subscriber: ${subscriberId}`);

    // Build subscriber name
    const subscriberName = payload.name || 
      [payload.first_name, payload.last_name].filter(Boolean).join(' ') || 
      'Suscriptor';

    // Find existing conversation or create new one
    // First, look for conversation by external_id (subscriber_id)
    let conversationId: string | null = null;
    
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('external_id', subscriberId)
      .eq('channel', channel)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
      console.log(`[manychat-webhook] Found existing conversation: ${conversationId}`);
      
      // Update conversation metadata
      await supabase
        .from('conversations')
        .update({
          external_name: subscriberName,
          external_email: payload.email,
          external_phone: payload.phone || payload.wa_phone,
          external_avatar: payload.profile_pic,
          metadata: {
            manychat_subscriber_id: subscriberId,
            ig_username: payload.ig_username,
            live_chat_url: payload.live_chat_url,
            locale: payload.locale,
            custom_fields: payload.custom_fields,
          },
        })
        .eq('id', conversationId);
    } else if (crmUserId) {
      // Create new conversation if we have a CRM user to associate it with
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: crmUserId,
          organization_id: crmOrgId,
          channel,
          external_id: subscriberId,
          external_name: subscriberName,
          external_email: payload.email,
          external_phone: payload.phone || payload.wa_phone,
          external_avatar: payload.profile_pic,
          status: 'open',
          metadata: {
            manychat_subscriber_id: subscriberId,
            ig_username: payload.ig_username,
            live_chat_url: payload.live_chat_url,
            locale: payload.locale,
            custom_fields: payload.custom_fields,
          },
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[manychat-webhook] Error creating conversation:', convError);
        throw convError;
      }

      conversationId = newConv.id;
      console.log(`[manychat-webhook] Created new conversation: ${conversationId}`);

      // Try to auto-link to existing contact by phone or email
      if (payload.email || payload.phone || payload.wa_phone) {
        const phone = payload.phone || payload.wa_phone;
        let contactQuery = supabase.from('contacts').select('id');
        
        if (payload.email) {
          contactQuery = contactQuery.eq('email', payload.email);
        } else if (phone) {
          contactQuery = contactQuery.or(`phone.eq.${phone},mobile.eq.${phone},whatsapp_number.eq.${phone}`);
        }

        const { data: contact } = await contactQuery.single();
        
        if (contact) {
          await supabase
            .from('conversations')
            .update({ contact_id: contact.id })
            .eq('id', conversationId);
          
          console.log(`[manychat-webhook] Auto-linked to contact: ${contact.id}`);
        }
      }
    } else {
      console.log('[manychat-webhook] No CRM user specified and no existing conversation found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'crm_user_id required for new conversations' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save the incoming message if there is one
    if (message && conversationId) {
      const { error: msgError } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          content: message,
          is_from_contact: true,
          sender_name: subscriberName,
          message_type: 'text',
          metadata: {
            source: 'manychat',
            subscriber_id: subscriberId,
          },
        });

      if (msgError) {
        console.error('[manychat-webhook] Error saving message:', msgError);
      } else {
        console.log(`[manychat-webhook] Saved message to conversation ${conversationId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: conversationId,
        channel,
        subscriber_name: subscriberName,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[manychat-webhook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
