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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { job_id, entity_types, format } = await req.json();
    console.log(`Processing export job ${job_id} for ${entity_types.join(', ')}`);

    // Update job status
    await supabaseClient.from('export_jobs').update({ status: 'processing' }).eq('id', job_id);

    // Get user_id from job
    const { data: job } = await supabaseClient.from('export_jobs').select('user_id').eq('id', job_id).single();
    const userId = job?.user_id;

    const allData: Record<string, unknown[]> = {};
    let totalRecords = 0;

    for (const entityType of entity_types) {
      const { data, error } = await supabaseClient.from(entityType).select('*').eq('user_id', userId);
      if (!error && data) {
        allData[entityType] = data;
        totalRecords += data.length;
      }
    }

    // For now, return JSON directly (in production, you'd generate CSV/XLSX and upload to storage)
    const exportData = format === 'json' ? JSON.stringify(allData, null, 2) : JSON.stringify(allData);

    // Update job as completed
    await supabaseClient.from('export_jobs').update({
      status: 'completed',
      progress: 100,
      total_records: totalRecords,
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', job_id);

    return new Response(JSON.stringify({ success: true, data: allData, total_records: totalRecords }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
