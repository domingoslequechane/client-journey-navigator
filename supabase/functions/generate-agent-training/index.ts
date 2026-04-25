import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

const SYSTEM_PROMPT = `Você é um especialista em configuração de atendentes virtuais para WhatsApp.

O utilizador vai descrever o negócio dele. Com base nessa descrição, gere os campos de treinamento em formato JSON.

REGRAS:
- Preencha TODOS os campos, mesmo que precise inferir informações razoáveis.
- Use português de Portugal/Moçambique (evite "você" excessivo, prefira tom profissional mas amigável).
- A welcome_message deve ser curta, acolhedora e com 1-2 emojis.
- As instructions devem ser detalhadas e práticas para o atendente saber EXACTAMENTE como se comportar.
- O extra_info deve conter FAQs, detalhes de produtos/serviços, políticas, etc.
- Se o utilizador não mencionou horário, infira um horário comercial razoável.
- Se o utilizador não mencionou endereço, deixe vazio ("").
- Responda APENAS com o JSON, sem markdown, sem explicações.

FORMATO DE SAÍDA (JSON puro):
{
  "welcome_message": "mensagem de boas-vindas curta com emoji",
  "company_name": "nome da empresa",
  "company_sector": "ramo de actividade",
  "company_description": "descrição detalhada do negócio (2-4 frases)",
  "business_hours": "horário de funcionamento formatado",
  "address": "endereço completo ou vazio",
  "address_reference": "ponto de referência ou vazio",
  "instructions": "instruções detalhadas de comportamento do atendente (5-10 linhas)",
  "extra_info": "informações extras como produtos, serviços, preços, políticas (o máximo possível)"
}`;

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;
  const headers = getCorsHeaders(req);

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada no servidor." }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const { instance_id, user_description } = await req.json();

    if (!instance_id || !user_description?.trim()) {
      return new Response(
        JSON.stringify({ error: "instance_id e user_description são obrigatórios" }),
        { status: 400, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    // Get instance name for context
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: instance } = await sb
      .from("atende_ai_instances")
      .select("name")
      .eq("id", instance_id)
      .single();

    const agentName = instance?.name || "Atendente";

    const userPrompt = `Nome do atendente: ${agentName}\n\nDescrição do negócio fornecida pelo utilizador:\n${user_description}`;

    console.log(`[generate-training] Calling gpt-4o for instance ${instance_id}`);

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    const aiData = await aiRes.json();

    if (!aiRes.ok) {
      const errMsg = aiData?.error?.message || aiData?.error?.code || JSON.stringify(aiData);
      console.error(`[generate-training] OpenAI error (${aiRes.status}): ${errMsg}`);
      return new Response(
        JSON.stringify({ error: `Erro da OpenAI (${aiRes.status}): ${errMsg}` }),
        { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    const responseText = aiData?.choices?.[0]?.message?.content || "";

    let trainingData: any;
    try {
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      trainingData = JSON.parse(cleanJson);
    } catch {
      console.error("[generate-training] JSON parse error:", responseText);
      return new Response(
        JSON.stringify({ error: "A IA retornou uma resposta inválida. Tente novamente." }),
        { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-training] Success for ${instance_id}`);

    return new Response(
      JSON.stringify({ ok: true, data: trainingData }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[generate-training] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...headers, "Content-Type": "application/json" } }
    );
  }
});
