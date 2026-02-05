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

    const { job_id, entity_type, data, column_mapping, settings } = await req.json();
    console.log(`Processing import job ${job_id} for ${entity_type}, ${data.length} rows`);

    // Update job status
    await supabaseClient.from('import_jobs').update({ 
      status: 'processing', 
      started_at: new Date().toISOString() 
    }).eq('id', job_id);

    let successCount = 0;
    let failedCount = 0;
    const errors: { row: number; field: string; error: string }[] = [];

    // Get user_id from job
    const { data: job } = await supabaseClient.from('import_jobs').select('user_id').eq('id', job_id).single();
    const userId = job?.user_id;

    if (!userId) {
      throw new Error('No user_id found for import job');
    }

    // Process in batches for performance
    const batchSize = 100;
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, data.length);
      const batchData = data.slice(startIdx, endIdx);

      try {
        // Map all rows in batch
        const mappedBatch = batchData.map((row: Record<string, unknown>, idx: number) => {
          const mappedData: Record<string, unknown> = { user_id: userId };

          for (const [sourceCol, targetField] of Object.entries(column_mapping)) {
            if (row[sourceCol] !== undefined && row[sourceCol] !== '') {
              mappedData[targetField as string] = row[sourceCol];
            }
          }

          return mappedData;
        });

        // Batch insert
        const { error: batchError, data: insertedData } = await supabaseClient
          .from(entity_type)
          .insert(mappedBatch)
          .select();

        if (batchError) {
          // If batch fails, try individual inserts to identify problematic rows
          console.log(`Batch ${batchIndex + 1} failed, trying individual inserts:`, batchError.message);
          
          for (let i = 0; i < batchData.length; i++) {
            try {
              const row = batchData[i];
              const mappedData: Record<string, unknown> = { user_id: userId };

              for (const [sourceCol, targetField] of Object.entries(column_mapping)) {
                if (row[sourceCol] !== undefined && row[sourceCol] !== '') {
                  mappedData[targetField as string] = row[sourceCol];
                }
              }

              const { error } = await supabaseClient.from(entity_type).insert(mappedData);
              if (error) {
                failedCount++;
                errors.push({ 
                  row: startIdx + i + 1, 
                  field: 'unknown', 
                  error: error.message 
                });
              } else {
                successCount++;
              }
            } catch (e: unknown) {
              failedCount++;
              errors.push({ 
                row: startIdx + i + 1, 
                field: 'unknown', 
                error: e instanceof Error ? e.message : 'Unknown error' 
              });
            }
          }
        } else {
          successCount += mappedBatch.length;
        }
      } catch (e: unknown) {
        console.error(`Batch ${batchIndex + 1} error:`, e);
        // Mark all rows in batch as failed
        failedCount += batchData.length;
        errors.push({ 
          row: startIdx + 1, 
          field: 'batch', 
          error: `Batch failed: ${e instanceof Error ? e.message : 'Unknown error'}` 
        });
      }

      // Update progress after each batch
      const processedRows = endIdx;
      const progress = Math.round((processedRows / data.length) * 100);
      
      await supabaseClient.from('import_jobs').update({ 
        progress, 
        processed_rows: processedRows,
        successful_rows: successCount,
        failed_rows: failedCount 
      }).eq('id', job_id);

      console.log(`Batch ${batchIndex + 1}/${totalBatches} complete. Progress: ${progress}%`);
    }

    // Finalize job
    const finalStatus = failedCount === data.length ? 'failed' : 
                        failedCount > 0 ? 'completed_with_errors' : 'completed';

    await supabaseClient.from('import_jobs').update({
      status: finalStatus,
      progress: 100,
      processed_rows: data.length,
      successful_rows: successCount,
      failed_rows: failedCount,
      errors: errors.length > 0 ? errors.slice(0, 100) : null, // Limit errors stored
      completed_at: new Date().toISOString(),
    }).eq('id', job_id);

    console.log(`Import job ${job_id} completed: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, successCount, failedCount, status: finalStatus }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Import error:', error);
    
    // Try to update job status to failed
    try {
      const { job_id } = await req.json().catch(() => ({}));
      if (job_id) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseClient.from('import_jobs').update({
          status: 'failed',
          errors: [{ row: 0, field: 'system', error: error instanceof Error ? error.message : 'Unknown error' }],
          completed_at: new Date().toISOString(),
        }).eq('id', job_id);
      }
    } catch (e) {
      console.error('Failed to update job status:', e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
