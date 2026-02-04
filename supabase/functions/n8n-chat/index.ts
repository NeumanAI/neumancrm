import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebchatPayload {
  session_id: string;
  message: string;
  visitor_name?: string;
  visitor_email?: string;
  user_id: string;
  organization_id?: string;
  n8n_webhook_url?: string;
}

// Generate temporary email for webchat leads
function generateTemporaryEmail(sessionId: string): string {
  return `webchat_${sessionId.slice(0, 8)}@webchat.lead.local`;
}

// Find or create contact for webchat visitors
async function findOrCreateContact(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string | null,
  data: {
    email?: string;
    name?: string;
    session_id: string;
  }
): Promise<{ contactId: string; isNew: boolean }> {
  // Parse name into first/last
  const nameParts = (data.name || '').trim().split(' ');
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;

  // Try to find by email first (if provided and not temporary)
  if (data.email && !data.email.includes('@webchat.lead.local')) {
    const { data: emailMatch } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', data.email)
      .maybeSingle();
    
    if (emailMatch) {
      console.log(`[n8n-chat] Found contact by email: ${emailMatch.id}`);
      await supabase
        .from('contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', emailMatch.id);
      return { contactId: emailMatch.id, isNew: false };
    }
  }

  // Try to find by session_id (source_id)
  const { data: sessionMatch } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('source_id', data.session_id)
    .maybeSingle();
  
  if (sessionMatch) {
    console.log(`[n8n-chat] Found contact by session: ${sessionMatch.id}`);
    await supabase
      .from('contacts')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', sessionMatch.id);
    return { contactId: sessionMatch.id, isNew: false };
  }

  // No match found - create new contact
  const email = data.email || generateTemporaryEmail(data.session_id);
  
  const { data: newContact, error: createError } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      email,
      first_name: firstName,
      last_name: lastName,
      source: 'webchat',
      source_id: data.session_id,
      last_contacted_at: new Date().toISOString(),
      metadata: {
        webchat_session_id: data.session_id,
        auto_created: true,
        created_from_channel: 'webchat',
      },
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[n8n-chat] Error creating contact:', createError);
    throw createError;
  }

  console.log(`[n8n-chat] Created new contact: ${newContact.id}`);
  return { contactId: newContact.id, isNew: true };
}

// Create notification for new webchat lead
async function createLeadNotification(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  contactName: string
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'new_contact',
    title: 'Nuevo lead desde Webchat',
    message: `${contactName} te ha contactado por primera vez vía tu sitio web`,
    priority: 'high',
    entity_type: 'contact',
    entity_id: contactId,
    action_url: `/contacts/${contactId}`,
  });
}

// Create timeline entry for first webchat contact
async function createTimelineEntry(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  contactName: string,
  sessionId: string
) {
  await supabase.from('timeline_entries').insert({
    user_id: userId,
    contact_id: contactId,
    entry_type: 'webchat',
    source: 'auto',
    subject: 'Primer contacto vía Webchat',
    body: `${contactName} inició una conversación a través del widget de chat web`,
    metadata: {
      channel: 'webchat',
      session_id: sessionId,
      auto_created: true,
    },
    occurred_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
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

    const visitorDisplayName = visitor_name || 'Visitante Web';

    // Auto-create/link contact
    let contactId: string | null = null;
    let isNewContact = false;

    try {
      const result = await findOrCreateContact(supabase, user_id, organization_id || null, {
        email: visitor_email,
        name: visitor_name,
        session_id,
      });
      
      contactId = result.contactId;
      isNewContact = result.isNew;

      // If new contact, create notification and timeline entry
      if (isNewContact) {
        await Promise.all([
          createLeadNotification(supabase, user_id, contactId, visitorDisplayName),
          createTimelineEntry(supabase, user_id, contactId, visitorDisplayName, session_id),
        ]);
        console.log(`[n8n-chat] Created notification and timeline for new webchat lead: ${contactId}`);
      }
    } catch (contactError) {
      console.error('[n8n-chat] Error in findOrCreateContact:', contactError);
      // Continue without contact linking
    }

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
      
      // Update contact link if we have one now
      if (contactId) {
        await supabase
          .from('conversations')
          .update({ contact_id: contactId })
          .eq('id', conversationId);
      }
    } else {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id,
          organization_id,
          channel: 'webchat',
          external_id: session_id,
          external_name: visitorDisplayName,
          external_email: visitor_email,
          contact_id: contactId,
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
        sender_name: visitorDisplayName,
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
            contact_id: contactId,
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
        contact_id: contactId,
        is_new_contact: isNewContact,
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
