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
  instanceId: string,
  instanceName: string,
  number: string,
  text: string,
  apiKey: string,
  sb: any,
  delayMs = 1500,
) {
  if (!EVOLUTION_GO_BASE_URL) {
    console.warn("EVOLUTION_GO_BASE_URL não configurada — não pode enviar mensagem");
    await logToDb(sb, instanceId, "error", "EVOLUTION_GO_BASE_URL não configurada");
    return false;
  }

  const endpoint = `${EVOLUTION_GO_BASE_URL}/send/text`;
  const usedKey = apiKey || EVOLUTION_GO_API_KEY;

  console.log(`[sendTextMessage] Enviando para ${number} via ${instanceName}. Endpoint: ${endpoint}`);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": usedKey,
      },
      body: JSON.stringify({ number, text, delay: delayMs }),
    });

    const resText = await res.text();
    console.log(`[sendTextMessage] Resposta:`, resText);

    if (!res.ok) {
      console.error(`sendTextMessage falhou: ${res.status}`, resText);
      await logToDb(sb, instanceId, "error", `Falha ao enviar: ${res.status} - ${resText.slice(0, 150)}`);
      return null;
    }

    // Tentar extrair ID da mensagem se disponível no JSON
    let messageId = null;
    try {
      const resJson = JSON.parse(resText);
      messageId = resJson.key?.id || resJson.messageId || null;
    } catch {
      // Ignorar erro de parse
    }

    await logToDb(sb, instanceId, "ai_reply_sent", `Resposta enviada para ${number}. ID: ${messageId}`);
    return messageId || true; // Retorna o ID ou true se não encontrar ID mas foi OK
  } catch (err) {
    console.error(`[sendTextMessage] Erro de rede:`, err);
    await logToDb(sb, instanceId, "error", `Erro de rede ao enviar mensagem: ${err.message}`);
    return null;
  }
}

// ─── Format to WhatsApp ────────────────────────────────────
function formatToWhatsApp(text: string): string {
  if (!text) return "";
  
  return text
    // Bold: **text** or __text__ -> *text*
    .replace(/(\*\*|__)(.*?)\1/g, "*$2*")
    // Strikethrough: ~~text~~ -> ~text~
    .replace(/~~(.*?)~~/g, "~$1~")
    // Headers: ### text -> *text*
    .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
    // Code blocks: ```text``` -> ```text``` (ensure no language tag)
    .replace(/```[a-z]*\n([\s\S]*?)\n```/g, "```$1```")
    // Inline code: `text` -> ```text```
    .replace(/`([^`]+)`/g, "```$1```")
    // Remove extra newlines (more than 2)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Split Message into Coherent Chunks ────────────────────
function splitMessageIntoChunks(text: string): string[] {
  if (!text) return [];
  
  // 1. Dividir por parágrafos duplos
  const paragraphs = text.split(/\n\n+/);
  const finalChunks: string[] = [];

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;

    // Se o parágrafo for curto (menos de 250 caracteres), manter inteiro
    if (p.length < 250) {
      finalChunks.push(p);
      continue;
    }

    // 2. Se for longo, tentar dividir por frases que não terminem em :
    const sentences = p.split(/(?<=[.!?])\s+(?=[A-Z]|[0-9]|["'«„])(?![^:]*:)/);
    
    let currentChunk = "";
    for (const sentence of sentences) {
      if ((currentChunk.length + sentence.length) > 400) {
        if (currentChunk) finalChunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }
    if (currentChunk) finalChunks.push(currentChunk.trim());
  }

  return finalChunks.filter(c => c.length > 0);
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

// ─── Mark as Read ───────────────────────────────────────────
async function markAsRead(number: string, apiKey: string) {
  if (!EVOLUTION_GO_BASE_URL) return;
  try {
    await fetch(`${EVOLUTION_GO_BASE_URL}/chat/read/${number}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey || EVOLUTION_GO_API_KEY,
      },
      body: JSON.stringify({ read: true }),
    });
  } catch (err) {
    console.warn("[markAsRead] erro:", err);
  }
}

// ─── Presence: Typing/Recording ─────────────────────────────
async function sendPresence(number: string, presence: "composing" | "recording" | "paused", apiKey: string) {
  if (!EVOLUTION_GO_BASE_URL) return;
  try {
    // Evolution Go typical endpoint: /chat/presence/{number}
    // Note: Some versions might use /presence/update
    await fetch(`${EVOLUTION_GO_BASE_URL}/chat/presence/${number}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": apiKey || EVOLUTION_GO_API_KEY,
      },
      body: JSON.stringify({ presence }),
    });
  } catch (err) {
    console.warn("[sendPresence] erro:", err);
  }
}

// ─── Fetch Profile Picture ──────────────────────────────────
async function fetchProfilePicture(number: string, apiKey: string): Promise<string | null> {
  if (!EVOLUTION_GO_BASE_URL) return null;
  try {
    // Note: Evolution Go (Go Edition) typically has /chat/fetchProfilePictureUrl
    const res = await fetch(`${EVOLUTION_GO_BASE_URL}/chat/fetchProfilePictureUrl/${number}`, {
      method: "GET",
      headers: {
        "apikey": apiKey || EVOLUTION_GO_API_KEY,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profilePictureUrl || data.url || null;
  } catch (err) {
    console.warn("[fetchProfilePicture] erro:", err);
    return null;
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
  instanceId: string,
  instanceName: string,
  number: string,
  text: string,
  apiKey: string,
  sb: any,
  delayMs: number,
) {
  const url = extractUrl(text);

  if (url) {
    // Try sending as link first for rich preview
    const linkSent = await sendLinkMessage(number, text, url, apiKey, delayMs);
    if (linkSent) return true;
  }

  // Fallback to plain text
  return sendTextMessage(instanceId, instanceName, number, text, apiKey, sb, delayMs);
}

// ─── AI ────────────────────────────────────────────────────

function buildSystemPrompt(instance: any): string {
  const parts: string[] = [];
  const name = instance.name || "Consultor de Atendimento";
  const companyName = instance.company_name || "";

  parts.push(`## IDENTIDADE`);
  parts.push(`Você é ${name}${companyName ? `, representando a empresa ${companyName}` : ""} no atendimento via WhatsApp.`);
  parts.push("");

  // Response size guidance
  const responseSize = instance.response_size ?? 2;
  parts.push(`## COMUNICAÇÃO`);
  parts.push(`- Seja sempre educado, objetivo e em português.`);
  parts.push(`- Use emojis com moderação para manter o tom humano.`);
  parts.push(`- IMPORTANTE: Use formatação nativa do WhatsApp: *negrito*, _itálico_ e ~tachado~.`);
  parts.push(`- JAMAIS use Markdown padrão como # para títulos ou ** para negrito.`);
  if (responseSize === 1) {
    parts.push(`- IMPORTANTE: Seja extremamente conciso. Responda em no máximo 1-2 frases curtas. Vá directo ao ponto sem rodeios.`);
  } else if (responseSize === 3) {
    parts.push(`- Dê respostas detalhadas e completas. Explique bem cada ponto com exemplos quando necessário.`);
  } else {
    parts.push(`- Mensagens curtas e parágrafos espaçados. Nem muito breve nem muito longo.`);
  }

  parts.push(`\n## REGRA DE CORTESIA (RETORNO DE PESQUISA):`);
  parts.push(`- Se a conversa anterior mostrar que você disse que ia "verificar" ou "conferir" algo, SEMPRE comece sua nova resposta com frases como: "Voltei!", "Tudo certo, obrigado por aguardar.", "Consegui confirmar aqui, desculpe a demora.", ou "Prontinho, obrigado pela paciência."`);
  parts.push(`- Mantenha o tom de um atendente prestativo que acabou de voltar de uma consulta ao estoque/sistema.`);

  if (instance.welcome_message) {
    parts.push(`\n## ESTILO DE SAUDAÇÃO`);
    parts.push(`Seu estilo de saudação configurado é: "${instance.welcome_message}"`);
    parts.push(`Mantenha esse tom educado e acolhedor em todas as interações.`);
  }

  if (instance.company_sector) parts.push(`\nRamo: ${instance.company_sector}`);
  if (instance.company_description) parts.push(`\n## SOBRE A EMPRESA\n${instance.company_description}`);
  if (instance.business_hours) parts.push(`\n## HORÁRIO DE FUNCIONAMENTO\n${instance.business_hours}`);

  // Address with reference
  if (instance.address) {
    let addressBlock = instance.address;
    if (instance.address_reference) {
      addressBlock += `\nPonto de referência: ${instance.address_reference}`;
    }
    parts.push(`\n## ENDEREÇO\n${addressBlock}`);
  }

  if (instance.instructions) parts.push(`\n## DIRETRIZES DE COMPORTAMENTO (PRIORIDADE MÁXIMA)\n${instance.instructions}`);
  
  if (instance.conversation_flow) {
    parts.push(`\n## MAPA DE NAVEGAÇÃO DA CONVERSA (ESTRITAMENTE OBRIGATÓRIO)`);
    parts.push(`⚠️ VOCÊ NÃO PODE PULAR ETAPAS. Use o fluxo abaixo como seu guia mestre de atendimento:`);
    parts.push(`\n${instance.conversation_flow}`);
    parts.push(`\nINSTRUÇÃO DE FLUXO: Analise o histórico e identifique em qual etapa você está agora. Sua missão é conduzir o cliente suavemente para a PRÓXIMA etapa definida no mapa acima.`);
  }
  if (instance.extra_info) parts.push(`\n## INFORMAÇÕES ADICIONAIS\n${instance.extra_info}`);

  const trainingData = instance.training_data_text || instance.training_data;
  if (trainingData) {
    parts.push(`\n## BASE DE DADOS DA EMPRESA (CATÁLOGO)\n`);
    parts.push(`⚠️ ATENÇÃO: As informações abaixo são a ÚNICA VERDADE sobre a empresa. Use-as estritamente.\n`);
    parts.push(trainingData);
    parts.push(`\n⚠️ FIM DA BASE DE DADOS.\n`);
  }

  parts.push(`\n## REGRA CRÍTICA DE HUMANIZAÇÃO (SIGILO ABSOLUTO):`);
  parts.push(`1. JAMAIS admita que você é uma IA, robô ou assistente virtual. Se perguntarem, diga que é da equipe de atendimento da empresa.`);
  parts.push(`2. NUNCA use o termo "atendente humano" ou "sistema". Use "colega", "chefe", "especialista", "superior" ou "setor responsável".`);
  parts.push(`3. Sua linguagem deve ser natural e calorosa, como se você estivesse realmente digitando no teclado.`);

  parts.push(`\n## REGRA CRÍTICA ANTI-ALUCINAÇÃO (JAMAIS INVENTAR):`);
  parts.push(`1. Se o cliente perguntar sobre algo que NÃO ESTÁ na BASE DE DADOS acima, responda: "Lamento, mas não tenho esse detalhe aqui comigo agora. Vou anotar para o meu colega verificar e te dar um retorno, pode ser?"`);
  parts.push(`2. Se a dúvida for complexa e você precisar de ajuda real do seu superior, adicione a tag secreta [ASK_SUPERVISOR: Sua dúvida aqui] ao final da sua resposta interna. Eu cuidarei de enviar para o seu chefe.`);
  parts.push(`3. JAMAIS invente preços. Se o preço de um item não estiver na lista, diga que vai confirmar com o setor responsável.`);
  parts.push(`4. JAMAIS invente produtos ou serviços.`);
  parts.push(`5. Se você tiver dúvida se uma informação existe ou não, assuma que NÃO existe.`);

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

  const startTime = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;
    console.log(`[AI Fetch] Provider: ${provider}, Model: ${model}, Duration: ${duration}ms, Status: ${res.status}`);

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

/**
 * Usa IA para parear uma resposta do supervisor com uma das dúvidas pendentes.
 */
async function matchSupervisorReplyWithQuery(supervisorAnswer: string, pendingQueries: any[]) {
  if (!OPENAI_API_KEY) return pendingQueries[0]; // Fallback se não houver chave global

  try {
    const queryList = pendingQueries.map((q, i) => `ID: ${i} | Dúvida: "${q.query_text}" | Cliente: ${q.atende_ai_conversations?.contact_name || "Desconhecido"}`).join("\n");
    
    const systemPrompt = `Você é um assistente de triagem de mensagens.
O supervisor de uma empresa enviou uma resposta via WhatsApp, mas ele não citou qual dúvida estava respondendo.
Sua missão é identificar qual das dúvidas pendentes abaixo mais se encaixa com a resposta dele.

DÚVIDAS PENDENTES:
${queryList}

RESPOSTA DO SUPERVISOR:
"${supervisorAnswer}"

REGRAS:
1. Analise o contexto da resposta e das dúvidas.
2. Responda APENAS o número do ID (0, 1, 2, etc) da dúvida correspondente.
3. Se nenhuma dúvida parecer correta, responda "NENHUMA".
4. Seja preciso. Se houver dúvida, prefira a mais recente (ID 0).`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0,
        max_tokens: 10
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const result = data.choices?.[0]?.message?.content?.trim();
      
      if (result && result !== "NENHUMA") {
        const index = parseInt(result);
        if (!isNaN(index) && pendingQueries[index]) {
          console.log(`[Supervisor Match] IA pareou com ID ${index}: "${pendingQueries[index].query_text}"`);
          return pendingQueries[index];
        }
      }
    }
  } catch (err) {
    console.error("[matchSupervisorReplyWithQuery] erro:", err);
  }

  return pendingQueries[0]; // Fallback para a mais recente
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
    let instance: any = null;
    let isLegacy = false;

    const { data: atendeInstance, error: instanceErr } = await sb
      .from("atende_ai_instances")
      .select("*, organizations(name)")
      .or(`evolution_webhook_secret.eq.${secret},id.eq.${secret},evolution_instance_id.eq.${secret}`)
      .maybeSingle();

    if (atendeInstance) {
      instance = atendeInstance;
    } else {
      // Tentar na tabela ai_agents
      const { data: legacyInstance, error: legacyErr } = await sb
        .from("ai_agents")
        .select("*")
        .or(`uazapi_webhook_secret.eq.${secret},evolution_webhook_secret.eq.${secret}`)
        .maybeSingle();
      
      if (legacyInstance) {
        instance = legacyInstance;
        isLegacy = true;
      } else {
        console.error("Webhook: instância não encontrada para o secret:", secret, "Erro Atende:", instanceErr, "Erro Legacy:", legacyErr);
      }
    }

    if (!instance) {
      return new Response(JSON.stringify({ error: "Não autorizado", secret_provided: secret }), { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Webhook: erro ao processar JSON:", e);
      return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
    }

    console.log(`Webhook: Instância "${instance.name}" encontrada. Evento: ${body.event}`);

    // Normalizar evento
    const rawEvent = (body.event as string) || "";
    const event = rawEvent.toUpperCase().replace(/[.\-_]/g, "_");
    console.log(`[Webhook] Evento recebido: "${rawEvent}" (normalizado: "${event}") p/ instância: ${instance.id}`);

    // ─── INSTANCE LIFECYCLE EVENTS ───
    const isConnectionEvent = [
      "QRCODE", "QRCODE_UPDATED", 
      "CONNECTION", "CONNECTION_UPDATE", "CONNECTED", 
      "PAIRSUCCESS", "OFFLINE_SYNC_COMPLETED", "OFFLINESYNCCOMPLETED",
      "LOGGEDOUT", "DISCONNECTED", "LOGOUT"
    ].includes(event);

    if (isConnectionEvent) {
      const data = body.data || {};
      const status = (data.status || data.state || data.connectionStatus || "").toString().toLowerCase();

      // Sucesso na conexão
      const isActuallyConnected = 
        event === "CONNECTED" || 
        event === "PAIRSUCCESS" || 
        event === "OFFLINE_SYNC_COMPLETED" || 
        event === "OFFLINESYNCCOMPLETED" ||
        (event === "CONNECTION" && (status === "open" || status === "connected"));

      // Desconexão
      const isActuallyDisconnected = 
        event === "LOGGEDOUT" || 
        event === "DISCONNECTED" || 
        event === "LOGOUT" ||
        (event === "CONNECTION" && (status === "close" || status === "disconnected"));

      // Novo QR Code
      const isQRCode = event === "QRCODE" || event === "QRCODE_UPDATED";

      if (isActuallyConnected) {
        console.log(`[Webhook] Conexão confirmada: ${instance.id} (Evento: ${rawEvent}, Status: ${status})`);
        
        // ─── Extrair Número e Nome do Proprietário ───
        const jid = data.jid || data.ID || data.owner || data.instance?.owner || null;
        const number = jid ? normalizePhone(jid.toString()) : (instance.connected_number || null);
        const pushName = data.pushName || data.instance?.pushName || data.profileName || null;
        
        console.log(`[Webhook] Info Capturada: Número: ${number}, Nome: ${pushName}`);

        const profilePic = await fetchProfilePicture(number, instance.instance_api_key || EVOLUTION_GO_API_KEY);

        // Atualizar dados da instância
        const { error: updateError } = await sb.from("atende_ai_instances").update({
          whatsapp_connected: true,
          status: "active",
          qr_code_base64: null,
          connected_number: number,
          profile_picture: profilePic || instance.profile_picture,
          // Se o nome da empresa estiver vazio, usar o PushName do WhatsApp como inicial
          company_name: instance.company_name || pushName,
          updated_at: new Date().toISOString()
        }).eq("id", instance.id);

        if (updateError) {
          console.error(`[Webhook] Erro ao atualizar instância no CONNECTED:`, updateError);
        }

        // ─── NOTIFICAÇÕES DE ATIVAÇÃO ───
        // Só enviar se a conta não estava marcada como notificada
        if (number && !instance.welcome_notified) {
          const orgName = (instance as any).organizations?.name || "sua Agência";
          const welcomeMsg = `🤖 *Atende AI: Conexão Ativada!*\n\nOlá! Este número foi conectado com sucesso ao sistema *Atende AI* da *Qualify* através da *${orgName}*.\n\nA partir de agora, suas mensagens serão auxiliadas por um Agente de Inteligência Artificial para agilizar o atendimento e garantir que nenhum cliente seu fique sem resposta.\n\nPara pausar o atendimento automático, basta você mesmo responder a um cliente no chat.\n\nEm caso de dúvida pode perguntar por aqui mesmo, ou entre em contato com sua Agência ou Departamento de Marketing.\n\n---\n✨ *Qualify*\n🌐 https://qualify.marketing/`;
          
          console.log(`[Webhook] Enviando notificação de ativação (via Camila) para ${number}...`);
          // Sempre enviado pela Camila conforme solicitação
          const sent = await sendTextMessage(instance.id, "Camila", number, welcomeMsg, "pgpxEqPzStaQ", sb, 2000);

          if (sent) {
            // Marcar como notificado no banco apenas após envio com sucesso ou tentativa
            await sb.from("atende_ai_instances").update({
              welcome_notified: true
            }).eq("id", instance.id);
          }

          // ─── NOTIFICAÇÃO DO SUPERVISOR (Apenas na primeira conexão) ───
          if (instance.supervisor_phone) {
            const supervisorMsg = `🛡️ *Atende AI: Onboarding de Supervisor*\n\nOlá! Sua conta acaba de ser vinculada como *Supervisor Especialista* para o Agente de IA: *${instance.name}*.\n\n*O que isso significa?*\nVocê é a "mente especialista" por trás deste agente. Sempre que ele receber uma pergunta sobre algo que não está no manual ou catálogo dele, ele não inventará respostas. Em vez disso, ele enviará a dúvida aqui para você.\n\n*Como você deve agir?*\n\n1. **Para Responder ao Cliente:** Use a função **Responder (Citar/Reply)** do WhatsApp na mensagem da dúvida. Digite sua resposta e a IA cuidará de repassá-la ao cliente de forma educada.\n2. **Sem Citar:** Se você apenas digitar a resposta sem citar, eu usarei inteligência artificial para tentar descobrir a qual cliente você está se referindo entre as últimas 5 dúvidas enviadas.\n3. **Privacidade:** O cliente nunca saberá que você interveio. Para ele, o atendimento continua sendo fluido e profissional.\n\nEstamos aqui para garantir que nenhum cliente seu fique sem resposta! ✨\n\n---\n✨ *Qualify*\n🌐 https://qualify.marketing/`;
            
            console.log(`[Webhook] Enviando onboarding para supervisor ${instance.supervisor_phone}...`);
            await sendTextMessage(instance.id, instance.evolution_instance_id, instance.supervisor_phone, supervisorMsg, instance.instance_api_key || EVOLUTION_GO_API_KEY, sb, 3000);
          }
        }

        await logToDb(sb, instance.id, "connected", `Instância ativa via evento ${rawEvent}. Número: ${number}, Nome: ${pushName}`);
        return new Response(JSON.stringify({ ok: true, status: "connected" }), { status: 200 });
      }

      if (isActuallyDisconnected) {
        console.log(`[Webhook] Desconexão: ${instance.id} (Evento: ${rawEvent}, Status: ${status})`);
        await sb.from("atende_ai_instances").update({
          whatsapp_connected: false,
          status: "inactive",
          qr_code_base64: null,
          connected_number: null,
          welcome_notified: false
        }).eq("id", instance.id);

        await logToDb(sb, instance.id, "disconnected", `Instância desconectada via evento ${rawEvent}.`);
        return new Response(JSON.stringify({ ok: true, status: "disconnected" }), { status: 200 });
      }

          connected_number: normalizePhone(jid),
          qr_code_base64: null // Limpar QR após conectar
        })
        .eq("evolution_instance_id", instance.evolution_instance_id);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (event === "LOGGEDOUT") {
      console.log(`[Webhook] Instância DESCONECTADA: ${instance.evolution_instance_id}`);
      await sb.from("atende_ai_instances")
        .update({ 
          status: "inactive",
          whatsapp_connected: false,
          qr_code_base64: null
        })
        .eq("evolution_instance_id", instance.evolution_instance_id);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Apenas mensagens recebidas
    if (event === "MESSAGE" || event === "MESSAGES_UPSERT") {
      // ─── Marcar como lida se configurado ───
      if (instance.mark_as_read) {
        markAsRead(normalizePhone(body.data?.key?.remoteJid || body.data?.Info?.Chat || ""), instance.instance_api_key || EVOLUTION_GO_API_KEY);
      }

      // ─── Atraso de resposta (debounce/delay) configurado ───
      const baseDelay = instance.response_delay_seconds || 0;
      if (baseDelay > 0) {
        console.log(`[Webhook] Aplicando atraso base de ${baseDelay}s...`);
        await new Promise(r => setTimeout(r, baseDelay * 1000));
      }

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

      const phone = normalizePhone(chatJid);

      // ─── EVITAR LOOP INFINITO COM CONTAS DE SERVIÇO ───
      // Se a mensagem vier da Camila ou de outros números de serviço conhecidos, ignoramos
      if (phone === "258847969224") {
        console.log(`[Webhook] Mensagem de conta de serviço (Camila) ignorada para evitar loop.`);
        return new Response(JSON.stringify({ ok: true, skipped: "service_account_camila" }), { status: 200 });
      }

      // ─── SUPERVISOR RESPONSE HANDLER ───
      // Se a mensagem vier do número do supervisor, pode ser uma resposta a uma dúvida da IA
      if (instance.supervisor_phone && normalizePhone(chatJid) === normalizePhone(instance.supervisor_phone) && !fromMe) {
        const quotedMsgId = info.quotedMessage?.id || info.quotedMsgId || null;
        let query = null;

        if (quotedMsgId) {
          const { data } = await sb
            .from("atende_ai_supervisor_queries")
            .select("*, atende_ai_conversations(contact_phone, contact_name)")
            .eq("external_msg_id", quotedMsgId)
            .eq("status", "pending")
            .maybeSingle();
          query = data;
        }

        // Se não for resposta a uma msg específica, mas houver múltiplas pendentes, usar IA para parear
        if (!query) {
          const { data: pendingQueries } = await sb
            .from("atende_ai_supervisor_queries")
            .select("*, atende_ai_conversations(contact_phone, contact_name)")
            .eq("supervisor_phone", normalizePhone(chatJid))
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(5); // Analisar as últimas 5 dúvidas

          if (pendingQueries && pendingQueries.length > 0) {
            const supervisorAnswer = (
              msgContent?.conversation ||
              msgContent?.extendedTextMessage?.text ||
              ""
            ).trim();

            if (pendingQueries.length === 1) {
              query = pendingQueries[0];
            } else {
              // USAR IA PARA PAREAR O CONTEXTO
              console.log(`[Supervisor] Usando IA para parear resposta entre ${pendingQueries.length} dúvidas...`);
              query = await matchSupervisorReplyWithQuery(supervisorAnswer, pendingQueries);
            }
          }
        }

        if (query && query.atende_ai_conversations) {
          const clientPhone = query.atende_ai_conversations.contact_phone;
          const supervisorAnswer = (
            msgContent?.conversation ||
            msgContent?.extendedTextMessage?.text ||
            ""
          ).trim();

          if (supervisorAnswer) {
            console.log(`[Supervisor] Repassando resposta para o cliente ${clientPhone}: "${supervisorAnswer}"`);
            
            const formattedAnswer = formatToWhatsApp(supervisorAnswer);
            const relayPrefix = "Olá! Consegui confirmar aqui com meu colega:";
            
            if (instance.split_messages) {
              await smartSendMessage(instance.id, instance.evolution_instance_id, clientPhone, relayPrefix, instance.instance_api_key || EVOLUTION_GO_API_KEY, sb, 1000);
              const chunks = splitMessageIntoChunks(formattedAnswer);
              for (const chunk of chunks) {
                const typingDelay = Math.min(chunk.length * 50, 5000); // 50ms por char, max 5s
                await smartSendMessage(instance.id, instance.evolution_instance_id, clientPhone, chunk, instance.instance_api_key || EVOLUTION_GO_API_KEY, sb, typingDelay);
              }
            } else {
              const relayMsg = `${relayPrefix}\n\n${formattedAnswer}`;
              await smartSendMessage(instance.id, instance.evolution_instance_id, clientPhone, relayMsg, instance.instance_api_key || EVOLUTION_GO_API_KEY, sb, 1000);
            }
            
            // Guardar mensagem no histórico da conversa
            await sb.from("atende_ai_messages").insert({
              conversation_id: query.conversation_id,
              organization_id: instance.organization_id,
              role: "assistant",
              content: relayMsg,
              message_type: "text"
            });

            // Atualizar status da query
            await sb.from("atende_ai_supervisor_queries").update({
              supervisor_answer: supervisorAnswer,
              status: "answered"
            }).eq("id", query.id);

            return new Response(JSON.stringify({ ok: true, status: "supervisor_answer_relayed" }), { status: 200 });
          }
        }
      }

      // Processar mensagens do próprio bot ou humano na mesma conta
      if (fromMe === true) {
        const phone = normalizePhone(chatJid);
        const { data: existingConv } = await sb
          .from("atende_ai_conversations")
          .select("id")
          .eq("instance_id", instance.id)
          .eq("contact_phone", phone)
          .maybeSingle();

        if (existingConv) {
          const pauseMinutes = instance.human_pause_duration || 60;
          const pausedUntil = new Date(Date.now() + pauseMinutes * 60 * 1000).toISOString();
          
          // Se o humano/bot mandou mensagem, automaticamente consideramos a conversa como verificada/autorizada
          await sb
            .from("atende_ai_conversations")
            .update({ 
              paused_until: pausedUntil,
              waiting_human: false
            })
            .eq("id", existingConv.id);

          // Guardar a mensagem enviada pelo humano para o histórico da IA
          let humanText = (
            msgContent?.conversation ||
            msgContent?.extendedTextMessage?.text ||
            msgContent?.imageMessage?.caption ||
            msgContent?.videoMessage?.caption ||
            msgContent?.documentMessage?.caption ||
            ""
          ).trim();

          if (humanText) {
            await sb.from("atende_ai_messages").insert({
              conversation_id: existingConv.id,
              organization_id: instance.organization_id,
              role: "assistant",
              content: humanText,
              message_type: "text"
            });
          }

          console.log(`[Webhook] Intervenção humana detectada. Bot pausado por ${pauseMinutes} min até ${pausedUntil}`);
        }

        return new Response(JSON.stringify({ ok: true, status: "paused_by_human_intervention" }), { status: 200 });
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
        // Fetch profile pic for new conversation
        const profilePic = await fetchProfilePicture(phone, instance.instance_api_key || EVOLUTION_GO_API_KEY);

        const { data: newConv } = await sb
          .from("atende_ai_conversations")
          .insert({
            instance_id: instance.id,
            organization_id: instance.organization_id,
            contact_name: senderName,
            contact_phone: phone,
            profile_picture_url: profilePic,
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

      // Se a conversa já existia, atualizar nome e avatar se necessário
      if (existingConv) {
        const updates: any = { last_message_at: new Date().toISOString() };
        if (senderName && senderName !== phone) updates.contact_name = senderName;
        
        // Buscar avatar se não tiver
        const { data: convData } = await sb.from("atende_ai_conversations").select("profile_picture_url").eq("id", conversationId).single();
        if (!convData?.profile_picture_url) {
          const profilePic = await fetchProfilePicture(phone, instance.instance_api_key || EVOLUTION_GO_API_KEY);
          if (profilePic) updates.profile_picture_url = profilePic;
        }

        await sb.from("atende_ai_conversations").update(updates).eq("id", conversationId);
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
      // Reduzido para 0 por padrão para resposta instantânea
      const bufferSeconds = instance.response_delay_seconds ?? 0;
      if (bufferSeconds > 0) {
        console.log(`[Webhook] Aguardando buffer de ${bufferSeconds}s para agrupar mensagens...`);
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
            console.log(`[Webhook] Nova mensagem detectada no buffer. Encerrando execução atual para favorecer a mais recente.`);
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

      const instanceApiKey = instance.instance_api_key || EVOLUTION_GO_API_KEY;
      const instanceName = instance.evolution_instance_id;
      if (history.length === 0 && instance.welcome_message && instanceName) {
        await sendTextMessage(instance.id, instanceName, phone, instance.welcome_message, instanceApiKey, sb);
      }

      // Heurística de complexidade expandida: Detectar se a mensagem pede algo que exige "verificação"
      // vs rotina (horário, onde fica, contato, quem são, o que fazem)
      const lastUserMessage = text.toLowerCase();
      const isRoutine = /horário|horario|funcionamento|onde|localização|localizacao|endereco|endereço|local|fica|contato|telefone|quem|fazem|faz|empresa|sobre|ajuda|ajudar|saudação|oi|ola|olá|bom dia|boa tarde|boa noite/i.test(lastUserMessage);
      const isComplex = /preço|preco|valor|quanto|custa|tem|estoque|disponível|disponivel|entrega|frete|prazo|vaga|trabalhar|contratar|pagamento|forma|pix|cartao|cartão/i.test(lastUserMessage);

      let ackSent = false;
      if (isComplex && !isRoutine && instanceName) {
        const ackPool = [
          "Só um momento, vou conferir isso aqui para você...",
          "Deixa eu dar uma olhadinha aqui nos detalhes, só um instante...",
          "Vou verificar essa informação agora mesmo, um momento...",
          "Vou confirmar isso aqui para você, aguarde só um segundinho..."
        ];
        const ackMessage = ackPool[Math.floor(Math.random() * ackPool.length)];
        
        console.log(`[Webhook] Enviando confirmação rápida: "${ackMessage}"`);
        ackSent = await sendTextMessage(instance.id, instanceName, phone, ackMessage, instanceApiKey, sb, 500);
        
        // Adicionar ao histórico para a IA saber que já iniciou o atendimento
        if (ackSent) {
          history.push({ role: "assistant", content: ackMessage });
          // Aguardar 10 segundos conforme solicitado para simular o tempo de "verificação"
          console.log(`[Webhook] Aguardando 10 segundos para retorno...`);
          await new Promise(r => setTimeout(r, 10000));
        }
      }

      // Chamar IA
      const systemPrompt = buildSystemPrompt(instance);
      console.log(`[Processing] Instance: ${instance.name} (${instance.id}), Prompt Length: ${systemPrompt.length}`);
      
      const aiStartTime = Date.now();
      const aiReply = await callAI(systemPrompt, history, text, instance);
      const aiDuration = Date.now() - aiStartTime;
      
      console.log(`[AI Response] Generated in ${aiDuration}ms for instance ${instance.name}`);

      if (!aiReply) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }

      // Detectar se a IA solicitou ajuda do supervisor
      let processedReply = formatToWhatsApp(aiReply);
      const supervisorMatch = aiReply.match(/\[ASK_SUPERVISOR:\s*(.*?)\]/i);
      
      if (supervisorMatch && instance.supervisor_phone) {
        const queryText = supervisorMatch[1];
        processedReply = aiReply.replace(/\[ASK_SUPERVISOR:.*?\]/gi, "").trim();
        
        console.log(`[Supervisor] Solicitando ajuda para: "${queryText}"`);
        
        // Notificar supervisor
        const supervisorMsg = `🚨 *DÚVIDA DO AGENTE (${instance.name})*\n\n*Cliente:* ${senderName} (${phone})\n*Dúvida:* ${queryText}\n\n*Responda a esta mensagem* para que eu possa repassar ao cliente.`;
        
        const supervisorMessageId = await sendTextMessage(instance.id, instanceName, instance.supervisor_phone, supervisorMsg, instanceApiKey, sb, 500);
        
        if (supervisorMessageId) {
          // Guardar na tabela de queries para mapear a resposta depois
          await sb.from("atende_ai_supervisor_queries").insert({
            instance_id: instance.id,
            conversation_id: conversationId,
            supervisor_phone: instance.supervisor_phone,
            query_text: queryText,
            status: 'pending',
            external_msg_id: typeof supervisorMessageId === 'string' ? supervisorMessageId : null
          });
        }
      }

      // Guardar resposta da IA (sem a tag do supervisor se houver)
      await sb.from("atende_ai_messages").insert({
        conversation_id: conversationId,
        organization_id: instance.organization_id,
        role: "assistant",
        content: processedReply,
        message_type: "text",
      });

      await logToDb(sb, instance.id, "ai_reply_sent", `IA respondeu para ${phone}: ${processedReply.substring(0, 100)}...`);

      await sb.rpc("increment_atende_ai_stats", {
        p_instance_id: instance.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // Enviar resposta via Evolution Go (dividida ou inteira)
      if (instanceName) {
        const chunks = instance.split_messages ? splitMessageIntoChunks(processedReply) : [processedReply];
        const wpm = instance.typing_speed_wpm || 60;
        
        const getTypingDelay = (txt: string) => {
          const wordCount = txt.split(/\s+/).length;
          const baseMs = (wordCount / wpm) * 60 * 1000;
          return Math.min(Math.max(baseMs, 1500), 12000); // 1.5s a 12s
        };

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const isLast = i === chunks.length - 1;
          
          // Simular presença de digitação
          await sendPresence(phone, "composing", instance.instance_api_key || EVOLUTION_GO_API_KEY);
          
          // Esperar tempo de digitação
          const typingDelay = i === 0 
            ? (instance.show_typing ? (instance.typing_delay_seconds || 2) * 1000 : 1500)
            : getTypingDelay(chunk);
          
          await new Promise(r => setTimeout(r, typingDelay));

          const replySentId = await smartSendMessage(
            instance.id,
            instanceName,
            phone,
            chunk,
            instance.instance_api_key || EVOLUTION_GO_API_KEY,
            sb,
            0 // Delay controlado aqui
          );

          if (replySentId && isLast) {
            await reactToMessage(typeof replySentId === 'string' ? replySentId : "", phone, instance.instance_api_key || EVOLUTION_GO_API_KEY, chunk);
          }
        }
        
        await sendPresence(phone, "paused", instance.instance_api_key || EVOLUTION_GO_API_KEY);
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
