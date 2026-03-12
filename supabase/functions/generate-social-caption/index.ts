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
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('organization_id, current_organization_id')
      .eq('id', user.id)
      .maybeSingle();

    const userOrgId = profile?.current_organization_id || profile?.organization_id;
    if (!userOrgId) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let orgName = "nossa marca";
    const { data: org } = await supabaseAuth.from('organizations').select('name').eq('id', userOrgId).maybeSingle();
    if (org?.name) orgName = org.name;

    const body = await req.json();
    const { media_data, media_urls, tone, length, topic, client_id, objective } = body;

    console.log(`[generate-social-caption] Request: tone=${tone}, length=${length}, objective=${objective}, media_data_count=${media_data?.length || 0}, media_urls_count=${media_urls?.length || 0}`);

    // Fetch client data
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
        clientContext = `\nDADOS DO CLIENTE/MARCA:\nEmpresa: ${client.company_name}\nServiços: ${client.services?.join(', ') || 'N/A'}\nNotas: ${client.notes || 'N/A'}\n`;
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

    const toneDesc = toneMap[tone] || toneMap.direto;
    const lengthDesc = lengthMap[length] || lengthMap.media;
    const hasMedia = (media_data?.length > 0) || (media_urls?.length > 0);

    const prompt = `Você é o proprietário da marca "${clientData?.company_name || orgName}".
${hasMedia ? 'Analise a imagem fornecida e crie uma legenda baseada no que vê.' : 'Crie uma legenda comercial para a marca.'}

${clientContext}

OBJETIVO DA POSTAGEM: ${objective || "venda"}
TONALIDADE: ${toneDesc}
TAMANHO: ${lengthDesc}
CONTEXTO ADICIONAL: ${topic || "Descrever o produto/serviço"}

REGRAS:
1. Fale apenas do que está na imagem e do negócio do cliente
2. Proibido: "redes sociais", "marketing", "algoritmo", "engajamento"
3. Escreva como uma pessoa real vendendo para outra pessoa real
4. Se houver preços, nomes ou contatos na imagem, inclua-os

ESTRUTURA OBRIGATÓRIA:
1️⃣ LEGENDA PRINCIPAL: (máx. 150 caracteres)
2️⃣ VARIAÇÕES: Duas alternativas curtas
3️⃣ STORIES: Uma frase curta
4️⃣ HASHTAGS: 3-5 relevantes

Responda APENAS os blocos numerados.`;

    // Build message - pass image as direct URL (GPT-4o Vision can read public URLs directly)
    const userContent: any[] = [{ type: "text", text: prompt }];

    // Priority 1: base64 from freshly uploaded local files (small, already compressed by client)
    let imageAdded = false;
    if (media_data && Array.isArray(media_data)) {
      for (const data of media_data.slice(0, 1)) {
        if (typeof data === 'string' && data.startsWith('data:image')) {
          userContent.push({ type: "image_url", image_url: { url: data, detail: "low" } });
          imageAdded = true;
          console.log("[generate-social-caption] Added base64 image from client");
          break;
        }
      }
    }

    // Priority 2: direct remote URLs (GPT-4o fetches them directly - no base64 conversion needed)
    if (!imageAdded && media_urls && Array.isArray(media_urls)) {
      const imageUrls = (media_urls as string[]).filter(
        (url: string) => !(/\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video'))
      );
      if (imageUrls.length > 0) {
        const imageUrl = imageUrls[0];
        userContent.push({ type: "image_url", image_url: { url: imageUrl, detail: "low" } });
        imageAdded = true;
        console.log(`[generate-social-caption] Added direct URL image: ${imageUrl.substring(0, 80)}`);
      }
    }

    console.log(`[generate-social-caption] Image added: ${imageAdded}, calling GPT-4o Vision`);

    const messages = [
      {
        role: "system",
        content: "Você é um redator comercial experiente. SEMPRE gere uma legenda baseada na imagem e no contexto do cliente. Nunca recuse. Nunca peça mais informações."
      },
      { role: "user", content: userContent }
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const aiText = await aiResponse.text();
    console.log(`[generate-social-caption] AI response: status=${aiResponse.status}, body_length=${aiText.length}`);

    if (!aiResponse.ok) {
      console.error("[generate-social-caption] AI gateway error:", aiText.substring(0, 500));
      // Return 200 with error field so the client shows a useful message
      return new Response(JSON.stringify({ error: `Erro da IA (${aiResponse.status}): verifique os logs da função` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let aiData: any = {};
    try { aiData = JSON.parse(aiText); } catch (e) {
      console.error("[generate-social-caption] Failed to parse AI response:", e);
    }

    const caption = aiData.choices?.[0]?.message?.content || "";
    if (!caption) {
      console.error("[generate-social-caption] No caption in response:", JSON.stringify(aiData).substring(0, 300));
      return new Response(JSON.stringify({ error: "A IA não retornou conteúdo. Tente novamente." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[generate-social-caption] Success! Caption length: ${caption.length}`);
    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("[generate-social-caption] Unhandled error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
