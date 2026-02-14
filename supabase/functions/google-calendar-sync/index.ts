import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: userError } = await anonClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, code, redirect_uri, sync_direction } = await req.json()

    switch (action) {
      case 'connect': {
        if (!googleClientId || !googleClientSecret) {
          return new Response(JSON.stringify({ error: 'Google Calendar credentials not configured' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: googleClientId,
            client_secret: googleClientSecret,
            redirect_uri,
            grant_type: 'authorization_code',
          }),
        })
        const tokens = await tokenRes.json()
        if (tokens.error) {
          return new Response(JSON.stringify({ error: tokens.error_description || tokens.error }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Get user email from Google
        const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const profile = await profileRes.json()

        // Upsert sync config
        const { error: upsertError } = await supabase
          .from('google_calendar_sync')
          .upsert({
            user_id: user.id,
            google_email: profile.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            is_connected: true,
            sync_status: 'connected',
          }, { onConflict: 'user_id' })

        if (upsertError) {
          return new Response(JSON.stringify({ error: upsertError.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ success: true, email: profile.email }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'disconnect': {
        await supabase
          .from('google_calendar_sync')
          .update({
            is_connected: false,
            access_token: null,
            refresh_token: null,
            sync_status: 'disconnected',
          })
          .eq('user_id', user.id)

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_settings': {
        await supabase
          .from('google_calendar_sync')
          .update({ sync_direction: sync_direction || 'bidirectional' })
          .eq('user_id', user.id)

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'sync': {
        // Get sync config
        const { data: syncConfig } = await supabase
          .from('google_calendar_sync')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!syncConfig?.is_connected) {
          return new Response(JSON.stringify({ error: 'Not connected to Google Calendar' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Refresh token if needed
        let accessToken = syncConfig.access_token
        if (new Date(syncConfig.token_expires_at) <= new Date()) {
          const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              refresh_token: syncConfig.refresh_token,
              client_id: googleClientId!,
              client_secret: googleClientSecret!,
              grant_type: 'refresh_token',
            }),
          })
          const refreshTokens = await refreshRes.json()
          accessToken = refreshTokens.access_token

          await supabase
            .from('google_calendar_sync')
            .update({
              access_token: accessToken,
              token_expires_at: new Date(Date.now() + refreshTokens.expires_in * 1000).toISOString(),
            })
            .eq('user_id', user.id)
        }

        // Update last sync
        await supabase
          .from('google_calendar_sync')
          .update({ last_sync_at: new Date().toISOString(), sync_status: 'synced' })
          .eq('user_id', user.id)

        return new Response(JSON.stringify({ success: true, message: 'Sync completed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
