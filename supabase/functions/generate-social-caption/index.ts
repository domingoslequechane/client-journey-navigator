import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { platforms, content_type, media_urls, tone, length, topic } = await req.json();

    const toneMap: Record<string, string> = {
      direto: "Direto e objetivo",
      casual: "Casual e descontraído",
      persuasivo: "Persuasivo e convincente",
      alegre: "Alegre e animado",
      amigavel: "Amigável e acolhedor",
    };

    const lengthMap: Record<string, string> = {
      curta: "Curta (1-2 frases)",
      media: "Média (3-5 frases)",
      longa: "Longa (1-2 parágrafos)",
    };

    const platformNames = (platforms || []).join(", ") || "redes sociais";
    const toneLabel = toneMap[tone] || "Profissional";
    const lengthLabel = lengthMap[length] || "Média (3-5 frases)";
    const contentTypeLabel = content_type || "feed";

    let mediaContext = "";
    if (media_urls && media_urls.length > 0) {
      mediaContext = `\nO post contém ${media_urls.length} mídia(s) anexada(s). Considere isso na legenda.`;
      if (media_urls.length > 1) {
        mediaContext += ` É um carrossel com ${media_urls.length} imagens/vídeos.`;
      }
    }

    const prompt = `Gere uma legenda profissional para um post de ${contentTypeLabel} nas plataformas: ${platformNames}.

Tom de voz: ${toneLabel}
Tamanho: ${lengthLabel}
${topic ? `Tema/assunto: ${topic}` : ""}
${mediaContext}

REGRAS:
- Escreva em português
- Inclua emojis relevantes
- Sugira 3-5 hashtags relevantes no final
- Adapte o estilo ao tipo de conteúdo (${contentTypeLabel})
- NÃO inclua instruções ou explicações, apenas a legenda pronta
- Considere os limites de caracteres de cada plataforma`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em social media e copywriting. Gere legendas criativas e envolventes." },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate caption error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro ao gerar legenda" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
