import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const EVOLUTION_GO_BASE_URL = (Deno.env.get("EVOLUTION_GO_URL") || Deno.env.get("EVOLUTION_GO_BASE_URL") || "").replace(/\/$/, "");
const EVOLUTION_GO_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";

serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("[FollowUp] Iniciando processamento de Follow Up...");

    // 1. Buscar instâncias com follow up ativo
    const { data: instances, error: instError } = await sb
      .from("atende_ai_instances")
      .select("*")
      .eq("follow_up_enabled", true)
      .eq("status", "active");

    if (instError || !instances) throw instError || new Error("Nenhuma instância ativa encontrada");

    let processedCount = 0;

    for (const instance of instances) {
      const delayMinutes = instance.follow_up_delay_minutes || 1440;
      const delayThreshold = new Date(Date.now() - delayMinutes * 60 * 1000).toISOString();

      // 2. Buscar conversas que precisam de follow up
      // Critérios:
      // - Status 'open'
      // - Última mensagem há mais de 'delayMinutes'
      // - Não houve follow up recente (ou nunca houve)
      // - Não está pausada por humano
      const { data: conversations } = await sb
        .from("atende_ai_conversations")
        .select("*")
        .eq("instance_id", instance.id)
        .eq("status", "open")
        .lt("last_message_at", delayThreshold)
        .or(`last_follow_up_at.is.null,last_follow_up_at.lt.${delayThreshold}`)
        .or('paused_until.is.null,paused_until.lt.now()');

      if (!conversations || conversations.length === 0) continue;

      for (const conv of conversations) {
        // Verificar se a última mensagem foi do usuário
        const { data: lastMsg } = await sb
          .from("atende_ai_messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!lastMsg || lastMsg.role !== "user") continue;

        // Gerar mensagem de follow up via IA
        const followUpMsg = await generateFollowUpMessage(instance, conv, lastMsg.content);

        if (followUpMsg) {
          console.log(`[FollowUp] Enviando para ${conv.contact_phone} (Instância: ${instance.name})`);
          
          const apiKey = instance.instance_api_key || EVOLUTION_GO_API_KEY;
          const res = await fetch(`${EVOLUTION_GO_BASE_URL}/send/text`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": apiKey,
            },
            body: JSON.stringify({
              number: conv.contact_phone,
              text: followUpMsg,
              delay: 1000
            }),
          });

          if (res.ok) {
            // Guardar mensagem no histórico
            await sb.from("atende_ai_messages").insert({
              conversation_id: conv.id,
              organization_id: instance.organization_id,
              role: "assistant",
              content: followUpMsg,
              message_type: "text"
            });

            // Atualizar conversa
            await sb.from("atende_ai_conversations").update({
              last_follow_up_at: new Date().toISOString(),
              follow_up_count: (conv.follow_up_count || 0) + 1
            }).eq("id", conv.id);

            processedCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: processedCount }), { status: 200 });

  } catch (err) {
    console.error("[FollowUp] Erro fatal:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

async function generateFollowUpMessage(instance: any, conversation: any, lastUserText: string) {
  try {
    const systemPrompt = `Você é ${instance.name}, atendente da empresa ${instance.company_name || "nossa empresa"}.
Sua missão é fazer um "Follow Up" (acompanhamento) educado com um cliente que não respondeu sua última interação há algum tempo.

REGRAS:
1. Seja extremamente breve e gentil.
2. Não pressione o cliente, apenas mostre que ainda está à disposição.
3. Se o cliente parecia interessado em algo específico (baseado na última mensagem), mencione sutilmente.
4. Use o mesmo tom de voz configurado: "${instance.welcome_message || "Cordial e prestativo"}".
5. Responda APENAS com a mensagem de follow up.

Última mensagem do cliente: "${lastUserText}"`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere uma mensagem de follow up curta e amigável." }
        ],
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[generateFollowUpMessage] erro:", err);
    return null;
  }
}
