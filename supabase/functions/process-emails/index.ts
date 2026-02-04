import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailData {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  body: string;
}

interface AIExtraction {
  contacts: Array<{
    name: string;
    email: string;
    job_title?: string;
    company?: string;
  }>;
  action_items: Array<{
    task: string;
    due_date?: string;
    assignee?: string;
  }>;
  opportunity: {
    detected: boolean;
    title?: string;
    estimated_value?: number;
  };
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
}

async function refreshGoogleToken(refreshToken: string): Promise<string> {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await response.json();
  if (tokens.error) {
    throw new Error(`Token refresh failed: ${tokens.error_description || tokens.error}`);
  }

  return tokens.access_token;
}

async function fetchEmails(accessToken: string, afterDate?: string): Promise<EmailData[]> {
  const query = afterDate 
    ? `after:${Math.floor(new Date(afterDate).getTime() / 1000)}` 
    : "newer_than:1d";

  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const listData = await listResponse.json();
  
  if (!listData.messages || listData.messages.length === 0) {
    console.log("No new emails found");
    return [];
  }

  const emails: EmailData[] = [];

  for (const msg of listData.messages.slice(0, 25)) {
    try {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      const msgData = await msgResponse.json();
      
      const headers = msgData.payload?.headers || [];
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

      let body = "";
      if (msgData.payload?.body?.data) {
        body = atob(msgData.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
      } else if (msgData.payload?.parts) {
        const textPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
        if (textPart?.body?.data) {
          body = atob(textPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
        }
      }

      // Truncate body to avoid token limits
      body = body.substring(0, 5000);

      emails.push({
        id: msg.id,
        threadId: msgData.threadId,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        to: getHeader("To").split(",").map((e: string) => e.trim()),
        date: getHeader("Date"),
        body,
      });
    } catch (err) {
      console.error(`Error fetching email ${msg.id}:`, err);
    }
  }

  return emails;
}

async function analyzeEmailWithAI(email: EmailData): Promise<AIExtraction> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const prompt = `Analiza este email y extrae información relevante para un CRM.

De: ${email.from}
Para: ${email.to.join(", ")}
Asunto: ${email.subject}
Fecha: ${email.date}

Contenido:
${email.body}

Extrae la siguiente información en JSON:
{
  "contacts": [{ "name": string, "email": string, "job_title": string (si se menciona), "company": string (si se menciona) }],
  "action_items": [{ "task": string (tarea/compromiso mencionado), "due_date": string (fecha si se menciona, formato YYYY-MM-DD), "assignee": string }],
  "opportunity": { "detected": boolean (true si hay indicios de oportunidad comercial), "title": string, "estimated_value": number (en USD si se menciona) },
  "summary": "resumen del email en 1-2 oraciones",
  "sentiment": "positive" | "neutral" | "negative"
}

Responde SOLO con el JSON, sin markdown ni explicaciones.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Eres un asistente de CRM que extrae información de emails. Responde siempre en JSON válido." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    console.error("AI request failed:", response.status);
    return {
      contacts: [],
      action_items: [],
      opportunity: { detected: false },
      summary: email.subject,
      sentiment: "neutral",
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  
  try {
    // Clean potential markdown code blocks
    const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanContent);
  } catch (err) {
    console.error("Failed to parse AI response:", content);
    return {
      contacts: [],
      action_items: [],
      opportunity: { detected: false },
      summary: email.subject,
      sentiment: "neutral",
    };
  }
}

function parseEmailAddress(emailString: string): { name: string; email: string } {
  const match = emailString.match(/(?:"?([^"]*)"?\s)?<?([^\s<>]+@[^\s<>]+)>?/);
  if (match) {
    return {
      name: match[1]?.trim() || match[2].split("@")[0],
      email: match[2].toLowerCase(),
    };
  }
  return { name: emailString, email: emailString };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's token to get their identity
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log("Processing emails for user:", userId);

    // Create service role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Gmail integration
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      return new Response(JSON.stringify({ error: "Gmail not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update sync status
    await supabase
      .from("integrations")
      .update({ sync_status: "syncing" })
      .eq("id", integration.id);

    let accessToken = integration.access_token;

    // Check if token is expired
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      console.log("Token expired, refreshing...");
      try {
        accessToken = await refreshGoogleToken(integration.refresh_token);
        
        // Update token in database
        await supabase
          .from("integrations")
          .update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          .eq("id", integration.id);
      } catch (err) {
        console.error("Token refresh failed:", err);
        await supabase
          .from("integrations")
          .update({ 
            sync_status: "error",
            error_message: "Token refresh failed. Please reconnect Gmail.",
          })
          .eq("id", integration.id);
        
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch emails
    const emails = await fetchEmails(accessToken, integration.last_synced_at);
    console.log(`Found ${emails.length} emails to process`);

    let processedCount = 0;
    let createdContacts = 0;
    let createdTasks = 0;

    for (const email of emails) {
      try {
        // Check if already processed
        const { data: existing } = await supabase
          .from("timeline_entries")
          .select("id")
          .eq("user_id", userId)
          .eq("metadata->gmail_message_id", email.id)
          .single();

        if (existing) {
          console.log(`Email ${email.id} already processed, skipping`);
          continue;
        }

        // Analyze with AI
        const extraction = await analyzeEmailWithAI(email);

        // Parse sender
        const sender = parseEmailAddress(email.from);

        // Find or create contact for sender
        let contactId: string | null = null;
        const { data: existingContact } = await supabase
          .from("contacts")
          .select("id")
          .eq("user_id", userId)
          .eq("email", sender.email)
          .single();

        if (existingContact) {
          contactId = existingContact.id;
        } else if (sender.email && !sender.email.includes("noreply") && !sender.email.includes("no-reply")) {
          // Create new contact
          const nameParts = sender.name.split(" ");
          const contactData = extraction.contacts.find(c => c.email === sender.email);

          const { data: newContact } = await supabase
            .from("contacts")
            .insert({
              user_id: userId,
              email: sender.email,
              first_name: nameParts[0] || sender.name,
              last_name: nameParts.slice(1).join(" ") || null,
              job_title: contactData?.job_title || null,
            })
            .select("id")
            .single();

          if (newContact) {
            contactId = newContact.id;
            createdContacts++;
          }
        }

        // Create timeline entry
        const participants = [
          { ...sender, role: "from" },
          ...email.to.map(t => ({ ...parseEmailAddress(t), role: "to" })),
        ];

        await supabase
          .from("timeline_entries")
          .insert({
            user_id: userId,
            contact_id: contactId,
            entry_type: "email",
            source: "gmail",
            subject: email.subject,
            body: email.body.substring(0, 2000),
            summary: extraction.summary,
            participants,
            action_items: extraction.action_items,
            metadata: {
              gmail_message_id: email.id,
              gmail_thread_id: email.threadId,
              sentiment: extraction.sentiment,
              opportunity_detected: extraction.opportunity.detected,
            },
            occurred_at: new Date(email.date).toISOString(),
          });

        // Create tasks from action items
        for (const item of extraction.action_items) {
          if (item.task) {
            await supabase
              .from("activities")
              .insert({
                user_id: userId,
                contact_id: contactId,
                title: item.task,
                type: "task",
                due_date: item.due_date || null,
                priority: "medium",
                description: `Tarea extraída del email: ${email.subject}`,
              });
            createdTasks++;
          }
        }

        processedCount++;
      } catch (err) {
        console.error(`Error processing email ${email.id}:`, err);
      }
    }

    // Update integration status
    await supabase
      .from("integrations")
      .update({
        sync_status: "idle",
        last_synced_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", integration.id);

    console.log(`Sync complete: ${processedCount} emails, ${createdContacts} contacts, ${createdTasks} tasks`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        contacts_created: createdContacts,
        tasks_created: createdTasks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process emails error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
