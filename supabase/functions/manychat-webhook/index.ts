import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManyChatPayload {
  id: string;
  key?: string;
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
  last_input_text?: string;
  last_widget_input?: string;
  wa_phone?: string;
  ig_username?: string;
  custom_fields?: Record<string, unknown>;
  crm_user_id?: string;
  crm_organization_id?: string;
}

// Sanitize ManyChat template strings (e.g. "{{email}}", "{{last_name}}")
function sanitize(val?: string): string | undefined {
  if (!val || val.includes('{{')) return undefined;
  return val.trim() || undefined;
}

// Normalize phone number to standard format
function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-\(\)\.]/g, '');
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.slice(2);
  }
  if (!normalized.startsWith('+') && normalized.length === 10) {
    normalized = '+52' + normalized; // Default to Mexico
  }
  return normalized;
}

// Generate temporary email for leads without email
function generateTemporaryEmail(data: { phone?: string; ig_username?: string }): string {
  if (data.phone) {
    return `${normalizePhone(data.phone).replace('+', '')}@lead.crm.local`;
  }
  if (data.ig_username) {
    return `${data.ig_username}@instagram.lead.local`;
  }
  return `lead_${Date.now()}@messenger.lead.local`;
}

// Find or create contact based on matching criteria
async function findOrCreateContact(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string | null,
  data: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    instagram_username?: string;
    manychat_subscriber_id: string;
    avatar_url?: string;
    source: 'whatsapp' | 'instagram' | 'messenger';
  }
): Promise<{ contactId: string; isNew: boolean }> {
  const normalizedPhone = data.phone ? normalizePhone(data.phone) : null;

  // Try to find by email first (most reliable)
  if (data.email) {
    const { data: emailMatch } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('email', data.email)
      .maybeSingle();
    
    if (emailMatch) {
      console.log(`[manychat-webhook] Found contact by email: ${emailMatch.id}`);
      await supabase
        .from('contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', emailMatch.id);
      return { contactId: emailMatch.id, isNew: false };
    }
  }

  // Try to find by phone number
  if (normalizedPhone) {
    const { data: phoneMatch } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .or(`phone.eq.${normalizedPhone},mobile.eq.${normalizedPhone},whatsapp_number.eq.${normalizedPhone}`)
      .maybeSingle();
    
    if (phoneMatch) {
      console.log(`[manychat-webhook] Found contact by phone: ${phoneMatch.id}`);
      await supabase
        .from('contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', phoneMatch.id);
      return { contactId: phoneMatch.id, isNew: false };
    }
  }

  // Try to find by Instagram username
  if (data.instagram_username) {
    const { data: igMatch } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('instagram_username', data.instagram_username)
      .maybeSingle();
    
    if (igMatch) {
      console.log(`[manychat-webhook] Found contact by Instagram: ${igMatch.id}`);
      await supabase
        .from('contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', igMatch.id);
      return { contactId: igMatch.id, isNew: false };
    }
  }

  // Try to find by ManyChat subscriber ID
  const { data: manychatMatch } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('source_id', data.manychat_subscriber_id)
    .maybeSingle();
  
  if (manychatMatch) {
    console.log(`[manychat-webhook] Found contact by ManyChat ID: ${manychatMatch.id}`);
    await supabase
      .from('contacts')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', manychatMatch.id);
    return { contactId: manychatMatch.id, isNew: false };
  }

  // No match found - create new contact
  const email = data.email || generateTemporaryEmail({ phone: data.phone, ig_username: data.instagram_username });
  
  const { data: newContact, error: createError } = await supabase
    .from('contacts')
    .insert({
      user_id: userId,
      organization_id: organizationId,
      email,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      phone: data.phone ? normalizedPhone : null,
      whatsapp_number: data.source === 'whatsapp' ? normalizedPhone : null,
      instagram_username: data.instagram_username || null,
      avatar_url: data.avatar_url || null,
      source: data.source,
      source_id: data.manychat_subscriber_id,
      last_contacted_at: new Date().toISOString(),
      metadata: {
        manychat_id: data.manychat_subscriber_id,
        auto_created: true,
        created_from_channel: data.source,
      },
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[manychat-webhook] Error creating contact:', createError);
    throw createError;
  }

  console.log(`[manychat-webhook] Created new contact: ${newContact.id}`);
  return { contactId: newContact.id, isNew: true };
}

// Create notification for new lead
async function createLeadNotification(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  contactName: string,
  channel: string
) {
  const channelNames: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    messenger: 'Messenger',
  };

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'new_contact',
    title: `Nuevo lead desde ${channelNames[channel] || channel}`,
    message: `${contactName} te ha contactado por primera vez vía ${channelNames[channel] || channel}`,
    priority: 'high',
    entity_type: 'contact',
    entity_id: contactId,
    action_url: `/contacts/${contactId}`,
  });
}

// Create timeline entry for first contact
async function createTimelineEntry(
  supabase: SupabaseClient,
  userId: string,
  contactId: string,
  contactName: string,
  channel: string,
  subscriberId: string
) {
  const channelNames: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    messenger: 'Messenger',
  };

  await supabase.from('timeline_entries').insert({
    user_id: userId,
    contact_id: contactId,
    entry_type: channel,
    source: 'auto',
    subject: `Primer contacto vía ${channelNames[channel] || channel}`,
    body: `${contactName} inició una conversación a través de ${channelNames[channel] || channel}`,
    metadata: {
      channel,
      subscriber_id: subscriberId,
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

    const payload: ManyChatPayload = await req.json();
    
    console.log('[manychat-webhook] Received payload:', JSON.stringify(payload, null, 2));

    const subscriberId = payload.id;
    const crmUserId = payload.crm_user_id;
    const crmOrgId = payload.crm_organization_id;

    // Sanitize all payload fields to remove ManyChat template strings
    payload.first_name = sanitize(payload.first_name) as any;
    payload.last_name = sanitize(payload.last_name) as any;
    payload.name = sanitize(payload.name) as any;
    payload.email = sanitize(payload.email) as any;
    payload.phone = sanitize(payload.phone) as any;
    payload.wa_phone = sanitize(payload.wa_phone) as any;
    payload.ig_username = sanitize(payload.ig_username) as any;
    payload.last_input_text = sanitize(payload.last_input_text) as any;
    payload.last_widget_input = sanitize(payload.last_widget_input) as any;
    payload.profile_pic = sanitize(payload.profile_pic) as any;

    const message = payload.last_input_text || payload.last_widget_input;

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

    // Build subscriber name with ig_username fallback
    const subscriberName = payload.name || 
      [payload.first_name, payload.last_name].filter(Boolean).join(' ') || 
      payload.ig_username || 'Suscriptor';

    // Auto-create/link contact if we have a CRM user
    let contactId: string | null = null;
    let isNewContact = false;

    if (crmUserId) {
      try {
        const result = await findOrCreateContact(supabase, crmUserId, crmOrgId || null, {
          email: payload.email,
          phone: payload.phone || payload.wa_phone,
          first_name: payload.first_name,
          last_name: payload.last_name,
          instagram_username: payload.ig_username,
          manychat_subscriber_id: subscriberId,
          avatar_url: payload.profile_pic,
          source: channel,
        });
        
        contactId = result.contactId;
        isNewContact = result.isNew;

        // If new contact, create notification and timeline entry
        if (isNewContact) {
          await Promise.all([
            createLeadNotification(supabase, crmUserId, contactId, subscriberName, channel),
            createTimelineEntry(supabase, crmUserId, contactId, subscriberName, channel, subscriberId),
          ]);
          console.log(`[manychat-webhook] Created notification and timeline for new lead: ${contactId}`);
        }
      } catch (contactError) {
        console.error('[manychat-webhook] Error in findOrCreateContact:', contactError);
        // Continue without contact linking - don't fail the webhook
      }
    }

    // Find existing conversation or create new one
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
      
      // Update conversation metadata and contact link
      await supabase
        .from('conversations')
        .update({
          external_name: subscriberName,
          external_email: payload.email,
          external_phone: payload.phone || payload.wa_phone,
          external_avatar: payload.profile_pic,
          contact_id: contactId || undefined,
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
      // Create new conversation
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
          contact_id: contactId,
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
        contact_id: contactId,
        is_new_contact: isNewContact,
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
