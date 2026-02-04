import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const stateParam = url.searchParams.get("state");

    if (error) {
      console.error("OAuth error:", error);
      return new Response(
        `<html><body><script>window.close();</script><p>Error de autenticación: ${error}. Puedes cerrar esta ventana.</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!code) {
      return new Response(
        `<html><body><script>window.close();</script><p>No se recibió código de autorización. Puedes cerrar esta ventana.</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Parse state to get user_id
    let userId = "";
    if (stateParam) {
      try {
        const stateData = JSON.parse(atob(stateParam));
        userId = stateData.user_id || "";
      } catch (e) {
        console.error("Failed to parse state:", e);
      }
    }

    if (!userId) {
      return new Response(
        `<html><body><p>Error: No se pudo identificar al usuario. Por favor intenta de nuevo.</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
    const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error("Token exchange error:", tokens);
      throw new Error(tokens.error_description || tokens.error);
    }

    // Get user email from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    console.log("Gmail connected for user:", userId, "email:", userInfo.email);

    // Store tokens in integrations table
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check if integration exists
    const { data: existing } = await supabase
      .from("integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .single();

    const integrationData = {
      user_id: userId,
      provider: "gmail",
      is_active: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      sync_status: "idle",
      error_message: null,
      metadata: {
        email: userInfo.email,
        connected_at: new Date().toISOString(),
      },
    };

    if (existing) {
      await supabase
        .from("integrations")
        .update(integrationData)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("integrations")
        .insert(integrationData);
    }

    console.log("Gmail integration saved for user:", userId);

    return new Response(
      `<html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
          <div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #22c55e; margin-bottom: 16px;">✓ Gmail conectado exitosamente</h2>
            <p style="color: #666;">Email: ${userInfo.email}</p>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">Puedes cerrar esta ventana y volver a la aplicación.</p>
            <script>
              setTimeout(() => {
                if (window.opener) {
                  window.opener.postMessage({ type: 'gmail-connected' }, '*');
                }
                window.close();
              }, 2000);
            </script>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Gmail callback error:", error);
    return new Response(
      `<html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
          <div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #ef4444; margin-bottom: 16px;">Error de conexión</h2>
            <p style="color: #666;">${error instanceof Error ? error.message : 'Error desconocido'}</p>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">Puedes cerrar esta ventana e intentar de nuevo.</p>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
});
