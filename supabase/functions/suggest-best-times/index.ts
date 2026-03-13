import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { platforms, content_type, slots_count } = await req.json();
    const platformNames = (platforms || []).join(", ") || "redes sociais";
    const count = slots_count || 3;

    const prompt = `Você é um especialista em marketing digital e social media. Sugira os ${count} melhores horários para publicar um post do tipo "${content_type || 'feed'}" nas plataformas: ${platformNames}.

Considere:
- Os melhores horários de engajamento para cada plataforma no mercado brasileiro
- Dias da semana com melhor performance
- Horários de pico de audiência

Retorne APENAS um JSON válido no formato:
[
  {"date": "YYYY-MM-DD", "time": "HH:mm", "reason": "breve motivo"}
]

Use datas a partir de amanhã. Não inclua nenhum texto fora do JSON.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        system_instruction: { parts: [{ text: "Você é um assistente que retorna apenas JSON válido, sem markdown ou explicações." }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          response_mime_type: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    let jsonStr = raw.trim();

    let slots;
    try { slots = JSON.parse(jsonStr); } catch { console.error("Failed to parse AI response:", raw); slots = []; }

    return new Response(JSON.stringify({ slots }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Suggest best times error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao sugerir horários" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});