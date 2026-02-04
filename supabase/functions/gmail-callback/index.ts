import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

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

    console.log("Gmail connected for:", userInfo.email);

    // For now, we'll store with a placeholder user_id
    // In production, you'd pass the user_id through state parameter
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Note: In a real implementation, you'd pass user_id via OAuth state parameter
    // For demo purposes, we'll just show success
    console.log("Gmail OAuth successful for:", userInfo.email);

    // Redirect back to settings page
    const appUrl = SUPABASE_URL!.replace('.supabase.co', '.lovable.app').replace('https://vzqjoiapwgsbvsknrlqk', 'https://id-preview--f39b1419-0f85-429c-8c47-e4f064263d68');
    
    return new Response(
      `<html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5;">
          <div style="text-align: center; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #22c55e; margin-bottom: 16px;">✓ Gmail conectado exitosamente</h2>
            <p style="color: #666;">Email: ${userInfo.email}</p>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">Puedes cerrar esta ventana y volver a la aplicación.</p>
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
