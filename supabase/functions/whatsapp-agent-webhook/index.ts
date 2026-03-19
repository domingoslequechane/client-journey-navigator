import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL") || "https://api.uazapi.com";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").replace(/@.*$/, "");
}

// ─── UAZAPI: Enviar mensagem ────────────────────────────────

async function sendTextMessage(
  instanceToken: string,
  number: string,
  text: string,
  delayMs = 1500,
  readChat = true
) {
  const res = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: instanceToken },
    body: JSON.stringify({ number, text, delay: delayMs, readchat: readChat }),
  });
  return res.json();
}

// ─── Transcrever áudio com Groq Whisper ──────────────────────

async function transcribeAudio(instanceToken: string, messageId: string): Promise<string | null> {
  try {
    // 1. Baixar áudio via UAZAPI /message/download (base64)
    const mediaRes = await fetch(`${UAZAPI_BASE_URL}/message/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instanceToken,
      },
      body: JSON.stringify({
        id: messageId,
        return_base64: true,
        return_link: false,
      }),
    });

    if (!mediaRes.ok) {
      console.error("Erro ao baixar áudio UAZAPI:", mediaRes.status);
      return null;
    }

    const mediaData = await mediaRes.json();
    const base64Audio = mediaData.base64Data as string;
    if (!base64Audio) {
      console.error("UAZAPI não retornou base64Data");
      return null;
    }

    // Converter base64 para Uint8Array
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Enviar para Groq Whisper
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([bytes], { type: "audio/mpeg" }),
      "audio.mp3"
    );
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "pt");
    formData.append("temperature", "0");
    formData.append("response_format", "json");

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (!groqRes.ok) {
      console.error("Groq Whisper erro:", groqRes.status, await groqRes.text());
      return null;
    }

    const result = await groqRes.json();
    return (result.text || "").trim() || null;
  } catch (err) {
    console.error("Erro na transcrição de áudio:", err);
    return null;
  }
}

// ─── Construir System Prompt ─────────────────────────────────

function buildSystemPrompt(agent: Record<string, unknown>): string {
  const parts: string[] = [];

  const name = (agent.name as string) || "Assistente";
  parts.push(`Você é ${name}, assistente virtual de atendimento.`);
  parts.push("");
  parts.push("## REGRAS DE FORMATAÇÃO");
  parts.push("- Negrito no WhatsApp: *texto* (UM asterisco apenas)");
  parts.push("- Mensagens curtas e diretas — é WhatsApp, não e-mail");
  parts.push("- Use no máximo 1 emoji por mensagem");
  parts.push("- Responda sempre em português");
  parts.push("");

  // Tamanho de resposta
  const size = (agent.response_size as number) || 2;
  if (size === 1) parts.push("## TAMANHO: Respostas CURTAS, máximo 2-3 frases.");
  else if (size === 3) parts.push("## TAMANHO: Respostas DETALHADAS quando necessário.");
  else parts.push("## TAMANHO: Respostas de tamanho médio, claras e objetivas.");
  parts.push("");

  // Informações da empresa
  const companyName = agent.company_name as string;
  const companySector = agent.company_sector as string;
  const companyDesc = agent.company_description as string;
  if (companyName || companySector || companyDesc) {
    parts.push("## SOBRE A EMPRESA");
    if (companyName) parts.push(`- Nome: ${companyName}`);
    if (companySector) parts.push(`- Ramo: ${companySector}`);
    if (companyDesc) parts.push(`- Descrição: ${companyDesc}`);
    parts.push("");
  }

  // Horário de funcionamento
  const hours = agent.business_hours as string;
  if (hours) {
    parts.push("## HORÁRIO DE FUNCIONAMENTO");
    parts.push(hours);
    parts.push("");
  }

  // Endereço
  const address = agent.address as string;
  const addressRef = agent.address_reference as string;
  if (address) {
    parts.push("## ENDEREÇO");
    parts.push(`- Endereço: ${address}`);
    if (addressRef) parts.push(`- Referência: ${addressRef}`);
    parts.push("");
  }

  // Instruções
  const instructions = agent.instructions as string;
  if (instructions) {
    parts.push("## INSTRUÇÕES DE ATENDIMENTO");
    parts.push(instructions);
    parts.push("");
  }

  // Info extra
  const extra = agent.extra_info as string;
  if (extra) {
    parts.push("## INFORMAÇÕES ADICIONAIS");
    parts.push(extra);
    parts.push("");
  }

  // Data/hora atual
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { timeZone: "Africa/Maputo" });
  const timeStr = now.toLocaleTimeString("pt-BR", { timeZone: "Africa/Maputo", hour: "2-digit", minute: "2-digit" });
  parts.push(`## DATA E HORA ATUAL: ${dateStr} às ${timeStr} (fuso: Maputo)`);

  return parts.join("\n");
}

// ─── Chamar OpenAI ──────────────────────────────────────────

async function callAI(
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[],
  userMessage: string
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-5-mini-2025-08-07",
      messages,
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Desculpe, não entendi. Pode reformular?";
}

// ─── Webhook Handler ────────────────────────────────────────

serve(async (req) => {
  // Webhook não precisa de CORS nem auth — é chamado pela UAZAPI
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    // Extrair secret da URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const secret = pathParts[pathParts.length - 1];

    if (!secret || secret.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid secret" }), { status: 401 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar agente pelo webhook secret
    const { data: agent, error: agentErr } = await sb
      .from("ai_agents")
      .select("*")
      .eq("uazapi_webhook_secret", secret)
      .single();

    if (agentErr || !agent) {
      console.error("Webhook: agente não encontrado para secret");
      return new Response(JSON.stringify({ error: "Invalid secret" }), { status: 401 });
    }

    // Parsear body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const event = (body.EventType as string) || (body.event as string) || "message";

    // ─── Evento de conexão ───
    if (event === "connection") {
      const chat = body.chat as Record<string, unknown> | undefined;
      const isConnected = !!(chat?.wa_chatid as string);

      await sb
        .from("ai_agents")
        .update({
          whatsapp_connected: isConnected,
          connected_number: isConnected ? (chat?.owner as string) || null : null,
          status: isConnected ? "active" : "inactive",
        })
        .eq("id", agent.id);

      await sb.from("ai_agent_connection_log").insert({
        agent_id: agent.id,
        event: isConnected ? "connected" : "disconnected",
        details: JSON.stringify(body).substring(0, 2000),
      });

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ─── Evento de mensagem ───
    if (event === "messages" || event === "message") {
      // Agente pausado ou inativo? Ignorar
      if (agent.status !== "active") {
        return new Response(JSON.stringify({ ok: true, skipped: "agent_not_active" }), { status: 200 });
      }

      const messageData = (body.message as Record<string, unknown>)
        || (body.data as Record<string, unknown>);
      if (!messageData) return new Response(JSON.stringify({ ok: true }), { status: 200 });

      // Ignorar grupos
      const isGroup = (messageData.isGroup as boolean)
        || ((messageData.chatid as string) || "").includes("@g.us");
      if (isGroup) return new Response(JSON.stringify({ ok: true }), { status: 200 });

      // Extrair dados
      const messageId = (messageData.messageid as string) || (messageData.id as string) || "";
      const chatId = (messageData.chatid as string) || "";
      const phone = normalizePhone(chatId);
      const fromMe = messageData.fromMe as boolean;

      // Detectar tipo de mensagem
      const msgType = (messageData.type as string)
        || (messageData.messageType as string)
        || "text";
      const isAudio = msgType === "audio" || msgType === "ptt"
        || msgType === "AudioMessage"; // formatos possíveis da UAZAPI

      // Content pode ser objeto (áudio/mídia), não string
      const rawContent = messageData.content;
      let text = (typeof rawContent === "string" ? rawContent : "")
        || (messageData.text as string)
        || (messageData.conversation as string)
        || "";

      let messageType = "text";

      // Se for áudio, transcrever com Groq Whisper via UAZAPI /message/download
      if (isAudio && !text.trim()) {
        if (messageId && agent.uazapi_instance_token) {
          const transcription = await transcribeAudio(agent.uazapi_instance_token, messageId);
          if (transcription) {
            text = transcription;
            messageType = "audio";
          } else {
            // Áudio não transcrito — avisar o cliente
            await sendTextMessage(
              agent.uazapi_instance_token,
              phone,
              "Desculpe, não consegui entender o áudio. Pode digitar a sua mensagem?",
              agent.show_typing ? 2000 : 500,
              agent.mark_as_read
            );
            return new Response(JSON.stringify({ ok: true, skipped: "audio_failed" }), { status: 200 });
          }
        }
      }

      if (!text.trim()) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_text" }), { status: 200 });
      }

      // Deduplicação
      if (messageId) {
        const { data: existingMsg } = await sb
          .from("ai_agent_messages")
          .select("id")
          .eq("organization_id", agent.organization_id)
          .eq("external_id", messageId)
          .maybeSingle();

        if (existingMsg) {
          return new Response(JSON.stringify({ ok: true, skipped: "duplicate" }), { status: 200 });
        }
      }

      // Buscar ou criar conversa ativa (últimas 24h)
      let conversationId: string;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: existingConv } = await sb
        .from("ai_agent_conversations")
        .select("id")
        .eq("agent_id", agent.id)
        .eq("contact_phone", phone)
        .eq("status", "open")
        .gt("last_message_at", twentyFourHoursAgo)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        await sb
          .from("ai_agent_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      } else {
        // Criar nova conversa
        const contactName = (messageData.pushName as string)
          || (messageData.senderName as string)
          || phone;

        const { data: newConv } = await sb
          .from("ai_agent_conversations")
          .insert({
            agent_id: agent.id,
            organization_id: agent.organization_id,
            contact_name: contactName,
            contact_phone: phone,
            channel: "whatsapp",
            status: "open",
          })
          .select("id")
          .single();

        conversationId = newConv!.id;

        // Incrementar contador de conversas
        await sb.rpc("increment_ai_agent_stats", {
          p_agent_id: agent.id,
          p_conversations: 1,
          p_messages: 0,
        });
      }

      // Salvar mensagem do user
      const { data: insertedMsg } = await sb
        .from("ai_agent_messages")
        .insert({
          conversation_id: conversationId,
          organization_id: agent.organization_id,
          external_id: messageId || null,
          role: fromMe ? "system" : "user",
          content: text,
          message_type: messageType,
        })
        .select("id")
        .single();

      const insertedMsgId = insertedMsg?.id;

      // Se é fromMe, não processar com IA
      if (fromMe) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Incrementar contador de mensagens
      await sb.rpc("increment_ai_agent_stats", {
        p_agent_id: agent.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // ─── Buffer/Debounce ───
      const bufferSeconds = agent.response_delay_seconds ?? 3;
      if (bufferSeconds > 0) {
        await new Promise(resolve => setTimeout(resolve, bufferSeconds * 1000));

        // Verificar se chegou mensagem mais nova
        const { data: latestMsg } = await sb
          .from("ai_agent_messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestMsg && insertedMsgId && latestMsg.id !== insertedMsgId) {
          // Chegou msg mais nova, este webhook sai — o mais novo vai processar
          return new Response(JSON.stringify({ ok: true, skipped: "buffered" }), { status: 200 });
        }
      }

      // ─── Marcar como lido ───
      if (agent.mark_as_read && agent.uazapi_instance_token) {
        // A flag readchat no sendTextMessage já cuida disso
      }

      // ─── Carregar histórico ───
      const { data: historyRows } = await sb
        .from("ai_agent_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50);

      const conversationHistory = (historyRows || [])
        .slice(0, -1) // Excluir a última (é a mensagem atual)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      // ─── Mensagem de boas-vindas (primeira msg da conversa) ───
      const isFirstMessage = conversationHistory.length === 0;
      if (isFirstMessage && agent.welcome_message) {
        // Enviar boas-vindas primeiro
        await sendTextMessage(
          agent.uazapi_instance_token,
          phone,
          agent.welcome_message,
          agent.show_typing ? 2000 : 500,
          agent.mark_as_read
        );

        // Salvar boas-vindas
        await sb.from("ai_agent_messages").insert({
          conversation_id: conversationId,
          organization_id: agent.organization_id,
          role: "assistant",
          content: agent.welcome_message,
          message_type: "text",
        });

        // Adicionar ao histórico para contexto da IA
        conversationHistory.push({ role: "assistant", content: agent.welcome_message });
      }

      // ─── Chamar IA ───
      const systemPrompt = buildSystemPrompt(agent);
      const aiResponse = await callAI(systemPrompt, conversationHistory, text);
      const cleanResponse = aiResponse.replace(/\\n/g, "\n");

      // Salvar resposta da IA
      await sb.from("ai_agent_messages").insert({
        conversation_id: conversationId,
        organization_id: agent.organization_id,
        role: "assistant",
        content: cleanResponse,
        message_type: "text",
      });

      // Incrementar mensagem da IA
      await sb.rpc("increment_ai_agent_stats", {
        p_agent_id: agent.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // Atualizar conversa
      await sb
        .from("ai_agent_conversations")
        .update({
          message_count: (historyRows?.length || 0) + 2, // user msg + ai response
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      // ─── Enviar via WhatsApp ───
      await sendTextMessage(
        agent.uazapi_instance_token,
        phone,
        cleanResponse,
        agent.show_typing ? 2000 : 500,
        agent.mark_as_read
      );

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Evento desconhecido
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("whatsapp-agent-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
