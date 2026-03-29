/**
 * evolution-go-webhook
 *
 * Webhook exclusivo para o Atende AI — recebe eventos do Evolution Go e escreve
 * nas tabelas `atende_ai_conversations` e `atende_ai_messages` (arquitetura
 * totalmente independente do módulo legado "Agentes de IA").
 *
 * Autenticação: secret UUID no path   /evolution-go-webhook/{evolution_webhook_secret}
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
const EVOLUTION_GO_BASE_URL = Deno.env.get("EVOLUTION_GO_BASE_URL") || "";
const EVOLUTION_GO_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";

// ─── Helpers ─────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").replace(/@.*$/, "");
}

async function logToDb(sb: any, instanceId: string, event: string, details: string) {
  try {
    // Use a simple console log fallback if table doesn't exist yet
    console.log(`[${event}] instance:${instanceId} — ${details.substring(0, 300)}`);
  } catch (_e) {}
}

// ─── Evolution Go: Send Text Message ────────────────────────

async function sendTextMessage(
  instanceName: string,
  number: string,
  text: string,
  delayMs = 1500,
) {
  if (!EVOLUTION_GO_BASE_URL) {
    console.warn("EVOLUTION_GO_BASE_URL not set — cannot send message");
    return;
  }

  const res = await fetch(`${EVOLUTION_GO_BASE_URL}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_GO_API_KEY,
    },
    body: JSON.stringify({
      number,
      text,
      delay: delayMs,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`sendTextMessage failed: ${res.status} ${txt}`);
  }

  return res.ok;
}

// ─── OpenAI: Build System Prompt ─────────────────────────────

function buildSystemPrompt(instance: Record<string, unknown>): string {
  const parts: string[] = [];

  const name = (instance.name as string) || "Atendente Virtual";
  const companyName = (instance.company_name as string) || "";

  parts.push(`## 1. IDENTIDADE`);
  parts.push(`Você é ${name}${companyName ? `, representando a empresa ${companyName}` : ""} no atendimento via WhatsApp.`);
  parts.push("");
  parts.push(`## 2. COMUNICAÇÃO`);
  parts.push(`- Seja sempre educado, objetivo e em português.`);
  parts.push(`- Use emojis com moderação para manter o tom humano.`);
  parts.push(`- Mensagens curtas e parágrafos espaçados — o WhatsApp não é lugar para textos densos.`);
  parts.push("");

  // Company info
  if (companyName) parts.push(`Nome da empresa: ${companyName}`);
  const sector = instance.company_sector as string;
  if (sector) parts.push(`Ramo: ${sector}`);
  const desc = instance.company_description as string;
  if (desc) { parts.push(""); parts.push(`## SOBRE A EMPRESA`); parts.push(desc); }

  // Business hours
  const hours = instance.business_hours as string;
  if (hours) { parts.push(""); parts.push(`## HORÁRIO DE FUNCIONAMENTO`); parts.push(hours); }

  // Address
  const address = instance.address as string;
  const addressRef = instance.address_reference as string;
  if (address) {
    parts.push(""); parts.push(`## ENDEREÇO`);
    parts.push(`- Endereço: ${address}`);
    if (addressRef) parts.push(`- Referência: ${addressRef}`);
  }

  // Response size
  const size = (instance.response_size as number) || 2;
  if (size === 1) parts.push("\n## TAMANHO: Respostas CURTAS, máximo 2-3 frases.");
  else if (size === 3) parts.push("\n## TAMANHO: Respostas DETALHADAS quando necessário.");
  else parts.push("\n## TAMANHO: Respostas de tamanho médio, claras e objetivas.");

  // Agent-specific instructions (highest priority)
  const instructions = instance.instructions as string;
  if (instructions) {
    parts.push("");
    parts.push("## INSTRUÇÕES DE ATENDIMENTO (PRIORIDADE MÁXIMA)");
    parts.push(instructions);
  }

  // Extra info
  const extra = instance.extra_info as string;
  if (extra) {
    parts.push(""); parts.push("## INFORMAÇÕES ADICIONAIS"); parts.push(extra);
  }

  // Current datetime
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { timeZone: "Africa/Maputo" });
  const timeStr = now.toLocaleTimeString("pt-BR", { timeZone: "Africa/Maputo", hour: "2-digit", minute: "2-digit" });
  parts.push(`\n## DATA E HORA ATUAL: ${dateStr} às ${timeStr} (fuso: Maputo)`);

  return parts.join("\n");
}

// ─── OpenAI: Call Chat Completions ──────────────────────────

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
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    console.error("OpenAI error:", res.status, await res.text());
    return "Desculpe, tive um problema técnico ao processar a sua mensagem.";
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// ─── Main Handler ────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const secret = pathParts[pathParts.length - 1];

    if (!secret || secret.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid secret" }), { status: 401 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Locate the Atende AI instance by its evolution_webhook_secret UUID
    const { data: instance, error: instanceErr } = await sb
      .from("atende_ai_instances")
      .select("*")
      .eq("evolution_webhook_secret", secret)
      .single();

    if (instanceErr || !instance) {
      console.error("Webhook: instância não encontrada para o secret");
      return new Response(JSON.stringify({ error: "Invalid secret" }), { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
    }

    const event = (body.event as string) || (body.EventType as string) || "message";

    // ─── Connection event ─────────────────────────────────
    if (event === "connection.update" || event === "connection") {
      const connected = (body.state as string) === "open";

      await sb
        .from("atende_ai_instances")
        .update({
          whatsapp_connected: connected,
          status: connected ? "active" : "inactive",
          connected_number: connected ? ((body.number as string) || null) : null,
        })
        .eq("id", instance.id);

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // ─── Message received event ───────────────────────────
    if (event === "messages.upsert" || event === "message" || event === "messages") {
      if (instance.status !== "active") {
        return new Response(JSON.stringify({ ok: true, skipped: "instance_not_active" }), { status: 200 });
      }

      const messageData =
        (body.data as Record<string, unknown>) ||
        (body.message as Record<string, unknown>) ||
        {};

      const isGroup =
        (messageData.key as any)?.remoteJid?.includes("@g.us") ||
        ((messageData.chatid as string) || "").includes("@g.us");

      if (isGroup) return new Response(JSON.stringify({ ok: true }), { status: 200 });

      const fromMe =
        (messageData.key as any)?.fromMe === true ||
        messageData.fromMe === true;

      const remoteJid =
        (messageData.key as any)?.remoteJid ||
        (messageData.chatid as string) ||
        "";
      const phone = normalizePhone(remoteJid);
      const messageId =
        (messageData.key as any)?.id ||
        (messageData.messageid as string) ||
        (messageData.id as string) ||
        "";

      // Extract text
      const msgContent =
        (messageData.message as any)?.conversation ||
        (messageData.message as any)?.extendedTextMessage?.text ||
        (messageData.text as string) ||
        (messageData.content as string) ||
        "";
      const text = (typeof msgContent === "string" ? msgContent : "").trim();

      if (!text) {
        return new Response(JSON.stringify({ ok: true, skipped: "no_text" }), { status: 200 });
      }

      // Deduplicate
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

      // Find or create conversation (last 24h)
      let conversationId: string;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: existingConv } = await sb
        .from("atende_ai_conversations")
        .select("id, paused_until, waiting_human")
        .eq("instance_id", instance.id)
        .eq("contact_phone", phone)
        .eq("status", "open")
        .gt("last_message_at", twentyFourHoursAgo)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;

        // Respect human pause
        if (!fromMe && existingConv.paused_until) {
          if (new Date() < new Date(existingConv.paused_until)) {
            return new Response(JSON.stringify({ ok: true, skipped: "paused_by_human" }), { status: 200 });
          }
        }

        await sb
          .from("atende_ai_conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      } else {
        const contactName =
          (messageData.pushName as string) ||
          (messageData.senderName as string) ||
          phone;

        const { data: newConv } = await sb
          .from("atende_ai_conversations")
          .insert({
            instance_id: instance.id,
            organization_id: instance.organization_id,
            contact_name: contactName,
            contact_phone: phone,
            channel: "whatsapp",
            status: "open",
          })
          .select("id")
          .single();

        conversationId = newConv!.id;

        // Increment conversation counter
        await sb.rpc("increment_atende_ai_stats", {
          p_instance_id: instance.id,
          p_conversations: 1,
          p_messages: 0,
        });
      }

      // Human intervention (fromMe message in an active conversation)
      if (fromMe) {
        const { data: recentAiMsg } = await sb
          .from("atende_ai_messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("role", "assistant")
          .eq("content", text)
          .is("external_id", null)
          .gt("created_at", new Date(Date.now() - 30000).toISOString())
          .maybeSingle();

        if (recentAiMsg) {
          if (messageId) {
            await sb.from("atende_ai_messages").update({ external_id: messageId }).eq("id", recentAiMsg.id);
          }
          return new Response(JSON.stringify({ ok: true, skipped: "self_ai_message" }), { status: 200 });
        }

        // Real human intervention → pause the bot
        await sb.from("atende_ai_messages").insert({
          conversation_id: conversationId,
          organization_id: instance.organization_id,
          external_id: messageId || null,
          role: "system",
          content: text,
          message_type: "text",
        });

        const pauseMinutes = instance.human_pause_duration || 60;
        const pausedUntil = new Date(Date.now() + pauseMinutes * 60 * 1000).toISOString();

        await sb
          .from("atende_ai_conversations")
          .update({ paused_until: pausedUntil, waiting_human: false })
          .eq("id", conversationId);

        return new Response(JSON.stringify({ ok: true, paused_until: pausedUntil }), { status: 200 });
      }

      // Save incoming user message
      const { data: insertedMsg, error: insertErr } = await sb
        .from("atende_ai_messages")
        .insert({
          conversation_id: conversationId,
          organization_id: instance.organization_id,
          external_id: messageId || null,
          role: "user",
          content: text,
          message_type: "text",
        })
        .select("id, created_at")
        .single();

      if (insertErr) {
        console.error("Insert message error:", insertErr);
        return new Response(JSON.stringify({ error: "DB error" }), { status: 500 });
      }

      const insertedMsgId = insertedMsg.id;

      // Increment message counter
      await sb.rpc("increment_atende_ai_stats", {
        p_instance_id: instance.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // Debounce / buffer waiting
      const bufferSeconds = instance.response_delay_seconds ?? 3;
      if (bufferSeconds > 0) {
        const startTime = Date.now();
        const maxWait = 20000;

        while (Date.now() - startTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 1200));

          const { data: latestMsg } = await sb
            .from("atende_ai_messages")
            .select("id")
            .eq("conversation_id", conversationId)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestMsg && latestMsg.id !== insertedMsgId) {
            return new Response(JSON.stringify({ ok: true, skipped: "newer_detected" }), { status: 200 });
          }

          const elapsed = Date.now() - startTime;
          if (elapsed >= bufferSeconds * 1000) break;
        }
      }

      // Load conversation history
      const { data: historyRows } = await sb
        .from("atende_ai_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50);

      const history = (historyRows || [])
        .slice(0, -1)
        .map((m: any) => {
          if (m.role === "system") {
            return {
              role: "user",
              content: `[AVISO INTERNO]: Um atendente humano enviou esta mensagem: "${m.content}"`,
            };
          }
          return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
        });

      // Welcome message on first message
      const isFirstMessage = history.length === 0;
      if (isFirstMessage && instance.welcome_message && instance.evolution_instance_id) {
        await sendTextMessage(instance.evolution_instance_id, phone, instance.welcome_message);
      }

      // Build prompt and call AI
      const systemPrompt = buildSystemPrompt(instance);
      const aiReply = await callAI(systemPrompt, history, text);

      if (!aiReply) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Save AI reply
      await sb.from("atende_ai_messages").insert({
        conversation_id: conversationId,
        organization_id: instance.organization_id,
        role: "assistant",
        content: aiReply,
        message_type: "text",
      });

      // Increment message count for AI reply
      await sb.rpc("increment_atende_ai_stats", {
        p_instance_id: instance.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // Send reply via Evolution Go
      if (instance.evolution_instance_id) {
        const delayMs = instance.show_typing ? 1500 : 500;
        await sendTextMessage(instance.evolution_instance_id, phone, aiReply, delayMs);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Unhandled event — just acknowledge
    return new Response(JSON.stringify({ ok: true }), { status: 200 });

  } catch (err: any) {
    console.error("Webhook unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
