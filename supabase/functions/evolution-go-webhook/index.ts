/**
 * evolution-go-webhook
 *
 * Recebe eventos do Evolution Go (Go Edition) e processa mensagens via IA.
 * Autenticação: UUID secreto no path → /evolution-go-webhook/{secret}
 *
 * Eventos suportados (conforme manual oficial):
 *   - QRCode        → salva qr_code_base64 no banco
 *   - Connected     → marca instância como conectada
 *   - PairSuccess   → marca instância como conectada
 *   - LoggedOut     → marca instância como desconectada
 *   - Message       → processa mensagens e responde com IA
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
  const res = await fetch(`${EVOLUTION_GO_BASE_URL}/message/sendText/${instanceName}`, {
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

// ─── AI ────────────────────────────────────────────────────

function buildSystemPrompt(instance: any): string {
  const parts: string[] = [];
  const name = instance.name || "Atendente Virtual";
  const companyName = instance.company_name || "";

  parts.push(`## IDENTIDADE`);
  parts.push(`Você é ${name}${companyName ? `, representando a empresa ${companyName}` : ""} no atendimento via WhatsApp.`);
  parts.push("");
  parts.push(`## COMUNICAÇÃO`);
  parts.push(`- Seja sempre educado, objetivo e em português.`);
  parts.push(`- Use emojis com moderação para manter o tom humano.`);
  parts.push(`- Mensagens curtas e parágrafos espaçados.`);

  if (instance.company_sector) parts.push(`\nRamo: ${instance.company_sector}`);
  if (instance.company_description) parts.push(`\n## SOBRE A EMPRESA\n${instance.company_description}`);
  if (instance.business_hours) parts.push(`\n## HORÁRIO\n${instance.business_hours}`);
  if (instance.address) parts.push(`\n## ENDEREÇO\n${instance.address}`);
  if (instance.instructions) parts.push(`\n## INSTRUÇÕES (PRIORIDADE MÁXIMA)\n${instance.instructions}`);
  if (instance.extra_info) parts.push(`\n## INFORMAÇÕES ADICIONAIS\n${instance.extra_info}`);

  const now = new Date();
  parts.push(`\n## DATA/HORA: ${now.toLocaleString("pt-BR", { timeZone: "Africa/Maputo" })} (Maputo)`);

  return parts.join("\n");
}

async function callAI(
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string,
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, temperature: 0.4, max_tokens: 1024 }),
  });
  if (!res.ok) {
    console.error("OpenAI erro:", res.status, await res.text());
    return "Desculpe, tive um problema técnico.";
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// ─── Handler Principal ───────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });

  try {
    // Extrair o secret UUID do path
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const secret = pathParts[pathParts.length - 1];

    if (!secret || secret.length < 10) {
      return new Response(JSON.stringify({ error: "Secret inválido" }), { status: 401 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Localizar a instância pelo secret UUID
    const { data: instance, error: instanceErr } = await sb
      .from("atende_ai_instances")
      .select("*")
      .eq("evolution_webhook_secret", secret)
      .single();

    if (instanceErr || !instance) {
      console.error("Webhook: instância não encontrada para o secret:", secret.substring(0, 8) + "...");
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
    }

    // O event name vem no campo "event" conforme documentação oficial
    const event = body.event as string || "";
    console.log(`[Webhook] Evento recebido: "${event}" p/ instância: ${instance.id}`);

    // ─── QRCode: salvar no banco para o frontend fazer polling ───
    if (event === "QRCode" || event === "qrcode.updated") {
      const qrBase64 = body.data?.qrcode || body.data?.base64 || body.qrcode || body.code || null;
      if (qrBase64) {
        await sb
          .from("atende_ai_instances")
          .update({ qr_code_base64: qrBase64 })
          .eq("id", instance.id);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ─── Connected / PairSuccess / Update: instância conectada ──────────
    const isActuallyConnected = 
      event === "Connected" || 
      event === "PairSuccess" || 
      event === "connection.update" ||
      body.data?.status === "open" || 
      body.data?.state === "open" ||
      body.data?.Connected === true ||
      body.data?.LoggedIn === true ||
      body.status === "open" ||
      body.state === "open";

    if (isActuallyConnected && (event === "connection.update" || event === "Connected" || event === "PairSuccess" || body.data?.status === "open" || body.status === "open")) {
       const status = body.data?.status || body.status || body.data?.state || body.state || "open";
       // Em connection.update, só procedemos se o status for "open"
       if ((event === "connection.update") && status !== "open") {
          // Ignorar se for "close", "connecting", etc.
       } else {
          console.log(`[Webhook] Conexão confirmada para: ${instance.id} (Evento: ${event}, Status: ${status})`);
          const jid = body.data?.jid || body.data?.ID || body.data?.instance?.owner || body.data?.owner || body.owner || body.instance?.owner || null;
          const number = jid ? normalizePhone(jid.toString()) : null;
          const profileName = body.data?.instance?.instanceName || body.data?.name || body.data?.Name || null;
          
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
          return new Response(JSON.stringify({ ok: true, status: "connected" }), { status: 200 });
       }
    }

    // ─── LoggedOut / Disconnected / close: instância desconectada ─────────────────────
    const isDisconnected = 
      event === "LoggedOut" || 
      event === "Disconnected" || 
      (event === "connection.update" && (body.data?.status === "close" || body.status === "close" || body.data?.state === "close" || body.state === "close")) ||
      body.data?.status === "close" || 
      body.data?.state === "close" ||
      body.status === "close" ||
      body.state === "close";

    if (isDisconnected) {
      console.log(`[Webhook] Desconexão detectada para: ${instance.id} (Evento: ${event})`);
      await sb
        .from("atende_ai_instances")
        .update({
          whatsapp_connected: false,
          status: "inactive",
          connected_number: null,
          qr_code_base64: null,
        })
        .eq("id", instance.id);
      return new Response(JSON.stringify({ ok: true, status: "disconnected" }), { status: 200 });
    }

    // ─── OfflineSyncCompleted: sincronização finalizada ────────
    if (event === "OfflineSyncCompleted") {
      await sb
        .from("atende_ai_instances")
        .update({
          whatsapp_connected: true,
          status: "active",
          qr_code_base64: null,
        })
        .eq("id", instance.id);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ─── Message: processar e responder com IA ─────────────────
    if (event === "Message") {
      // Só responde se a instância estiver ativa
      if (instance.status !== "active") {
        return new Response(JSON.stringify({ ok: true, skipped: "instance_not_active" }), { status: 200 });
      }

      const info = body.data?.Info as any;
      const msgContent = body.data?.Message as any;

      if (!info) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_info" }), { status: 200 });
      }

      // Ignorar mensagens do próprio bot
      if (info.IsFromMe === true) {
        return new Response(JSON.stringify({ ok: true, skipped: "from_me" }), { status: 200 });
      }

      // Ignorar grupos
      if (info.IsGroup === true || (info.Chat || "").includes("@g.us")) {
        return new Response(JSON.stringify({ ok: true, skipped: "group" }), { status: 200 });
      }

      const phone = normalizePhone(info.Chat || info.Sender || "");
      const messageId = info.ID || "";
      const senderName = info.PushName || phone;

      // Extrair texto ou tipo de media recebido
      let text = (
        msgContent?.conversation ||
        msgContent?.extendedTextMessage?.text ||
        msgContent?.imageMessage?.caption ||
        msgContent?.videoMessage?.caption ||
        msgContent?.documentMessage?.caption ||
        ""
      ).trim();

      const messageType = info.MediaType || info.Type || "text";

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

        // Respeitar pausa por intervenção humana
        if (existingConv.paused_until && new Date() < new Date(existingConv.paused_until)) {
          return new Response(JSON.stringify({ ok: true, skipped: "paused_by_human" }), { status: 200 });
        }

        await sb
          .from("atende_ai_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
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
      const aiReply = await callAI(systemPrompt, history, text);

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

      await sb.rpc("increment_atende_ai_stats", {
        p_instance_id: instance.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // Enviar resposta via Evolution Go (com token específico da instância)
      if (instanceName) {
        const delayMs = instance.show_typing ? 1500 : 500;
        await sendTextMessage(instanceName, phone, aiReply, instanceApiKey, delayMs);
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
