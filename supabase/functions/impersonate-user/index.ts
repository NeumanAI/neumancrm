import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Verify caller is super admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: superAdmin } = await adminClient
      .from("super_admins")
      .select("id")
      .eq("user_id", callerId)
      .maybeSingle();

    if (!superAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: not a super admin" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get organization_id from body
    const { organization_id } = await req.json();
    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: "organization_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Find the active admin of the target organization
    const { data: targetAdmin } = await adminClient
      .from("team_members")
      .select("email, full_name, user_id")
      .eq("organization_id", organization_id)
      .eq("role", "admin")
      .eq("is_active", true)
      .not("user_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!targetAdmin || !targetAdmin.email) {
      return new Response(
        JSON.stringify({
          error:
            "No se encontró un administrador activo con cuenta para esta organización",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate magic link for the target admin
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: targetAdmin.email,
      });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Error al generar enlace de acceso" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the impersonation in audit_log using service role (bypasses RLS)
    await adminClient.from("audit_log").insert({
      user_id: callerId,
      action: "impersonate",
      entity_type: "organization",
      entity_id: organization_id,
      new_values: {
        target_email: targetAdmin.email,
        target_name: targetAdmin.full_name,
        target_user_id: targetAdmin.user_id,
      },
    });

    const properties = linkData.properties;
    const hashedToken = properties?.hashed_token;

    if (!hashedToken) {
      console.error("No hashed_token in response:", properties);
      return new Response(
        JSON.stringify({ error: "No se pudo generar el token de acceso" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        token_hash: hashedToken,
        target_email: targetAdmin.email,
        target_name: targetAdmin.full_name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Impersonate error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
