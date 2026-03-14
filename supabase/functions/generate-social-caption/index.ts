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
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
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
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
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
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave API do Gemini não configurada" }), {
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
      direto: "Profissional, direto ao ponto e focado em benefícios",
      casual: "Moderno, leve e conectivo, mas sem perder a autoridade",
      persuasivo: "Focado em conversão, usando gatilhos mentais e urgência",
      alegre: "Enthusiástico, vibrante e inspirador",
      amigavel: "Acolhedor, focado em comunidade e relacionamento",
    };

    const lengthMap: Record<string, string> = {
      curta: "AIDA ULTRA-CONCISO: OBRIGATÓRIO máximo 150 caracteres TOTAIS. Se passar de 150, você falhou. Estrutura: Gancho + Benefício + CTA + 2 hashtags.",
      media: "AIDA Estruturado: Entre 150-400 caracteres.",
      longa: "Storytelling/Educativo: 400-800 caracteres.",
    };

    const toneDesc = toneMap[tone] || toneMap.direto;
    const lengthDesc = lengthMap[length] || lengthMap.media;

    // --- BUILD MULTIMODAL CONTENT ---
    const userContent: any[] = [];
    let imageCount = 0;

    // Helper functions
    const getBase64FromDataUrl = (dataUrl: string) => {
      const parts = dataUrl.split(',');
      return parts.length > 1 ? parts[1] : parts[0];
    };

    const getMimeTypeFromDataUrl = (dataUrl: string) => {
      const match = dataUrl.match(/^data:([^;]+);/);
      return match ? match[1] : 'image/jpeg';
    };

    // 1. IMAGES FIRST (Critical for Gemini Vision)
    if (media_data && Array.isArray(media_data)) {
      for (const data of media_data) {
        if (typeof data === 'string' && data.startsWith('data:image')) {
          userContent.push({
            inlineData: {
              mimeType: getMimeTypeFromDataUrl(data),
              data: getBase64FromDataUrl(data)
            }
          });
          imageCount++;
        }
      }
    }

    if (media_urls && Array.isArray(media_urls)) {
      const imageUrls = (media_urls as string[]).filter(
        (url: string) => !(/\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video'))
      );
      for (const imageUrl of imageUrls) {
        try {
          const resp = await fetch(imageUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            const buffer = await blob.arrayBuffer();
            const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            userContent.push({
              inlineData: {
                mimeType: blob.type || 'image/jpeg',
                data: base64
              }
            });
            imageCount++;
          }
        } catch (e) {
          console.error(`Failed to fetch image from URL: ${imageUrl}`, e);
        }
      }
    }

    // 2. TEXT INSTRUCTIONS AFTER IMAGES
    const instructions = `Você é um Redator Publicitário Humano e Criativo, agindo em nome da marca "${clientData?.company_name || orgName}".
Sua tarefa é criar uma legenda que soe natural, autêntica e altamente profissional, baseada no que você vê nas imagens acima.

${clientContext}

OBJETIVO: ${objective || "envolvimento e venda"}
ESTRUTURA: AIDA (Atenção, Interesse, Desejo, Ação)
TONALIDADE: ${toneDesc}
TAMANHO DO TEXTO: ${lengthDesc}
CONTEXTO EXTRA: ${topic || "Nenhum"}

DIRETRIZES DE FORMATAÇÃO E HUMANIZAÇÃO:
1. TEXTO RESPIRÁVEL (MUITO IMPORTANTE): Evite blocos de texto compactos. Use quebras de linha frequentes. Sempre que terminar uma frase forte ou usar pontuações como "!", "..." ou ",", avalie pular para a linha de baixo para dar ritmo à leitura.
2. GANCHO DE IMPACTO: A primeira linha deve ser curta e poderosa.
3. EMOJIS E ÍCONES: Use emojis para tornar a leitura menos cansativa. Use ícones (ex: ✅, 📍, 🚀, 💎) para listar benefícios ou destacar pontos importantes. O texto deve ser visualmente convidativo.
4. FUJA DO CLICHÊ DE IA: Comece direto no assunto com uma frase real e humana.
5. CONTEXTO VISUAL: Mencione detalhes reais que aparecem na imagem para provar que você está realmente "vendo" o conteúdo.
6. CTA NATURAL: Use chamadas amigáveis como "Fala com a gente no Direct" ou "Confira os detalhes no link da bio".
7. HASHTAGS: Coloque-as agrupadas ao final, após algumas quebras de linha.

IMPORTANTE: O texto deve ser uma peça de comunicação pronta para postar, com uma estética limpa, moderna e fácil de ler no scroll rápido.`;

    userContent.push({ text: instructions });

    const startTimeAI = Date.now();
    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: userContent }],
        system_instruction: {
          parts: [{
            text: `Você é um Copywriter Humano de Elite. Seu estilo de escrita é orgânico, magnético e foge totalmente de padrões robóticos de IA. Você prioriza a clareza, a emoção e a conexão real com o público. Nunca deixe textos incompletos.`
          }]
        },
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 4096,
        },
      }),
    });

    const aiData = await aiResponse.json();
    const durationAI = Date.now() - startTimeAI;
    console.log(`[generate-social-caption] AI response received in ${durationAI}ms. Status: ${aiResponse.status}`);

    if (!aiResponse.ok) {
      const aiText = JSON.stringify(aiData);
      console.error("[generate-social-caption] AI error:", aiText.substring(0, 1000));
      return new Response(JSON.stringify({
        error: "A IA encontrou um problema técnico ao gerar a legenda.",
        details: aiText.substring(0, 200),
        status: aiResponse.status
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const caption = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!caption) {
      console.error("[generate-social-caption] Empty content in AI response");
      return new Response(JSON.stringify({ error: "A IA não conseguiu gerar o conteúdo. Verifique se a imagem é válida." }), {
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
