import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterPayload {
  org_slug: string;
  email: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { org_slug, email, password }: RegisterPayload = await req.json();

    if (!org_slug || !email || !password) {
      return new Response(JSON.stringify({ error: 'org_slug, email y password son requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1. Verify email exists in contacts for this org and portal is active
    const { data: verification, error: verifyError } = await supabaseAdmin
      .rpc('verify_portal_email', {
        p_org_slug: org_slug,
        p_email: email.toLowerCase().trim(),
      });

    if (verifyError) {
      console.error('[portal-register] verify error:', verifyError);
      return new Response(JSON.stringify({ error: 'Error al verificar el email' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const contact = (verification as any[])?.[0];

    if (!contact) {
      return new Response(JSON.stringify({
        error: 'No encontramos una cuenta asociada a este email. Contacta a tu asesor.'
      }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (contact.is_blocked) {
      return new Response(JSON.stringify({
        error: 'Tu acceso al portal ha sido suspendido. Contacta a tu asesor.'
      }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let userId: string;

    if (contact.already_registered) {
      // Already has account — update password
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u =>
        u.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingUser) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
        userId = existingUser.id;
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password,
          email_confirm: true,
          user_metadata: {
            is_portal_client: true,
            contact_id: contact.contact_id,
            organization_id: contact.organization_id,
          },
        });
        if (createErr) throw createErr;
        userId = newUser.user!.id;
      }
    } else {
      // First time registration
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
        user_metadata: {
          is_portal_client: true,
          contact_id: contact.contact_id,
          organization_id: contact.organization_id,
        },
      });

      if (createErr) {
        if (createErr.message.includes('already registered')) {
          // User exists in Auth but not in client_portal_users — link them
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u =>
            u.email?.toLowerCase() === email.toLowerCase()
          );
          if (!existingUser) throw createErr;
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
          userId = existingUser.id;
        } else {
          throw createErr;
        }
      } else {
        userId = newUser.user!.id;
      }

      // Link in client_portal_users
      await supabaseAdmin.rpc('register_portal_user', {
        p_user_id: userId,
        p_contact_id: contact.contact_id,
        p_organization_id: contact.organization_id,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      first_name: contact.first_name,
      already_registered: contact.already_registered,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[portal-register] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Error interno'
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
