import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from token
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    console.log(`Scanning duplicates for user ${user.id}`);

    // Scan contacts
    const { data: contacts } = await supabaseClient.from('contacts').select('id, email, phone, first_name, last_name').eq('user_id', user.id);
    
    const duplicates: { entity_type: string; entity_id_1: string; entity_id_2: string; similarity_score: number; matching_fields: string[] }[] = [];

    if (contacts) {
      for (let i = 0; i < contacts.length; i++) {
        for (let j = i + 1; j < contacts.length; j++) {
          const c1 = contacts[i];
          const c2 = contacts[j];
          const matchingFields: string[] = [];
          let score = 0;

          if (c1.email && c2.email && c1.email.toLowerCase() === c2.email.toLowerCase()) {
            matchingFields.push('email');
            score += 50;
          }

          const phone1 = c1.phone?.replace(/\D/g, '');
          const phone2 = c2.phone?.replace(/\D/g, '');
          if (phone1 && phone2 && phone1 === phone2) {
            matchingFields.push('phone');
            score += 30;
          }

          if (matchingFields.length > 0) {
            duplicates.push({
              entity_type: 'contacts',
              entity_id_1: c1.id,
              entity_id_2: c2.id,
              similarity_score: Math.min(score, 100),
              matching_fields: matchingFields,
            });
          }
        }
      }
    }

    // Insert duplicates
    for (const dup of duplicates) {
      await supabaseClient.from('duplicates').upsert({
        user_id: user.id,
        ...dup,
        status: 'pending',
      }, { onConflict: 'entity_type,entity_id_1,entity_id_2' });
    }

    return new Response(JSON.stringify({ success: true, count: duplicates.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Scan error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
