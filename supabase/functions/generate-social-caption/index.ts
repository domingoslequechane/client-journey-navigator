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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { platforms, content_type, media_urls, tone, length, topic } = await req.json();

    const toneMap: Record<string, string> = {
      direto: "Direto e objetivo, sem rodeios",
      casual: "Casual e descontraído, linguagem informal",
      persuasivo: "Persuasivo e convincente, com call-to-action",
      alegre: "Alegre e animado, com energia positiva",
      amigavel: "Amigável e acolhedor, próximo do público",
    };

    const lengthMap: Record<string, string> = {
      curta: "CURTA: Máximo 1-2 frases. Seja extremamente conciso e direto. Não ultrapasse 150 caracteres no texto principal (sem contar hashtags).",
      media: "MÉDIA: Entre 3-5 frases. Desenvolva a ideia de forma moderada, entre 150-400 caracteres no texto principal (sem contar hashtags).",
      longa: "LONGA: 1-2 parágrafos completos. Desenvolva bem o assunto com detalhes, entre 400-800 caracteres no texto principal (sem contar hashtags).",
    };

    const platformNames = (platforms || []).join(", ") || "redes sociais";
    const toneLabel = toneMap[tone] || "Profissional";
    const lengthLabel = lengthMap[length] || lengthMap["media"];
    const contentTypeLabel = content_type || "feed";

    let mediaContext = "";
    if (media_urls && media_urls.length > 0) {
      mediaContext = `\nO post contém ${media_urls.length} mídia(s) anexada(s). Analise o contexto visual para criar uma legenda relevante.`;
      if (media_urls.length > 1) {
        mediaContext += ` É um carrossel com ${media_urls.length} imagens/vídeos.`;
      }
    }

    let topicContext = "";
    if (topic && topic.trim()) {
      topicContext = `\nTema/assunto fornecido pelo usuário: ${topic}`;
    } else if (media_urls && media_urls.length > 0) {
      topicContext = `\nNenhum tema foi especificado. Analise o conteúdo visual das mídias e crie uma legenda criativa e relevante baseada no que você interpreta do contexto.`;
    } else {
      topicContext = `\nNenhum tema foi especificado e não há mídias. Crie uma legenda genérica e envolvente para redes sociais.`;
    }

    const prompt = `Gere uma legenda profissional para um post de ${contentTypeLabel} nas plataformas: ${platformNames}.

Tom de voz: ${toneLabel}

TAMANHO OBRIGATÓRIO: ${lengthLabel}
${topicContext}
${mediaContext}

REGRAS OBRIGATÓRIAS:
- Escreva APENAS em português brasileiro
- Inclua emojis relevantes ao longo do texto
- OBRIGATÓRIO: Adicione entre 5-10 hashtags relevantes no final, separadas por espaço (ex: #marketing #vendas)
- Adapte o estilo ao tipo de conteúdo (${contentTypeLabel})
- NÃO inclua instruções, explicações ou comentários - apenas a legenda pronta para publicar
- Considere os limites de caracteres de cada plataforma
- RESPEITE RIGOROSAMENTE o tamanho solicitado: ${length === 'curta' ? 'seja MUITO curto' : length === 'longa' ? 'desenvolva BASTANTE' : 'tamanho moderado'}
- As hashtags devem ser específicas e relevantes ao conteúdo, não genéricas`;

    // Build messages with media if available
    const userContent: any[] = [{ type: "text", text: prompt }];
    
    if (media_urls && media_urls.length > 0) {
      for (const url of media_urls.slice(0, 4)) {
        userContent.push({
          type: "image_url",
          image_url: { url },
        });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em social media e copywriting para o mercado brasileiro. Gere legendas criativas, envolventes e com hashtags relevantes. SEMPRE inclua hashtags no final da legenda. SEMPRE complete a resposta inteira sem cortar." },
          { role: "user", content: userContent },
        ],
        temperature: 0.8,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
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
