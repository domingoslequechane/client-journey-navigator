/**
 * evolution-go-webhook
 *
 * Recebe eventos do Evolution Go (Go Edition) e processa mensagens via IA.
 * Autenticação: UUID secreto no path → /evolution-go-webhook/{secret}
 *
 * Eventos suportados (conforme documentação Evolution Go):
 *   - QRCODE / qrcode.updated    → salva qr_code_base64 no banco
 *   - CONNECTION (status: open)   → marca instância como conectada
 *   - CONNECTION (status: close)  → marca instância como desconectada
 *   - LOGGEDOUT / DISCONNECTED    → marca instância como desconectada
 *   - MESSAGE / MESSAGES_UPSERT   → processa mensagens e responde com IA
 *   - OFFLINE_SYNC_COMPLETED      → marca instância como activa
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const EVOLUTION_GO_BASE_URL = (Deno.env.get("EVOLUTION_GO_URL") || Deno.env.get("EVOLUTION_GO_BASE_URL") || "").replace(/\/$/, "");
const EVOLUTION_GO_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";

// ─── Helpers ────────────────────────────────────────────────

function normalizePhone(jid: string): string {
  // Remove sufixos como ":38@s.whatsapp.net" → limpa para o número puro
  return jid.replace(/@.*$/, "").replace(/:.*$/, "").replace(/[^0-9]/g, "");
}

async function logToDb(sb: any, instanceId: string, event: string, details: string) {
  try {
    await sb.from("atende_ai_logs").insert({
      instance_id: instanceId,
      event: event,
      details: details.substring(0, 3000),
    });
  } catch (e) {
    console.error("[logToDb] error:", e);
  }
}

async function sendTextMessage(
  instanceName: string,
  number: string,
  text: string,
  apiKey: string,
  delayMs = 1500,
) {
  if (!EVOLUTION_GO_BASE_URL) {
    console.warn("EVOLUTION_GO_BASE_URL não configurada — não pode enviar mensagem");
    return false;
  }
  const res = await fetch(`${EVOLUTION_GO_BASE_URL}/send/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey || EVOLUTION_GO_API_KEY,
    },
    body: JSON.stringify({ number, text, delay: delayMs }),
  });
  if (!res.ok) {
    console.error(`sendTextMessage falhou: ${res.status}`, await res.text());
  }
  return res.ok;
}

// ─── Send Link with Preview ────────────────────────────────
async function sendLinkMessage(
  number: string,
  text: string,
  url: string,
  apiKey: string,
  delayMs = 1500,
) {
  if (!EVOLUTION_GO_BASE_URL) return false;
  try {
    const res = await fetch(`${EVOLUTION_GO_BASE_URL}/send/link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey || EVOLUTION_GO_API_KEY,
      },
      body: JSON.stringify({
        number,
        text,
        url,
        title: "",
        description: "",
        delay: delayMs,
      }),
    });
    if (!res.ok) {
      console.warn(`sendLinkMessage falhou (${res.status}), fallback para texto`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("sendLinkMessage erro:", err);
    return false;
  }
}

// ─── React to Message ──────────────────────────────────────
async function reactToMessage(
  messageId: string,
  number: string,
  apiKey: string,
  messageText: string,
) {
  if (!EVOLUTION_GO_BASE_URL || !messageId) return;

  // ~30% chance of reacting
  if (Math.random() > 0.30) return;

  // Pick an emoji based on message content
  const lower = messageText.toLowerCase();
  let emoji = "👍";

  if (lower.includes("obrigad") || lower.includes("valeu") || lower.includes("thanks")) {
    emoji = "❤️";
  } else if (lower.includes("😂") || lower.includes("haha") || lower.includes("kk") || lower.includes("rsrs")) {
    emoji = "😂";
  } else if (lower.includes("bom dia") || lower.includes("boa tarde") || lower.includes("boa noite") || lower.includes("olá") || lower.includes("ola")) {
    emoji = "👋";
  } else if (lower.includes("urgente") || lower.includes("rápido") || lower.includes("rapido") || lower.includes("ajuda")) {
    emoji = "⚡";
  } else if (lower.includes("preço") || lower.includes("preco") || lower.includes("quanto") || lower.includes("valor")) {
    emoji = "👀";
  } else if (lower.includes("perfeito") || lower.includes("excelente") || lower.includes("top") || lower.includes("ótimo")) {
    emoji = "🔥";
  } else {
    // Random friendly emoji pool
    const pool = ["👍", "✅", "👀", "💪", "🙏"];
    emoji = pool[Math.floor(Math.random() * pool.length)];
  }

  try {
    await fetch(`${EVOLUTION_GO_BASE_URL}/message/react`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey || EVOLUTION_GO_API_KEY,
      },
      body: JSON.stringify({ id: messageId, number, reaction: emoji }),
    });
    console.log(`[React] ${emoji} na msg ${messageId}`);
  } catch (err) {
    console.warn("[React] Erro ao reagir:", err);
  }
}

// ─── Extract first URL from text ───────────────────────────
function extractUrl(text: string): string | null {
  const urlRegex = /https?:\/\/[^\s\])"'>]+/i;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// ─── Smart send: link or text ──────────────────────────────
async function smartSendMessage(
  instanceName: string,
  number: string,
  text: string,
  apiKey: string,
  delayMs: number,
) {
  const url = extractUrl(text);

  if (url) {
    // Try sending as link first for rich preview
    const linkSent = await sendLinkMessage(number, text, url, apiKey, delayMs);
    if (linkSent) return true;
  }

  // Fallback to plain text
  return sendTextMessage(instanceName, number, text, apiKey, delayMs);
}

// ─── AI ────────────────────────────────────────────────────

function buildSystemPrompt(instance: any): string {
  const parts: string[] = [];
  const name = instance.name || "Atendente Virtual";
  const companyName = instance.company_name || "";

  parts.push(`## IDENTIDADE`);
  parts.push(`Você é ${name}${companyName ? `, representando a empresa ${companyName}` : ""} no atendimento via WhatsApp.`);
  parts.push("");

  // Response size guidance
  const responseSize = instance.response_size ?? 2;
  parts.push(`## COMUNICAÇÃO`);
  parts.push(`- Seja sempre educado, objetivo e em português.`);
  parts.push(`- Use emojis com moderação para manter o tom humano.`);
  if (responseSize === 1) {
    parts.push(`- IMPORTANTE: Seja extremamente conciso. Responda em no máximo 1-2 frases curtas. Vá directo ao ponto sem rodeios.`);
  } else if (responseSize === 3) {
    parts.push(`- Dê respostas detalhadas e completas. Explique bem cada ponto com exemplos quando necessário.`);
  } else {
    parts.push(`- Mensagens curtas e parágrafos espaçados. Nem muito breve nem muito longo.`);
  }

  if (instance.company_sector) parts.push(`\nRamo: ${instance.company_sector}`);
  if (instance.company_description) parts.push(`\n## SOBRE A EMPRESA\n${instance.company_description}`);
  if (instance.business_hours) parts.push(`\n## HORÁRIO\n${instance.business_hours}`);

  // Address with reference
  if (instance.address) {
    let addressBlock = instance.address;
    if (instance.address_reference) {
      addressBlock += `\nPonto de referência: ${instance.address_reference}`;
    }
    parts.push(`\n## ENDEREÇO\n${addressBlock}`);
  }

  if (instance.instructions) parts.push(`\n## INSTRUÇÕES (PRIORIDADE MÁXIMA)\n${instance.instructions}`);
  if (instance.extra_info) parts.push(`\n## INFORMAÇÕES ADICIONAIS\n${instance.extra_info}`);

  // Training data from Excel/spreadsheet upload
  if (instance.training_data_text) {
    parts.push(`\n## CATÁLOGO / BASE DE DADOS DA EMPRESA\nAbaixo estão os dados importados da empresa (produtos, serviços, preços, etc.). Use estas informações para responder perguntas dos clientes com precisão:\n\n${instance.training_data_text}`);
  }

  const now = new Date();
  parts.push(`\n## DATA/HORA: ${now.toLocaleString("pt-BR", { timeZone: "Africa/Maputo" })} (Maputo)`);

  return parts.join("\n");
}

async function callAI(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string,
  instance: any,
): Promise<string> {
  const provider = instance.ai_provider || "";
  const apiKeys = instance.ai_api_keys || {};
  const aiModels = instance.ai_models || {};

  // Se não houver provedor activo configurado, não responder
  if (!provider) {
    console.log("[callAI] Nenhum provedor de IA activo configurado para esta instância.");
    return "";
  }

  let apiKey = apiKeys[provider] || "";
  let model = aiModels[provider] || "";

  // Fallbacks para variáveis de ambiente e modelos padrão
  // Removido: O agente obrigatoriamente deve usar a chave configurada pela agência.

  if (!apiKey) {
    console.error(`Nenhuma chave de API encontrada para o provedor: ${provider}`);
    return ""; // Retorna vazio para não enviar mensagem de erro ao cliente final
  }

  // Definir modelo padrão se não estiver configurado
  if (!model) {
    if (provider === 'openai') model = "gpt-4o-mini";
    else if (provider === 'anthropic') model = "claude-3-5-sonnet-20240620";
    else if (provider === 'groq') model = "llama-3.1-70b-versatile";
    else if (provider === 'deepseek') model = "deepseek-chat";
    else if (provider === 'google') model = "gemini-1.5-flash";
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  let endpoint = "";
  let headers: Record<string, string> = { "Content-Type": "application/json" };
  let payload: any = {};

  switch (provider) {
    case 'openai':
      endpoint = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;
      payload = { model, messages, temperature: 0.4, max_tokens: 1024 };
      break;

    case 'anthropic':
      endpoint = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      payload = {
        model,
        max_tokens: 1024,
        messages: messages.filter(m => m.role !== 'system'),
        system: systemPrompt,
        temperature: 0.4
      };
      break;

    case 'groq':
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;
      payload = { model, messages, temperature: 0.4, max_tokens: 1024 };
      break;

    case 'deepseek':
      endpoint = "https://api.deepseek.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${apiKey}`;
      payload = { model, messages, temperature: 0.4, max_tokens: 1024 };
      break;

    case 'google':
      endpoint = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
      headers["Authorization"] = `Bearer ${apiKey}`;
      payload = { model, messages, temperature: 0.4, max_tokens: 1024 };
      break;

    default:
      return "Provedor de IA não suportado.";
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`${provider} (${model}) erro:`, res.status, errText);
      return `Erro do provedor ${provider}: ${res.status}. Verifique se o nome do modelo '${model}' está correto e se a chave tem saldo.`;
    }

    const data = await res.json();

    // Normalizar resposta dependendo do provedor
    if (provider === 'anthropic') return data.content[0].text;
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch (err: any) {
    console.error(`Erro ao chamar ${provider} (${model}):`, err);
    return "Erro na conexão com a inteligência artificial.";
  }
}

// ─── Handler Principal ───────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });

  try {
    // Extrair o secret UUID do path
    const url = new URL(req.url);
    const secret = url.pathname.split("/").filter(Boolean).pop();

    if (!secret) {
      console.error("Webhook: Secret não encontrado na URL:", req.url);
      return new Response(JSON.stringify({ error: "Secret não fornecido" }), { status: 401 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Localizar a instância pelo secret UUID
    const { data: instance, error: instanceErr } = await sb
      .from("atende_ai_instances")
      .select("*")
      .eq("evolution_webhook_secret", secret)
      .single();

    if (instanceErr || !instance) {
      console.error("Webhook: instância não encontrada para o secret:", secret, "Erro:", instanceErr);
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Webhook: erro ao processar JSON:", e);
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
    }

    console.log(`Webhook: Instância "${instance.name}" encontrada. Evento: ${body.event}`);

    // O event name vem no campo "event" conforme documentação Evolution Go
    // Eventos padrão: QRCODE, CONNECTION, MESSAGE, SEND_MESSAGE, MESSAGES_SET, etc.
    // Normalizar para uppercase para lidar com variações
    const rawEvent = (body.event as string) || "";
    const event = rawEvent.toUpperCase().replace(/[.\-_]/g, "_");
    console.log(`[Webhook] Evento recebido: "${rawEvent}" (normalizado: "${event}") p/ instância: ${instance.id}`);

    // ─── QRCODE: salvar no banco para o frontend fazer polling ───
    if (event === "QRCODE" || event === "QRCODE_UPDATED") {
      const qrBase64 = body.data?.qrcode || body.data?.base64 || body.data?.code || null;
      if (qrBase64) {
        await sb
          .from("atende_ai_instances")
          .update({ qr_code_base64: qrBase64 })
          .eq("id", instance.id);

        await logToDb(sb, instance.id, "qrcode_updated", "Novo QR Code gerado pelo servidor.");
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ─── CONNECTION: mudança de estado da conexão ──────────
    // Evolution Go envia event "CONNECTION" com data.status ("open" | "close" | "connecting")
    if (event === "CONNECTION" || event === "CONNECTION_UPDATE" || event === "CONNECTED" || event === "PAIRSUCCESS") {
      const data = body.data || {};
      const status = (data.status || data.state || data.connectionStatus || "").toString().toLowerCase();

      // Evolution Go docs e testes mostram que "open" ou "connected" indicam sucesso
      const isActuallyConnected = status === "open" || status === "connected" || event === "CONNECTED" || event === "PAIRSUCCESS";

      if (isActuallyConnected) {
        console.log(`[Webhook] Conexão confirmada para: ${instance.id} (Evento: ${rawEvent}, Status: ${status})`);
        const jid = data.jid || data.owner || data.instance?.owner || null;
        const number = jid ? normalizePhone(jid.toString()) : null;
        const profileName = data.instance?.instanceName || data.name || data.pushName || null;

        const updates: any = {
          whatsapp_connected: true,
          status: "active",
          qr_code_base64: null,
        };

        if (number) updates.connected_number = number;
        if (profileName && (!instance.name || instance.name.includes("+"))) updates.name = profileName;

        await sb
          .from("atende_ai_instances")
          .update(updates)
          .eq("id", instance.id);

        await logToDb(sb, instance.id, "connected", `Conexão estabelecida com sucesso. Status: ${status}`);
        return new Response(JSON.stringify({ ok: true, status: "connected" }), { status: 200 });
      }

      if (status === "close") {
        console.log(`[Webhook] Desconexão detectada para: ${instance.id} (Evento: ${rawEvent})`);
        await sb
          .from("atende_ai_instances")
          .update({
            whatsapp_connected: false,
            status: "inactive",
            connected_number: null,
            qr_code_base64: null,
          })
          .eq("id", instance.id);

        await logToDb(sb, instance.id, "disconnected", `Instância desconectada. Status: ${status}`);
        return new Response(JSON.stringify({ ok: true, status: "disconnected" }), { status: 200 });
      }

      // "connecting" ou outro estado — ignorar
      return new Response(JSON.stringify({ ok: true, status }), { status: 200 });
    }

    // ─── LOGGEDOUT / DISCONNECTED: desconexão explícita ───
    if (event === "LOGGEDOUT" || event === "DISCONNECTED") {
      console.log(`[Webhook] Logout/Desconexão para: ${instance.id} (Evento: ${rawEvent})`);
      await sb
        .from("atende_ai_instances")
        .update({
          whatsapp_connected: false,
          status: "inactive",
          connected_number: null,
          qr_code_base64: null,
        })
        .eq("id", instance.id);

      await logToDb(sb, instance.id, "disconnected", `Logout/Desconexão explícita recebida. Evento: ${event}`);
      return new Response(JSON.stringify({ ok: true, status: "disconnected" }), { status: 200 });
    }

    // ─── OFFLINE_SYNC_COMPLETED: sincronização finalizada ────────
    if (event === "OFFLINE_SYNC_COMPLETED" || event === "OFFLINESYNCCOMPLETED") {
      await sb
        .from("atende_ai_instances")
        .update({
          whatsapp_connected: true,
          status: "active",
          qr_code_base64: null,
        })
        .eq("id", instance.id);

      await logToDb(sb, instance.id, "connected", "Sincronização offline completada. Instância ativa.");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ─── MESSAGE: processar e responder com IA ─────────────────
    // Evolution Go: event "MESSAGE" com data.key (remoteJid, fromMe, id) e data.message
    if (event === "MESSAGE" || event === "MESSAGES_UPSERT") {
      // Só responde se a instância estiver ativa
      if (instance.status !== "active") {
        return new Response(JSON.stringify({ ok: true, skipped: "instance_not_active" }), { status: 200 });
      }

      // Evolution Go webhook payload:
      //   Formato documentado: { data: { key: { remoteJid, fromMe, id }, message: { conversation }, pushName } }
      //   Formato whatsmeow:   { data: { Info: { Chat, IsFromMe, ID, PushName }, Message: { conversation } } }
      // Suportamos ambos com fallback
      const d = body.data || {};
      const info = d.Info || d.key || d;
      const msgContent = d.Message || d.message || {};

      // Extrair campos com fallback entre os dois formatos
      const fromMe = info.IsFromMe ?? info.fromMe ?? false;
      const chatJid = info.Chat || info.remoteJid || info.Sender || "";
      const msgId = info.ID || info.id || "";
      const pushName = info.PushName || d.pushName || "";
      const isGroup = info.IsGroup === true || chatJid.includes("@g.us");

      if (!chatJid) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_chat_jid" }), { status: 200 });
      }

      // Ignorar mensagens do próprio bot
      if (fromMe === true) {
        return new Response(JSON.stringify({ ok: true, skipped: "from_me" }), { status: 200 });
      }

      // Ignorar grupos
      if (isGroup) {
        return new Response(JSON.stringify({ ok: true, skipped: "group" }), { status: 200 });
      }

      const phone = normalizePhone(chatJid);
      const messageId = msgId;
      const senderName = pushName || phone;

      await logToDb(sb, instance.id, "message_received", `Mensagem recebida de ${senderName} (${phone}). ID: ${messageId}`);

      // Extrair texto — suporta ambos os formatos de mensagem
      let text = (
        msgContent?.conversation ||
        msgContent?.extendedTextMessage?.text ||
        msgContent?.imageMessage?.caption ||
        msgContent?.videoMessage?.caption ||
        msgContent?.documentMessage?.caption ||
        ""
      ).trim();

      const messageType = info.MediaType || info.Type || d.messageType || "text";

      if (!text) {
        if (messageType === "audio") text = "[Áudio recebido]";
        else if (messageType === "image") text = "[Imagem recebida]";
        else if (messageType === "video") text = "[Vídeo recebido]";
        else if (messageType === "document") text = "[Documento recebido]";
        else return new Response(JSON.stringify({ ok: true, skipped: "no_text" }), { status: 200 });
      }

      // Deduplicação por messageId
      if (messageId) {
        const { data: existing } = await sb
          .from("atende_ai_messages")
          .select("id")
          .eq("organization_id", instance.organization_id)
          .eq("external_id", messageId)
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ ok: true, skipped: "duplicate" }), { status: 200 });
        }
      }

      // Encontrar ou criar conversa (janela de 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      let conversationId: string;

      const { data: existingConv } = await sb
        .from("atende_ai_conversations")
        .select("id, paused_until")
        .eq("instance_id", instance.id)
        .eq("contact_phone", phone)
        .eq("status", "open")
        .gt("last_message_at", twentyFourHoursAgo)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;

        // Update last_message_at always so conversation stays fresh in sidebar
        await sb
          .from("atende_ai_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        // Respeitar pausa por intervenção humana — salvar mensagem mas NÃO responder com IA
        if (existingConv.paused_until && new Date() < new Date(existingConv.paused_until)) {
          // Still save the user's message so the human agent can see it
          await sb.from("atende_ai_messages").insert({
            conversation_id: conversationId,
            organization_id: instance.organization_id,
            external_id: messageId || null,
            role: "user",
            content: text,
            message_type: ["text", "image", "video", "audio", "document"].includes(messageType) ? messageType : "text",
          });

          await sb.rpc("increment_atende_ai_stats", {
            p_instance_id: instance.id,
            p_conversations: 0,
            p_messages: 1,
          });

          console.log(`[Webhook] Conversa ${conversationId} pausada até ${existingConv.paused_until}. Mensagem salva, IA não responde.`);
          return new Response(JSON.stringify({ ok: true, skipped: "paused_by_human", message_saved: true }), { status: 200 });
        }
      } else {
        const { data: newConv } = await sb
          .from("atende_ai_conversations")
          .insert({
            instance_id: instance.id,
            organization_id: instance.organization_id,
            contact_name: senderName,
            contact_phone: phone,
            channel: "whatsapp",
            status: "open",
          })
          .select("id")
          .single();

        conversationId = newConv!.id;

        await sb.rpc("increment_atende_ai_stats", {
          p_instance_id: instance.id,
          p_conversations: 1,
          p_messages: 0,
        });
      }

      // Guardar mensagem do utilizador
      const { data: insertedMsg, error: insertErr } = await sb
        .from("atende_ai_messages")
        .insert({
          conversation_id: conversationId,
          organization_id: instance.organization_id,
          external_id: messageId || null,
          role: "user",
          content: text,
          message_type: ["text", "image", "video", "audio", "document"].includes(messageType) ? messageType : "text",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Erro ao inserir mensagem:", insertErr);
        return new Response(JSON.stringify({ error: "DB error" }), { status: 500 });
      }

      await sb.rpc("increment_atende_ai_stats", {
        p_instance_id: instance.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // Reagir à mensagem do utilizador (inteligente, ~30% de chance)
      const instanceApiKeyEarly = instance.instance_api_key || EVOLUTION_GO_API_KEY;
      if (messageId) {
        reactToMessage(messageId, phone, instanceApiKeyEarly, text);
      }

      // Buffer para aguardar mensagens em série (debounce)
      const bufferSeconds = instance.response_delay_seconds ?? 3;
      if (bufferSeconds > 0) {
        const startTime = Date.now();
        while (Date.now() - startTime < Math.min(bufferSeconds * 1000, 20000)) {
          await new Promise((r) => setTimeout(r, 1200));
          const { data: latestMsg } = await sb
            .from("atende_ai_messages")
            .select("id")
            .eq("conversation_id", conversationId)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestMsg && latestMsg.id !== insertedMsg.id) {
            return new Response(JSON.stringify({ ok: true, skipped: "newer_detected" }), { status: 200 });
          }

          if (Date.now() - startTime >= bufferSeconds * 1000) break;
        }
      }

      // Mensagem de boas-vindas (primeira mensagem)
      const { data: historyRows } = await sb
        .from("atende_ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50);

      const history = (historyRows || [])
        .slice(0, -1)
        .map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));

      const isFirstMessage = history.length === 0;
      const instanceApiKey = instance.instance_api_key || EVOLUTION_GO_API_KEY;
      const instanceName = instance.evolution_instance_id;

      if (isFirstMessage && instance.welcome_message && instanceName) {
        await sendTextMessage(instanceName, phone, instance.welcome_message, instanceApiKey);
      }

      // Chamar IA
      const systemPrompt = buildSystemPrompt(instance);
      const aiReply = await callAI(systemPrompt, history, text, instance);

      if (!aiReply) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Guardar resposta da IA
      await sb.from("atende_ai_messages").insert({
        conversation_id: conversationId,
        organization_id: instance.organization_id,
        role: "assistant",
        content: aiReply,
        message_type: "text",
      });

      await logToDb(sb, instance.id, "ai_reply_sent", `IA respondeu para ${phone}: ${aiReply.substring(0, 100)}...`);

      await sb.rpc("increment_atende_ai_stats", {
        p_instance_id: instance.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // Enviar resposta via Evolution Go (com token específico da instância)
      if (instanceName) {
        const delayMs = instance.show_typing ? 7000 : 500;
        await smartSendMessage(instanceName, phone, aiReply, instanceApiKey, delayMs);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Evento não tratado — aceitar sem erro para não causar retentativas
    return new Response(JSON.stringify({ ok: true, event }), { status: 200 });

  } catch (err: any) {
    console.error("Webhook erro inesperado:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
