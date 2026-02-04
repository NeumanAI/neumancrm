import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { job_id, entity_type, data, column_mapping, settings } = await req.json();
    console.log(`Processing import job ${job_id} for ${entity_type}, ${data.length} rows`);

    // Update job status
    await supabaseClient.from('import_jobs').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', job_id);

    let successCount = 0;
    let failedCount = 0;
    const errors: { row: number; field: string; error: string }[] = [];

    // Get user_id from job
    const { data: job } = await supabaseClient.from('import_jobs').select('user_id').eq('id', job_id).single();
    const userId = job?.user_id;

    // Process in batches
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];
        const mappedData: Record<string, unknown> = { user_id: userId };

        for (const [sourceCol, targetField] of Object.entries(column_mapping)) {
          if (row[sourceCol] !== undefined && row[sourceCol] !== '') {
            mappedData[targetField as string] = row[sourceCol];
          }
        }

        const { error } = await supabaseClient.from(entity_type).insert(mappedData);
        if (error) throw error;
        successCount++;
      } catch (e: any) {
        failedCount++;
        errors.push({ row: i + 1, field: 'unknown', error: e.message });
      }

      // Update progress
      if (i % 10 === 0) {
        const progress = Math.round((i / data.length) * 100);
        await supabaseClient.from('import_jobs').update({ progress, processed_rows: i + 1, successful_rows: successCount, failed_rows: failedCount }).eq('id', job_id);
      }
    }

    // Finalize
    await supabaseClient.from('import_jobs').update({
      status: 'completed',
      progress: 100,
      processed_rows: data.length,
      successful_rows: successCount,
      failed_rows: failedCount,
      errors: errors.length > 0 ? errors : null,
      completed_at: new Date().toISOString(),
    }).eq('id', job_id);

    return new Response(JSON.stringify({ success: true, successCount, failedCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
