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

    // Get the integration to retrieve the stored API key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: integration, error: fetchError } = await supabaseAdmin
      .from('integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('provider', 'manychat')
      .single();

    if (fetchError || !integration) {
      return new Response(
        JSON.stringify({ error: 'No se encontró la integración de ManyChat' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const metadata = integration.metadata as Record<string, any>;
    
    if (!metadata?.api_key_hash) {
      return new Response(
        JSON.stringify({ error: 'No hay API Key configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode the API key
    const apiKey = atob(metadata.api_key_hash);

    // Test the connection with ManyChat API
    console.log('Testing ManyChat connection...');
    
    const manyChatResponse = await fetch('https://api.manychat.com/fb/page/getInfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseData = await manyChatResponse.json();

    if (!manyChatResponse.ok || responseData.status === 'error') {
      console.error('ManyChat API error:', responseData);
      
      // Update integration with error status
      await supabaseAdmin
        .from('integrations')
        .update({
          metadata: {
            ...metadata,
            test_status: 'error',
            last_test_at: new Date().toISOString(),
            test_error: responseData.message || 'Error de conexión'
          }
        })
        .eq('user_id', userId)
        .eq('provider', 'manychat');

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message || 'API Key inválida o expirada',
          details: responseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Connection successful - update integration
    await supabaseAdmin
      .from('integrations')
      .update({
        metadata: {
          ...metadata,
          test_status: 'success',
          last_test_at: new Date().toISOString(),
          page_info: responseData.data,
          test_error: null
        },
        error_message: null
      })
      .eq('user_id', userId)
      .eq('provider', 'manychat');

    console.log('ManyChat connection test successful:', responseData.data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conexión exitosa con ManyChat',
        page_name: responseData.data?.name || 'Página conectada',
        page_id: responseData.data?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in test-manychat-connection:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
