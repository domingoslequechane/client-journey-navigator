import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("[generate-social-caption] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('organization_id, current_organization_id').eq('id', user.id).maybeSingle();
    const userOrgId = profile?.current_organization_id || profile?.organization_id;
    
    let orgName = "nossa marca";
    if (userOrgId) {
       const { data: org } = await supabaseAuth.from('organizations').select('name').eq('id', userOrgId).maybeSingle();
       if (org?.name) orgName = org.name;
    }

    if (!userOrgId) {
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { platforms, content_type, media_data, tone, length, topic, client_id } = await req.json();

    let clientData: any = null;
    let clientContext = "";
    if (client_id) {
      const { data: client } = await supabaseAuth
        .from('clients')
        .select('company_name, services, notes')
        .eq('id', client_id)
        .eq('organization_id', userOrgId)
        .maybeSingle();

      if (client) {
        clientData = client;
        clientContext = "\nDADOS DO CLIENTE/MARCA:\nEmpresa: " + client.company_name + "\nServiços: " + (client.services?.join(', ') || 'N/A') + "\nNotas Estratégicas: " + (client.notes || 'N/A') + "\n";
      }
    }

    const toneMap: Record<string, string> = {
      direto: "Direto e objetivo, sem rodeios",
      casual: "Casual e descontraído, linguagem informal",
      persuasivo: "Persuasivo e convincente, com call-to-action forte",
      alegre: "Alegre e animado, com energia positiva",
      amigavel: "Amigável e acolhedor, próximo do público",
    };

    const lengthMap: Record<string, string> = {
      curta: "CURTA: Máximo 150 caracteres. Seja extremamente conciso.",
      media: "MÉDIA: Entre 150-400 caracteres. Desenvolva a ideia de forma moderada.",
      longa: "LONGA: Entre 400-800 caracteres. Desenvolva bem o assunto com detalhes.",
    };

    const platformNames = (platforms || []).join(", ") || "redes sociais";

    const toneDesc = toneMap[tone] || toneMap.direto;
    const lengthDesc = lengthMap[length] || lengthMap.media;

    const prompt = `Analise detalhadamente o flyer ou imagem fornecida (se houver) e identifique o nicho, produto/serviço, proposta de valor, oferta e público-alvo.

${clientContext}

TONALIDADE EXIGIDA: ${toneDesc}
TAMANHO DO TEXTO: ${lengthDesc}

Com base nesses dados e na análise visual, você deve escrever como se fosse o PROPRIETÁRIO da marca "${clientData?.company_name || orgName}".

INSTRUÇÕES DE SAÍDA:
Gere os seguintes itens:

1️⃣ LEGENDA PRINCIPAL: Altamente persuasiva para Instagram/Facebook.
2️⃣ VARIAÇÕES CRIATIVAS: Duas legendas com abordagens diferentes (ex: uma focada em benefício e outra em curiosidade).
3️⃣ VERSÃO STORIES: Legenda curta e direta para engajamento rápido.
4️⃣ HASHTAGS: 5 a 10 hashtags altamente relevantes ao nicho detectado (NÃO use hashtags de marketing se o nicho for outro).

REGRAS CRÍTICAS:
- IDIOMA: Português de Portugal (PT-PT) ou Brasil (PT-BR) conforme o contexto do cliente.
- PERSONA: NUNCA diga que é uma IA ou agência. Você é o dono da loja/empresa.
- BANIMENTO: Jamais mencione "gestão de redes sociais", "brilhar no online", "estratégias digitais" ou "marketing" (a menos que o cliente SEJA uma agência).
- ESTILO: Use emojis estratégicos, linguagem simples e envolvente.
- TEMA ESPECÍFICO: ${topic ? `O foco OBRIGATÓRIO deve ser: "${topic}".` : "Descreva o produto/benefício mostrado."}
- TAMANHO: Máximo de 150 palavras no total.

Retorne APENAS os blocos de texto formatados conforme acima, sem introduções ou explicações.`;

    let userContent: any = prompt;
    if (media_data && media_data.length > 0) {
      const parts: any[] = [{ type: "text", text: prompt }];
      // Set a larger limit (2MB) for base64 strings to ensure images are processed
      for (const data of media_data.slice(0, 2)) {
        if (typeof data === 'string' && data.length < 2000000) {
          parts.push({ type: "image_url", image_url: { url: data } });
        } else if (typeof data === 'string') {
          console.warn("[generate-social-caption] Image too large, skipping. Length:", data.length);
        }
      }
      if (parts.length > 1) userContent = parts;
    }

    const aiModel = "google/gemini-2.0-flash";
    console.log("[generate-social-caption] Calling AI gateway with model:", aiModel);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: "Você é um especialista em análise de flyers e redator comercial de elite. Você identifica produtos e ofertas em imagens e escreve legendas que vendem como se fosse o dono do negócio. Você odeia jargões de marketing e foca 100% no produto/serviço mostrado." },
          { role: "user", content: userContent },
        ],
        temperature: 0.8,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-social-caption] AI gateway error:", response.status, errorText);
      let errorMessage = "AI gateway error: " + response.status;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch (e) { }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("[generate-social-caption] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao gerar legenda" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
