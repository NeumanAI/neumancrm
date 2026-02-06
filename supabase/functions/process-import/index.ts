import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid fields per entity type - prevents inserting into non-existent columns
const VALID_FIELDS: Record<string, string[]> = {
  contacts: [
    'first_name', 'last_name', 'email', 'phone', 'mobile',
    'whatsapp_number', 'job_title', 'department', 'notes',
    'linkedin_url', 'twitter_url', 'instagram_username', 'source'
  ],
  companies: [
    'name', 'domain', 'website', 'industry', 'phone',
    'address', 'city', 'country', 'employee_count', 'revenue', 'description',
    'linkedin_url', 'twitter_url'
  ],
  opportunities: [
    'title', 'value', 'currency', 'probability', 'status',
    'expected_close_date', 'description'
  ],
  activities: [
    'title', 'type', 'description', 'due_date', 'priority', 'completed'
  ]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let jobId: string | null = null;

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { job_id, entity_type, data, column_mapping, settings } = await req.json();
    jobId = job_id;
    
    console.log(`[IMPORT] Starting job ${job_id} for ${entity_type}, ${data.length} rows`);

    // Update job status to processing
    await supabaseClient.from('import_jobs').update({ 
      status: 'processing', 
      started_at: new Date().toISOString() 
    }).eq('id', job_id);

    // Get user_id from job
    const { data: job } = await supabaseClient.from('import_jobs').select('user_id').eq('id', job_id).single();
    const userId = job?.user_id;

    if (!userId) {
      throw new Error('No user_id found for import job');
    }

    // Get organization_id from team_members
    const { data: teamMember } = await supabaseClient
      .from('team_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    const organizationId = teamMember?.organization_id;
    console.log(`[IMPORT] User ${userId}, Organization: ${organizationId || 'none'}`);

    // Filter column mapping to only valid fields
    const validFields = VALID_FIELDS[entity_type] || [];
    const validMapping: Record<string, string> = {};
    const invalidFields: string[] = [];

    for (const [sourceCol, targetField] of Object.entries(column_mapping)) {
      if (validFields.includes(targetField as string)) {
        validMapping[sourceCol] = targetField as string;
      } else {
        invalidFields.push(`${sourceCol} → ${targetField}`);
      }
    }

    console.log(`[IMPORT] Valid mappings: ${Object.keys(validMapping).length}`);
    if (invalidFields.length > 0) {
      console.log(`[IMPORT] Invalid fields ignored: ${invalidFields.join(', ')}`);
    }

    // Check if we have any valid mappings
    if (Object.keys(validMapping).length === 0) {
      throw new Error(`No valid column mappings found. Invalid fields: ${invalidFields.join(', ')}`);
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: { row: number; field: string; error: string }[] = [];

    // Process in batches for performance
    const batchSize = 100;
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, data.length);
      const batchData = data.slice(startIdx, endIdx);

      try {
        // Map all rows in batch using only valid fields
        const mappedBatch = batchData.map((row: Record<string, unknown>, idx: number) => {
          const mappedData: Record<string, unknown> = { 
            user_id: userId,
          };

          // Add organization_id if available
          if (organizationId) {
            mappedData.organization_id = organizationId;
          }

          // Map only valid fields
          for (const [sourceCol, targetField] of Object.entries(validMapping)) {
            const value = row[sourceCol];
            if (value !== undefined && value !== null && value !== '') {
              mappedData[targetField] = value;
            }
          }

          // Handle empty email for contacts - generate placeholder
          if (entity_type === 'contacts' && !mappedData.email) {
            const firstName = (mappedData.first_name || 'contact') as string;
            const lastName = (mappedData.last_name || '') as string;
            const namePart = `${firstName}${lastName ? '.' + lastName : ''}`.toLowerCase().replace(/\s+/g, '.');
            const shortId = crypto.randomUUID().slice(0, 8);
            mappedData.email = `${namePart}.import.${shortId}@placeholder.local`;
          }

          return mappedData;
        });

        // Batch insert
        const { error: batchError } = await supabaseClient
          .from(entity_type)
          .insert(mappedBatch);

        if (batchError) {
          // If batch fails, try individual inserts to identify problematic rows
          console.log(`[IMPORT] Batch ${batchIndex + 1} failed: ${batchError.message}`);
          
          for (let i = 0; i < batchData.length; i++) {
            try {
              const row = batchData[i];
              const mappedData: Record<string, unknown> = { 
                user_id: userId,
              };

              if (organizationId) {
                mappedData.organization_id = organizationId;
              }

              for (const [sourceCol, targetField] of Object.entries(validMapping)) {
                const value = row[sourceCol];
                if (value !== undefined && value !== null && value !== '') {
                  mappedData[targetField] = value;
                }
              }

              // Handle empty email for contacts
              if (entity_type === 'contacts' && !mappedData.email) {
                const firstName = (mappedData.first_name || 'contact') as string;
                const lastName = (mappedData.last_name || '') as string;
                const namePart = `${firstName}${lastName ? '.' + lastName : ''}`.toLowerCase().replace(/\s+/g, '.');
                const shortId = crypto.randomUUID().slice(0, 8);
                mappedData.email = `${namePart}.import.${shortId}@placeholder.local`;
              }

              const { error } = await supabaseClient.from(entity_type).insert(mappedData);
              if (error) {
                failedCount++;
                errors.push({ 
                  row: startIdx + i + 1, 
                  field: 'insert', 
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
        console.error(`[IMPORT] Batch ${batchIndex + 1} error:`, e);
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

      console.log(`[IMPORT] Batch ${batchIndex + 1}/${totalBatches}: ${progress}% (${successCount} success, ${failedCount} failed)`);
    }

    // Finalize job
    const finalStatus = failedCount === data.length ? 'failed' : 
                        failedCount > 0 ? 'completed_with_errors' : 'completed';

    // Include info about invalid fields in errors if any
    const allErrors = [...errors];
    if (invalidFields.length > 0) {
      allErrors.unshift({
        row: 0,
        field: 'mapping',
        error: `Campos ignorados (no existen en ${entity_type}): ${invalidFields.join(', ')}`
      });
    }

    await supabaseClient.from('import_jobs').update({
      status: finalStatus,
      progress: 100,
      processed_rows: data.length,
      successful_rows: successCount,
      failed_rows: failedCount,
      errors: allErrors.length > 0 ? allErrors.slice(0, 100) : null,
      completed_at: new Date().toISOString(),
    }).eq('id', job_id);

    console.log(`[IMPORT] Job ${job_id} completed: ${successCount} success, ${failedCount} failed, status: ${finalStatus}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        successCount, 
        failedCount, 
        status: finalStatus,
        invalidFieldsIgnored: invalidFields.length 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('[IMPORT] Fatal error:', error);
    
    // Try to update job status to failed
    if (jobId) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseClient.from('import_jobs').update({
          status: 'failed',
          errors: [{ row: 0, field: 'system', error: error instanceof Error ? error.message : 'Unknown error' }],
          completed_at: new Date().toISOString(),
        }).eq('id', jobId);
      } catch (e) {
        console.error('[IMPORT] Failed to update job status:', e);
      }
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
