import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Simple API key validation (in production, use a proper secret)
    if (!apiKey || apiKey.length < 10) {
      return new Response(
        JSON.stringify({ error: "API key requerida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    
    // Expected payload format:
    // {
    //   user_id: "uuid", // The CRM user who owns this integration
    //   conversation: {
    //     contact_name: "Juan Pérez",
    //     contact_phone: "+34612345678",
    //     messages: [{ role: "customer" | "agent", content: "...", timestamp: "..." }]
    //   }
    // }

    const { user_id, conversation } = body;

    if (!user_id || !conversation) {
      return new Response(
        JSON.stringify({ error: "user_id y conversation son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing WhatsApp conversation for user:", user_id);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Build conversation text for AI analysis
    const conversationText = conversation.messages
      ?.map((m: any) => `${m.role}: ${m.content}`)
      .join("\n") || "";

    // Use AI to extract information
    if (LOVABLE_API_KEY && conversationText) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Eres un analizador de conversaciones de WhatsApp para un CRM. 
Extrae la siguiente información del texto de la conversación y responde SOLO en JSON:
{
  "contact": {
    "first_name": "nombre",
    "last_name": "apellido",
    "phone": "teléfono",
    "company_name": "empresa si se menciona",
    "job_title": "cargo si se menciona"
  },
  "tasks": [
    { "title": "tarea identificada", "due_date": "fecha si se menciona", "priority": "high/medium/low" }
  ],
  "opportunity": {
    "detected": true/false,
    "title": "descripción corta",
    "value": número estimado o null
  },
  "summary": "resumen breve de la conversación"
}`
              },
              {
                role: "user",
                content: `Contacto: ${conversation.contact_name || 'Desconocido'}\nTeléfono: ${conversation.contact_phone || 'N/A'}\n\nConversación:\n${conversationText}`
              }
            ],
            temperature: 0.3,
          }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        // Parse AI response
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0]);
            
            // Create contact if we have enough info
            if (extracted.contact?.first_name || conversation.contact_phone) {
              const { data: existingContact } = await supabase
                .from('contacts')
                .select('id')
                .eq('user_id', user_id)
                .eq('phone', conversation.contact_phone)
                .single();

              if (!existingContact) {
                const { error: contactError } = await supabase
                  .from('contacts')
                  .insert({
                    user_id,
                    first_name: extracted.contact?.first_name || conversation.contact_name?.split(' ')[0] || 'WhatsApp',
                    last_name: extracted.contact?.last_name || conversation.contact_name?.split(' ').slice(1).join(' ') || '',
                    phone: conversation.contact_phone,
                    job_title: extracted.contact?.job_title,
                    notes: `Importado desde WhatsApp. ${extracted.summary || ''}`,
                    email: `whatsapp_${Date.now()}@placeholder.local`, // Temporary email
                  });

                if (contactError) {
                  console.error("Error creating contact:", contactError);
                } else {
                  // Create notification
                  await supabase.from('notifications').insert({
                    user_id,
                    type: 'new_contact',
                    title: 'Nuevo contacto desde WhatsApp',
                    message: `${extracted.contact?.first_name || conversation.contact_name} fue agregado automáticamente`,
                    priority: 'normal',
                  });
                }
              }
            }

            // Create tasks if detected
            if (extracted.tasks?.length > 0) {
              for (const task of extracted.tasks) {
                await supabase.from('activities').insert({
                  user_id,
                  title: task.title,
                  type: 'task',
                  priority: task.priority || 'medium',
                  description: `Tarea extraída de conversación de WhatsApp con ${conversation.contact_name || 'contacto'}`,
                });
              }
            }

            console.log("WhatsApp conversation processed successfully");
          }
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
        }
      } catch (aiError) {
        console.error("AI processing error:", aiError);
      }
    }

    // Update integration last_synced_at
    await supabase
      .from('integrations')
      .update({ 
        last_synced_at: new Date().toISOString(),
        sync_status: 'idle'
      })
      .eq('user_id', user_id)
      .eq('provider', 'whatsapp');

    return new Response(
      JSON.stringify({ success: true, message: "Conversación procesada" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("WhatsApp ingestion error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
