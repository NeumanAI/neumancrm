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

    // Verify caller
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claimsData.claims.sub;

    // Admin client for user creation
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify caller is admin of their org
    const { data: callerMember, error: callerError } = await adminClient
      .from("team_members")
      .select("organization_id, role")
      .eq("user_id", callerId)
      .eq("is_active", true)
      .single();

    if (callerError || !callerMember || callerMember.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Solo los administradores pueden crear miembros" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId = callerMember.organization_id;

    // Parse body
    const { email, password, fullName, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: "email, password y role son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user limit
    const { data: org } = await adminClient
      .from("organizations")
      .select("max_users")
      .eq("id", orgId)
      .single();

    const { count: activeCount } = await adminClient
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true);

    if (org && activeCount !== null && activeCount >= org.max_users) {
      return new Response(
        JSON.stringify({ error: `Límite de usuarios alcanzado (${org.max_users})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists as an ACTIVE team member in this org
    const { data: existingMember } = await adminClient
      .from("team_members")
      .select("id, is_active")
      .eq("organization_id", orgId)
      .eq("email", email.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "Este email ya está registrado en tu equipo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any pending/inactive invitations for this email so we can create fresh
    await adminClient
      .from("team_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("email", email.toLowerCase())
      .eq("is_active", false);

    // Step 1: Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split("@")[0] },
    });

    if (authError) {
      // If user already exists in auth, try to get their ID
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        // Get existing user
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: "El usuario ya existe pero no se pudo vincular" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if this user already has a team_member in another org
        const { data: otherMembership } = await adminClient
          .from("team_members")
          .select("id")
          .eq("user_id", existingUser.id)
          .eq("is_active", true)
          .maybeSingle();

        if (otherMembership) {
          return new Response(
            JSON.stringify({ error: "Este usuario ya pertenece a otra organización" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Link existing user to this org
        // First clean up any inactive/orphan team_members for this user
        await adminClient
          .from("team_members")
          .delete()
          .eq("user_id", existingUser.id)
          .eq("is_active", false);

        const { error: insertError } = await adminClient
          .from("team_members")
          .insert({
            user_id: existingUser.id,
            organization_id: orgId,
            role,
            email: email.toLowerCase(),
            full_name: fullName || email.split("@")[0],
            is_active: true,
            invited_by: callerId,
            joined_at: new Date().toISOString(),
            invitation_status: "active",
          });

        if (insertError) {
          return new Response(
            JSON.stringify({ error: insertError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, user_id: existingUser.id, linked: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;

    // Step 2: The trigger handle_new_user_organization will auto-create an org + team_member.
    // We need to clean those up and insert the correct team_member.
    // Small delay to let triggers execute
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Find and delete the auto-created team_member for this user
    const { data: autoCreatedMembers } = await adminClient
      .from("team_members")
      .select("id, organization_id")
      .eq("user_id", newUserId);

    if (autoCreatedMembers && autoCreatedMembers.length > 0) {
      const autoOrgIds = autoCreatedMembers
        .map((m: any) => m.organization_id)
        .filter((id: string) => id !== orgId);

      // Delete auto-created team members
      await adminClient
        .from("team_members")
        .delete()
        .eq("user_id", newUserId);

      // Delete auto-created organizations (the ones created by the trigger)
      for (const autoOrgId of autoOrgIds) {
        await adminClient.from("organizations").delete().eq("id", autoOrgId);
      }
    }

    // Step 3: Insert the correct team_member
    const { error: insertError } = await adminClient
      .from("team_members")
      .insert({
        user_id: newUserId,
        organization_id: orgId,
        role,
        email: email.toLowerCase(),
        full_name: fullName || email.split("@")[0],
        is_active: true,
        invited_by: callerId,
        joined_at: new Date().toISOString(),
        invitation_status: "active",
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
