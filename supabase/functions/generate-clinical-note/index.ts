import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

const SOAP_SYSTEM_PROMPT = `Eres un asistente médico especializado en generar notas clínicas estructuradas en formato SOAP.
A partir de la transcripción de una consulta médica, genera una nota clínica profesional con las siguientes secciones:

**S (Subjetivo):** Lo que el paciente reporta — síntomas, quejas, historia del problema actual, antecedentes relevantes mencionados.
**O (Objetivo):** Hallazgos clínicos observables — signos vitales, examen físico, resultados de laboratorio o estudios mencionados.
**A (Análisis):** Diagnóstico o diagnósticos diferenciales, interpretación clínica de los hallazgos.
**P (Plan):** Plan de tratamiento — medicamentos, estudios solicitados, referencias, seguimiento, indicaciones al paciente.

Responde SOLO en JSON con este formato exacto:
{
  "subjective": "...",
  "objective": "...",
  "analysis": "...",
  "plan": "..."
}

Usa lenguaje médico profesional pero claro. Si la transcripción no contiene información para alguna sección, indica "No se proporcionó información en la consulta."`;

const NARRATIVE_SYSTEM_PROMPT = `Eres un asistente médico especializado en generar notas clínicas narrativas.
A partir de la transcripción de una consulta médica, genera una nota clínica narrativa profesional que integre de forma fluida:
- Motivo de consulta
- Historia de la enfermedad actual
- Antecedentes relevantes
- Hallazgos del examen
- Impresión diagnóstica
- Plan terapéutico

Responde SOLO en JSON con este formato exacto:
{
  "full_note": "..."
}

Usa lenguaje médico profesional pero claro. Escribe en párrafos bien estructurados.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const { transcript, template, contact_id, patient_context } = await req.json();
    if (!transcript) throw new Error('transcript is required');

    const systemPrompt = template === 'narrative' ? NARRATIVE_SYSTEM_PROMPT : SOAP_SYSTEM_PROMPT;
    let userMessage = `Transcripción de la consulta:\n\n${transcript}`;
    if (patient_context) {
      userMessage = `Contexto del paciente: ${patient_context}\n\n${userMessage}`;
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch(LOVABLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse AI response');
    
    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
