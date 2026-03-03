const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat/completions";

const TRANSCRIPTION_PROMPT = `Eres un asistente médico especializado en transcripción de consultas médicas.
Recibiras un audio de una consulta médica. Tu tarea es:

1. Transcribir TODO el contenido del audio fielmente
2. Identificar los hablantes como "Médico:" y "Paciente:" cuando sea posible distinguirlos
3. Mantener el orden cronológico de la conversación
4. Incluir pausas relevantes como [pausa] y sonidos relevantes como [tos], [respiración profunda]
5. No omitir información médica por mínima que sea

Responde SOLO con la transcripción, sin comentarios adicionales.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const { audio_base64, mime_type } = await req.json();
    if (!audio_base64) throw new Error('audio_base64 is required');

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const mediaType = mime_type || 'audio/webm';

    const response = await fetch(LOVABLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: TRANSCRIPTION_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'input_audio',
                input_audio: {
                  data: audio_base64,
                  format: mediaType.includes('wav') ? 'wav' : mediaType.includes('mp3') ? 'mp3' : 'wav',
                },
              },
              { type: 'text', text: 'Transcribe este audio de consulta médica.' },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${err}`);
    }

    const data = await response.json();
    const transcript = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
