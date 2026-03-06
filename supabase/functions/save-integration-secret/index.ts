import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !claims?.user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claims.user.id;
    const { provider, api_key } = await req.json();

    if (!provider || !api_key) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros: provider y api_key son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validProviders = ['manychat', 'webchat', 'n8n', 'twilio'];
    if (!validProviders.includes(provider)) {
      return new Response(
        JSON.stringify({ error: `Provider inválido. Debe ser: ${validProviders.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client to store the secret
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get existing integration
    const { data: existingIntegration } = await supabaseAdmin
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    const existingMetadata = existingIntegration?.metadata || {};

    let metadataToSave: Record<string, unknown>;

    if (provider === 'twilio') {
      // Twilio: api_key is a JSON string with account_sid, auth_token, whatsapp_number
      const twilioConfig = typeof api_key === 'string' ? JSON.parse(api_key) : api_key;
      metadataToSave = {
        ...existingMetadata,
        api_key_configured: true,
        account_sid_hash: btoa(twilioConfig.account_sid),
        auth_token_hash: btoa(twilioConfig.auth_token),
        whatsapp_number: twilioConfig.whatsapp_number,
        updated_at: new Date().toISOString()
      };
    } else {
      const encodedKey = btoa(api_key);
      metadataToSave = {
        ...existingMetadata,
        api_key_configured: true,
        api_key_hash: encodedKey,
        updated_at: new Date().toISOString()
      };
    }

    // Update the integration
    const { error: updateError } = await supabaseAdmin
      .from('integrations')
      .upsert({
        user_id: userId,
        provider,
        is_active: true,
        sync_status: 'idle',
        metadata: metadataToSave
      }, {
        onConflict: 'user_id,provider'
      });

    if (updateError) {
      console.error('Error updating integration:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error al guardar la configuración' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`API key saved for provider ${provider}, user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `API Key de ${provider} guardada correctamente` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in save-integration-secret:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
