import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

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

    console.log("[generate-social-caption] User authenticated:", user.id);

    const { data: profile } = await supabaseAuth.from('profiles').select('organization_id, current_organization_id').eq('id', user.id).single();
    const userOrgId = profile?.current_organization_id || profile?.organization_id;
    if (!userOrgId) {
      console.error("[generate-social-caption] No org found for user:", user.id);
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[generate-social-caption] Org:", userOrgId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { platforms, content_type, media_data, tone, length, topic, client_id } = await req.json();

    console.log("[generate-social-caption] Params:", { platforms, content_type, tone, length, client_id, hasMedia: !!media_data?.length, mediaCount: media_data?.length || 0 });

    // Fetch client context scoped to user's organization
    let clientContext = "";
    if (client_id) {
      const { data: client } = await supabaseAuth
        .from('clients')
        .select('company_name, services, notes')
        .eq('id', client_id)
        .eq('organization_id', userOrgId)
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
- Tema sugerido: ${topic || "Crie algo relevante para a marca com base no contexto disponível"}

REGRAS OBRIGATÓRIAS:
- Escreva em Português (PT-PT ou PT-BR conforme o contexto do cliente).
- Use emojis estrategicamente.
- Inclua 5-8 hashtags relevantes no final.
- NÃO inclua comentários extras, apenas a legenda pronta.`;

    // Build messages - only include images if they are reasonably sized
    const userContent: any[] = [{ type: "text", text: prompt }];

    if (media_data && media_data.length > 0) {
      for (const data of media_data.slice(0, 2)) {
        // Only include images under 500KB base64 to avoid payload issues
        if (typeof data === 'string' && data.length < 500000) {
          userContent.push({
            type: "image_url",
            image_url: { url: data }
          });
        } else {
          console.log("[generate-social-caption] Skipping large image, size:", typeof data === 'string' ? data.length : 'unknown');
        }
      }
    }

    console.log("[generate-social-caption] Calling AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um especialista em copywriting para redes sociais. Crie posts de alta conversão." },
          { role: "user", content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    console.log("[generate-social-caption] AI gateway response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-social-caption] AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const caption = data.choices?.[0]?.message?.content || "";

    console.log("[generate-social-caption] Caption generated, length:", caption.length);

    return new Response(JSON.stringify({ caption }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("[generate-social-caption] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao gerar legenda" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
