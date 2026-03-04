import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { platforms, content_type, media_data, tone, length, topic, client_id } = await req.json();

    // Buscar contexto do cliente se houver ID
    let clientContext = "";
    if (client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('company_name, services, notes')
        .eq('id', client_id)
        .single();
      
      if (client) {
        clientContext = `
DADOS DO CLIENTE/MARCA:
Empresa: ${client.company_name}
Serviços: ${client.services?.join(', ') || 'N/A'}
Notas Estratégicas: ${client.notes || 'N/A'}
`;
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
    
    const prompt = `Você é um estrategista de social media de elite. Sua tarefa é gerar uma legenda profissional para um post de ${content_type || 'feed'} nas plataformas: ${platformNames}.

${clientContext}

DIRETRIZES DA LEGENDA:
- Tom de voz: ${toneMap[tone] || "Profissional"}
- Tamanho: ${lengthMap[length] || lengthMap["media"]}
- Tema sugerido: ${topic || "Analise a imagem e crie algo relevante para a marca"}

REGRAS OBRIGATÓRIAS:
- Escreva em Português (PT-PT ou PT-BR conforme o contexto do cliente).
- Use emojis estrategicamente.
- Inclua 5-8 hashtags relevantes no final.
- Se houver imagem, descreva o que vê e conecte com os serviços do cliente.
- NÃO inclua comentários extras, apenas a legenda pronta.`;

    const userContent: any[] = [{ type: "text", text: prompt }];
    
    // Adicionar dados da imagem (Base64) para análise visual
    if (media_data && media_data.length > 0) {
      for (const data of media_data.slice(0, 3)) {
        userContent.push({ 
          type: "image_url", 
          image_url: { url: data } // data deve ser "data:image/jpeg;base64,..."
        });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em copywriting para redes sociais. Analise imagens e contexto de marca para criar posts de alta conversão." },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("[generate-social-caption] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao gerar legenda" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});