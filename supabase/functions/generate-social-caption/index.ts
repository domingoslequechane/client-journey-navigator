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
${hasMedia ? 'Analise a mídia fornecida e crie uma legenda baseada no que vê.' : 'Crie uma legenda comercial para a marca.'}

${clientContext}

OBJETIVO DA POSTAGEM: ${objective || "venda"}
TONALIDADE: ${toneDesc}
TAMANHO: ${lengthDesc}
CONTEXTO ADICIONAL: ${topic || "Nenhum detalhe adicional"}

REGRAS:
1. Escreva APENAS o conteúdo da legenda.
2. Use EMOJIS relevantes para tornar a leitura mais dinâmica, amigável e menos cansativa, adaptando ao objetivo e tom de voz.
3. Formate o texto com quebras de linha e parágrafos para facilitar a leitura.
4. PROIBIDO: Usar TÍTULOS, Headlines, ou rótulos como "Legenda:", "Opção 1:".
5. Proibido palavras como "marketing", "algoritmo", "engajamento", "redes sociais".
6. Escreva de forma orgânica e humana.
7. Inclua uma linha em branco antes das hashtags.
8. Coloque no máximo 5 hashtags relevantes de forma organizada.`;

    // Build message - pass images as direct URLs or base64
    const userContent: any[] = [{ type: "text", text: prompt }];
    let imageAdded = false;
    let imageCount = 0;

    // Priority 1: base64 from freshly uploaded local files
    if (media_data && Array.isArray(media_data)) {
      for (const data of media_data) {
        if (typeof data === 'string' && data.startsWith('data:image')) {
          userContent.push({ type: "image_url", image_url: { url: data, detail: "low" } });
          imageAdded = true;
          imageCount++;
        }
      }
    }

    // Priority 2: direct remote URLs
    if (media_urls && Array.isArray(media_urls)) {
      const imageUrls = (media_urls as string[]).filter(
        (url: string) => !(/\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video'))
      );
      for (const imageUrl of imageUrls) {
        userContent.push({ type: "image_url", image_url: { url: imageUrl, detail: "low" } });
        imageAdded = true;
        imageCount++;
      }
    }

    if (imageCount > 1) {
      userContent.push({
        type: "text",
        text: `\nOBSERVAÇÃO IMPORTANTE: Este post contém ${imageCount} imagens (Carrossel). Analise-as como um conjunto e use termos no PLURAL quando se referir ao conteúdo visual (ex: "estas fotos", "estas dicas"). Crie uma legenda que conecte todos os slides de forma estratégica.`
      });
    } else if (imageCount === 1) {
      userContent.push({
        type: "text",
        text: `\nOBSERVAÇÃO: Este post possui apenas 1 imagem. Use termos no SINGULAR (ex: "esta foto", "esta dica") e foque no detalhe desta única mídia.`
      });
    }

    console.log(`[generate-social-caption] Call: images=${imageCount}, calling GPT-4o`);

    const messages = [
      {
        role: "system",
        content: `Você é um redator comercial experiente e estrategista de redes sociais para a marca "${orgName}". 
        Sua missão é criar legendas que convertem e engajam. Sempre gere uma legenda baseada na imagem e no contexto.
        Adapte sua linguagem (singular/plural) ao número de imagens detectadas.`
      },
      { role: "user", content: userContent }
    ];

    const startTimeAI = Date.now();
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    const aiText = await aiResponse.text();
    const durationAI = Date.now() - startTimeAI;
    console.log(`[generate-social-caption] AI response received in ${durationAI}ms. Status: ${aiResponse.status}`);

    if (!aiResponse.ok) {
      console.error("[generate-social-caption] AI gateway error:", aiText.substring(0, 1000));
      return new Response(JSON.stringify({
        error: "A IA encontrou um problema temporário.",
        details: aiText.substring(0, 200),
        status: aiResponse.status
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let aiData: any = {};
    try {
      aiData = JSON.parse(aiText);
    } catch (e) {
      console.error("[generate-social-caption] Failed to parse AI response:", e);
      return new Response(JSON.stringify({ error: "Resposta inválida da IA. Tente novamente." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const caption = aiData.choices?.[0]?.message?.content || "";
    if (!caption) {
      console.error("[generate-social-caption] Empty content in AI response");
      return new Response(JSON.stringify({ error: "A IA não conseguiu gerar o conteúdo. Tente mudar o tópico ou a imagem." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[generate-social-caption] Success! Caption length: ${caption.length}`);
    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("[generate-social-caption] CRITICAL ERROR:", error);
    const msg = error instanceof Error ? error.message : "Erro interno desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
