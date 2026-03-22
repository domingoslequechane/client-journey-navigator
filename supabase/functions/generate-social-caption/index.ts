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
    const instructions = 'Você é um Redator Publicitário Humano de Elite, agindo em nome da marca \"' + (clientData?.company_name || orgName) + '\".\n' +
'Sua tarefa é criar uma legenda que soe orgânica, autêntica e altamente persuasiva, baseada nas imagens fornecidas.\n\n' +
clientContext + '\n' +
'OBJETIVO DO POST: ' + (objective || "envolvimento e venda") + '\n' +
'ESTRUTURA: Adapte inteligentemente o framework (ex: AIDA para conversão intensa, PAS para educar sobre dores, ou Storytelling Dinâmico para conexão).\n' +
'TONALIDADE: ' + toneDesc + '\n' +
'TAMANHO DO TEXTO: ' + lengthDesc + '\n' +
'CONTEXTO EXTRA: ' + (topic || "Nenhum") + '\n\n' +
'DIRETRIZES DE COPYWRITING E HUMANIZAÇÃO DE ELITE:\n' +
'1. TEXTO RESPIRÁVEL (MUITO IMPORTANTE): Evite blocos de texto maçantes. Use quebras de linha constantes e parágrafos curtos para favorecer a leitura dinâmica no mobile.\n' +
'2. GANCHO IMPLACÁVEL: A primeira frase é Vida ou Morte. Tem que prender a atenção em 2 segundos de forma curta, curiosa e poderosa. NUNCA grite com o utilizador (EVITE FRASES INTEIRAS EM CAIXA ALTA, use maiúsculas apenas para destacar 1 ou 2 palavras cruciais).\n' +
'3. CONEXÃO VISUAL COM EMOJIS: É OBRIGATÓRIO incluir entre 3 e 5 emojis bem distribuídos e com propósito ao longo de toda a legenda. Eles servem para dar vida ao texto e criar conexão. Contudo, não cometa o erro amador de usar um emoji no fim de rigorosamente todas as frases.\n' +
'4. ZERO BOT: NUNCA escreva saudações de introdução como "Claro, aqui está", "Entendido". RETORNE APENAS O TEXTO FINAL DA LEGENDA, pronto a postar. Ocultar que é uma IA é a tua missão número 1.\n' +
'5. CONTEXTO VISUAL PROVADO: Mencione ou faça uma ponte lógica com detalhes reais da imagem para provar que o texto foi feito à medida daquela foto.\n' +
'6. CTA LETAL E ÚNICO: O CTA deve ser sempre incisivo, rápido e posicionado na última linha antes das hashtags. Sem rodeios (ex: "Toque no link da bio", "Comente [Eu Quero] e envie agora").\n' +
'7. HASHTAGS: Aplique um limite absoluto de 2 a 4 hashtags cirúrgicas e ultra-direcionadas no extremo final do texto.\n\n' +
'IMPORTANTE: Retorne a peça como uma masterclass de Copywriting. Sem tags de código de bloco, sem asteriscos desnecessários. O output tem de ser o texto puro e visceral.';

    userContent.push({ text: instructions });

    const startTimeAI = Date.now();
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=' + GEMINI_API_KEY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: userContent }],
        system_instruction: {
          parts: [{
            text: `Você não é uma Inteligência Artificial assistente, atua como uma rigorosa API de Copywriting de Elite para Instagram/Facebook. 

REGRA DE OURO INEGOCIÁVEL: A sua resposta final será injetada diretamente no banco de dados para postagem automática na conta do cliente. Por isso, é EXPRESSAMENTE PROIBIDO:
1. Escrever palavras de Assistente ou saudações ("Claro", "Aqui está", "Espero que goste", "Entendido").
2. Envolver a resposta em blocos de código markdown ou aspas.
3. Usar jargões clássicos, repetitivos e cansativos de IA ("Eleve o nível", "Desvende", "Revolucione", "Mergulhe connosco", "A sua jornada").

Retorne EXCLUSIVAMENTE o texto final do post. O copy deve ser magnético, humano, usar quebras de linha para ser respirável no scroll mobile e ter um limite implacável de no máximo 3 ou 4 hashtags altamente alinhadas e específicas ao tema abordado no final.`
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
