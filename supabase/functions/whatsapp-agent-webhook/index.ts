// @ts-ignore - Supabase Edge Functions use Deno imports which VS Code may not recognize
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
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
  readChat = true,
  quotedId?: string | null,
  baseUrl: string = UAZAPI_BASE_URL
) {
  const payload: any = { 
    number, 
    text, 
    delay: delayMs, 
    readchat: readChat,
    readmessages: readChat // Adicionado para garantir que marque como lida
  };
  if (quotedId) payload.quoted = quotedId;

  const res = await fetch(`${baseUrl}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: instanceToken },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ─── Transcrever áudio com Groq Whisper ──────────────────────

async function transcribeAudio(
  instanceToken: string, 
  messageId: string, 
  sb: any, 
  agentId: string,
  baseUrl: string
): Promise<string | null> {
  let step = "inicio";
  try {
    step = "download_uazapi";
    // 1. Baixar áudio via UAZAPI /message/download (base64)
    const mediaRes = await fetch(`${baseUrl}/message/download`, {
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
      const errorText = await mediaRes.text();
      await logToDb(sb, agentId, "transcribe_error", `Download UAZAPI falhou: ${mediaRes.status} - ${errorText}`);
      return null;
    }

    const mediaData = await mediaRes.json();
    let base64Audio = mediaData.base64Data as string;
    
    if (!base64Audio) {
      await logToDb(sb, agentId, "transcribe_error", `UAZAPI não retornou base64Data. Dados puros: ${JSON.stringify(mediaData).substring(0,200)}`);
      return null;
    }

    step = "clean_base64";
    // Limpar prefixo "data:audio/ogg;base64," se existir
    if (base64Audio.includes(",")) {
      base64Audio = base64Audio.split(",")[1];
    }

    step = "decode_base64";
    // Tentar limpar espaços e quebras de linha para evitar erro no atob
    base64Audio = base64Audio.replace(/\s+/g, '');
    
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    step = "groq_api";
    // 2. Enviar para Groq Whisper
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([bytes], { type: "audio/ogg" }),
      "audio.ogg"
    );
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("language", "pt");
    formData.append("temperature", "0");
    formData.append("response_format", "json");

    if (!GROQ_API_KEY) {
      await logToDb(sb, agentId, "transcribe_error", "GROQ_API_KEY está vazia nas variáveis de ambiente!");
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (!groqRes.ok) {
      const gError = await groqRes.text();
      await logToDb(sb, agentId, "transcribe_error", `Groq Whisper erro: ${groqRes.status} -> ${gError}`);
      return null;
    }

    step = "parse_groq";
    const result = await groqRes.json();
    const finalResult = (result.text || "").trim() || null;
    
    await logToDb(sb, agentId, "transcribe_success", `Transcrição retornou: ${finalResult}`);
    return finalResult;
  } catch (err: any) {
    await logToDb(sb, agentId, "transcribe_error", `Exception no passo '${step}': ${err?.message || JSON.stringify(err)}`);
    return null;
  }
}

async function logToDb(sb: any, agentId: string, event: string, details: string) {
  try {
    await sb.from("ai_agent_connection_log").insert({
      agent_id: agentId,
      event: event,
      details: details.substring(0, 3000),
    });
  } catch(e) {}
}

// ─── Construir System Prompt ─────────────────────────────────

function buildSystemPrompt(agent: Record<string, unknown>): string {
  const parts: string[] = [];

  const name = (agent.name as string) || "Equipe Onix";
  const companyName = (agent.company_name as string) || "Onix Agence";
  
  parts.push(`## 1. IDENTIDADE E CONSCIÊNCIA`);
  parts.push(`Você é ${name}, representando a empresa ${companyName} no atendimento via WhatsApp.`);
  parts.push(`Sua atuação combina as melhores características de um consultor e de um atendente: você ouve, entende e orienta de forma estratégica.`);
  parts.push("");
  parts.push(`## 2. PRINCÍPIOS DE COMUNICAÇÃO`);
  parts.push(`NATUREZA DO ATENDIMENTO`);
  parts.push(`- Seja consultivo: em vez de apenas informar, busque entender a necessidade real por trás de cada pergunta.`);
  parts.push(`- Conduza a conversa com leveza, fazendo perguntas pontuais e estratégicas — evite questionários longos que cansam o cliente.`);
  parts.push(`- Sempre finalize com um convite natural à continuidade da conversa (ex: "o que você achou dessa ideia?" ou "como isso se encaixa no que você está buscando?"), sem parecer insistente.`);
  parts.push("");
  parts.push(`LINGUAGEM E ESTILO`);
  parts.push(`- Utilize português claro, educado e bem estruturado.`);
  parts.push(`- Seja natural com emojis para transmitir calor humano e simpatia 😊`);
  parts.push(`- Evite abreviações como "vc", "tbm", "pra", "dps", "tá".`);
  parts.push(`- Evite gírias ou expressões regionais que possam não ser compreendidas universalmente.`);
  parts.push("");
  parts.push(`FORMATAÇÃO WHATSAPP`);
  parts.push(`- Use negrito com APENAS UM asterisco de cada lado: *texto*.`);
  parts.push(`- Use itálico com underline: _texto_.`);
  parts.push(`- Prefira frases curtas e parágrafos espaçados — mensagens densas cansam no WhatsApp.`);
  parts.push("");
  parts.push(`## 3. FLUXO DA CONVERSA`);
  parts.push(`INTERPRETAÇÃO DE MENSAGENS`);
  parts.push(`- Clientes frequentemente enviam mensagens curtas, fragmentadas ou desconexas (ex: um simples "?" ou "ok").`);
  parts.push(`- Considere todas as mensagens como partes de um mesmo diálogo. Nunca diga que houve confusão ou que a mensagem foi interrompida — apenas conecte os pontos naturalmente.`);
  parts.push("");
  parts.push(`SAUDAÇÕES E ABERTURA`);
  parts.push(`- Você é livre para se apresentar e dizer que é assistente de atendimento da empresa.`);
  parts.push(`- Exemplo: "Olá, tudo bem? Aqui é ${name}, assistente de atendimento da ${companyName}. Como podemos ajudar?"`);
  parts.push(`- Evite roteiros engessados. Comece a conversa de forma orgânica e amigável.`);
  parts.push("");
  parts.push(`QUANDO PERGUNTAREM SE VOCÊ É IA`);
  parts.push(`- Se o cliente questionar se você é um robô ou IA, responda com naturalidade e profissionalismo.`);
  parts.push(`- Exemplo: "Faço parte da equipe de atendimento aqui da ${companyName}. Foi alguma coisa que soou estranha na conversa? Fique à vontade para me dizer."`);
  parts.push("");
  parts.push(`ENCERRAMENTO`);
  parts.push(`- Não use frases de fechamento genéricas como "estou aqui para ajudar" ou "qualquer dúvida é só falar".`);
  parts.push(`- Prefira encerrar com uma ponte para o próximo passo ou um convite sutil à continuidade.`);
  parts.push("");
  parts.push(`## 4. INTERAÇÃO COM A EQUIPE HUMANA`);
  parts.push(`TRANSFERÊNCIA PARA ATENDENTE HUMANO`);
  parts.push(`- Quando precisar transferir: "Vou verificar isso com o setor responsável e já volto para você" ou "Vou pedir para um colega especializado assumir, aguarde só um instante".`);
  parts.push(`- Use a ferramenta de transferência APENAS quando: o cliente solicitar explicitamente falar com um humano, ou você já tentou resolver e não conseguiu após algumas tentativas.`);
  parts.push(`- NÃO use apenas porque o cliente disse "preciso de ajuda" — você é quem deve ajudar primeiro.`);
  parts.push("");
  parts.push(`INTERVENÇÃO HUMANA NO HISTÓRICO`);
  parts.push(`- Se você encontrar mensagens marcadas com [AVISO INTERNO DO SISTEMA], isso indica que um atendente humano interagiu diretamente.`);
  parts.push(`- Nunca interprete isso como erro. Leia o que foi dito e continue a conversa normalmente a partir dali.`);
  parts.push("");

  // Tamanho de resposta
  const size = (agent.response_size as number) || 2;
  if (size === 1) parts.push("## TAMANHO: Respostas CURTAS, máximo 2-3 frases.");
  else if (size === 3) parts.push("## TAMANHO: Respostas DETALHADAS quando necessário.");
  else parts.push("## TAMANHO: Respostas de tamanho médio, claras e objetivas.");
  parts.push("");

  // Informações da empresa
  const dbCompanyName = agent.company_name as string;
  const companySector = agent.company_sector as string;
  const companyDesc = agent.company_description as string;
  if (dbCompanyName || companySector || companyDesc) {
    parts.push("## SOBRE A EMPRESA");
    if (dbCompanyName) parts.push(`- Nome: ${dbCompanyName}`);
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

  // Instruções Específicas do Agente (SOBRESCRITA)
  const instructions = agent.instructions as string;
  if (instructions) {
    parts.push("## INSTRUÇÕES DE ATENDIMENTO DO CÉREBRO (PRIORIDADE ABSOLUTA)");
    parts.push("⚠️ ATENÇÃO: As instruções abaixo foram definidas pelo criador deste agente específico. ELAS SÃO A REGRA SUPREMA.");
    parts.push("⚠️ ATENÇÃO: Elas têm PRIORIDADE ABSOLUTA sobre qualquer regra de 'Persona', 'Tom de Voz', 'Greetings' ou 'Lista Negra' definida anteriormente.");
    parts.push("⚠️ ATENÇÃO: Se as instruções abaixo mandarem você usar gírias, usar abreviações, ser informal, ser engraçado, ou agir de qualquer outra forma, VOCÊ DEVE OBEDECER ESTAS INSTRUÇÕES E IGNORAR AS REGRAS RESTRITIVAS GERAIS.");
    parts.push("");
    parts.push(instructions);
    parts.push("");
  }

  // Fluxo de Conversa Específico
  const conversationFlow = agent.conversation_flow as string;
  if (conversationFlow) {
    parts.push("## FLUXO DE CONVERSA ESTRUTURADO (OBRIGATÓRIO)");
    parts.push("⚠️ ATENÇÃO: O fluxo abaixo define as etapas exatas que você deve seguir na condução desta conversa. Guie o usuário pelas etapas estabelecidas sem pular etapas.");
    parts.push("");
    parts.push(conversationFlow);
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
): Promise<{ content: string; toolCalls?: any[]; replyToId?: string }> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "transferir_atendimento_para_humano",
        description: "Transfere o atendimento para um atendente humano da equipe. SÓ USE ISSO SE O CLIENTE EXPRESSAMENTE PEDIR PARA FALAR COM UM HUMANO/ATENDENTE/PESSOA, ou se você já tentou resolver o problema várias vezes e não conseguiu. JAMAIS use essa ferramenta apenas porque o cliente disse 'preciso de ajuda' (você é quem deve ajudar ele primeiro!). Cuidado para não transferir no início da conversa.",
        parameters: {
          type: "object",
          properties: {
            motivo: {
              type: "string",
              description: "Breve explicação do porquê está transferindo o cliente para um humano.",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "responder_mensagem_especifica",
        description: "Responde (menciona/cita) uma mensagem específica do histórico. Use isso quando houver várias perguntas ou quando quiser deixar claro a qual parte da conversa está respondendo.",
        parameters: {
          type: "object",
          properties: {
            mensagem_id: {
              type: "string",
              description: "O ID externo (external_id) da mensagem que você deseja citar.",
            },
            resposta: {
              type: "string",
              description: "O conteúdo da sua resposta.",
            },
          },
          required: ["mensagem_id", "resposta"],
        },
      },
    },
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
      tools,
      tool_choice: "auto",
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("OpenAI Error:", res.status, errorText);
    return { content: "Desculpe, tive um problema técnico ao processar sua resposta." };
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  let replyToId: string | undefined;

  // Extrair ID da mensagem para responder se a ferramenta foi chamada
  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      if (tc.function.name === "responder_mensagem_especifica") {
        const args = JSON.parse(tc.function.arguments);
        replyToId = args.mensagem_id;
        if (!message.content) {
          message.content = args.resposta;
        }
      }
    }
  }
  
  return { 
    content: message?.content || "", 
    toolCalls: message?.tool_calls,
    replyToId
  };
}

// ─── Webhook Handler ────────────────────────────────────────

serve(async (req: Request) => {
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

    // Extrair URL Base caso exista
    let uazapiUrl = (body.BaseUrl as string) || UAZAPI_BASE_URL;
    if (uazapiUrl && !uazapiUrl.startsWith("http")) {
      uazapiUrl = "https://" + uazapiUrl;
    }

    // ─── Evento de Digitação (Presence) ───
    if (event === "presence" || event === "chat_state") {
      const data = (body.data as any) || body;
      const chatId = (data.chatid as string) || (data.number as string) || "";
      if (chatId) {
        const phone = normalizePhone(chatId);
        const isComposing = (data.state === "composing" || data.presence === "composing");
        
        if (isComposing) {
          await sb
            .from("ai_agent_conversations")
            .update({ last_presence_at: new Date().toISOString() })
            .eq("agent_id", agent.id)
            .eq("contact_phone", phone)
            .eq("status", "open");
        }
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

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

      // Se o WhatsApp não estiver conectado, não faz sentido a IA responder por um telefone "offline"
      if (!agent.whatsapp_connected) {
        console.log(`Webhook: Ignorando pois o WhatsApp do agente [${agent.name}] está desconectado.`);
        return new Response(JSON.stringify({ ok: true, skipped: "whatsapp_disconnected" }), { status: 200 });
      }

      // Extrair dados da mensagem (pode vir no body.message ou body.data ou body.data.message)
      let messageData: any = body.message || body.data;
      if (!messageData) return new Response(JSON.stringify({ ok: true, skipped: "no_payload" }), { status: 200 });

      // Se for um evento nested da UAZAPI (ex: Evolution), a mensagem real está em messageData.message
      if (messageData.message && typeof messageData.message === "object") {
        messageData = { ...messageData, ...messageData.message };
      }
      
      // Alguns provedores mandam em data.msg
      if (messageData.msg && typeof messageData.msg === "object") {
        messageData = { ...messageData, ...messageData.msg };
      }

      // Ignorar grupos
      const isGroup = (messageData.isGroup as boolean)
        || ((messageData.chatid as string) || "").includes("@g.us");
      if (isGroup) return new Response(JSON.stringify({ ok: true }), { status: 200 });

      // Extrair dados
      const messageId = (messageData.messageid as string) || (messageData.id as string) || "";
      const chatId = (messageData.chatid as string) || "";
      const phone = normalizePhone(chatId);
      const fromMe = messageData.fromMe as boolean;
      console.log(`Webhook: Nova mensagem [${messageId}] de ${phone} (fromMe: ${fromMe})`);

      // Detectar tipo de mensagem
      const msgType = (messageData.type as string)
        || (messageData.messageType as string)
        || "text";
      const mType = (messageData.mediaType as string) || "";
      const mMsgType = (messageData.messageType as string) || "";
      
      const isAudio = msgType.toLowerCase().includes("audio") 
        || msgType.toLowerCase().includes("ptt")
        || mType.toLowerCase().includes("audio")
        || mType.toLowerCase().includes("ptt")
        || mMsgType.toLowerCase().includes("audio");

      // Content pode ser objeto (áudio/mídia), não string
      const rawContent = messageData.content;
      let text = (typeof rawContent === "string" ? rawContent : "")
        || (messageData.text as string)
        || (messageData.conversation as string)
        || "";

      // LOG TEMPORAL PARA DEBUG
      if (isAudio || !text.trim() || msgType === "media") {
        await logToDb(sb, agent.id, `debug_${msgType}_${mType}`, JSON.stringify(body).substring(0, 2000));
      }

      let messageType = "text";
      const quotedMsg = (messageData.quotedMsg as Record<string, any>) || null;
      const quotedMsgId = quotedMsg?.messageid || null;
      const quotedMsgContent = quotedMsg?.content || null;

      // Se for áudio, transcrever com Groq Whisper via UAZAPI /message/download
      if (isAudio && !text.trim()) {
        console.log(`Webhook: Detectado áudio [${messageId}]. Transcrevendo...`);
        if (messageId && agent.uazapi_instance_token) {
          const transcription = await transcribeAudio(
            agent.uazapi_instance_token, 
            messageId,
            sb,
            agent.id,
            uazapiUrl
          );
          if (transcription) {
            console.log(`Webhook: Áudio [${messageId}] transcrito: "${transcription}"`);
            text = transcription;
            messageType = "audio";
          } else {
            console.warn(`Webhook: Falha na transcrição do áudio [${messageId}]`);
            // Áudio não transcrito — avisar o cliente
            await sendTextMessage(
              agent.uazapi_instance_token,
              phone,
              "Desculpe, não consegui entender o áudio. Pode digitar a sua mensagem?",
              agent.show_typing ? 7000 : 500,
              agent.mark_as_read,
              null,
              uazapiUrl
            );
            return new Response(JSON.stringify({ ok: true, skipped: "audio_failed" }), { status: 200 });
          }
        }
      }

      if (!text.trim()) {
        console.log(`Webhook: Mensagem [${messageId}] ignorada por não conter texto (ou transcrição vazia). Tipo: ${msgType}`);
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
        .select("id, paused_until, waiting_human")
        .eq("agent_id", agent.id)
        .eq("contact_phone", phone)
        .eq("status", "open")
        .gt("last_message_at", twentyFourHoursAgo)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversationId = existingConv.id;
        
        // Se a conversa está pausada e chegou mensagem do cliente, verificar se o tempo acabou
        if (!fromMe && existingConv.paused_until) {
          const pausedUntil = new Date(existingConv.paused_until);
          if (new Date() < pausedUntil) {
            console.log(`Webhook: agente pausado para ${phone} até ${existingConv.paused_until}`);
            return new Response(JSON.stringify({ ok: true, skipped: "paused_by_human" }), { status: 200 });
          }
        }

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

      // ─── Intervenção Humana: Verificar ECO da IA ANTES de salvar ───
      if (fromMe) {
        // Verificar se é uma mensagem da própria IA que acabamos de enviar
        const { data: recentAiMsg } = await sb
          .from("ai_agent_messages")
          .select("id, content")
          .eq("conversation_id", conversationId)
          .eq("role", "assistant")
          .is("external_id", null)
          .gt("created_at", new Date(Date.now() - 60000).toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const isEcho = recentAiMsg && (
          recentAiMsg.content.trim() === text.trim() || 
          text.trim().includes(recentAiMsg.content.trim()) ||
          recentAiMsg.content.trim().includes(text.trim())
        );

        if (isEcho) {
          console.log(`Webhook: Ignorando 'fromMe' pois coincide com resposta recente da IA`);
          if (messageId) {
            await sb.from("ai_agent_messages").update({ external_id: messageId }).eq("id", recentAiMsg.id);
          }
          return new Response(JSON.stringify({ ok: true, skipped: "self_ai_message" }), { status: 200 });
        }

        // É realmente um humano escrevendo pelo WhatsApp → salvar como system e pausar
        await sb
          .from("ai_agent_messages")
          .insert({
            conversation_id: conversationId,
            organization_id: agent.organization_id,
            external_id: messageId || null,
            quoted_message_id: quotedMsgId,
            quoted_message_content: quotedMsgContent,
            role: "system",
            content: text,
            message_type: messageType,
          });

        const pauseMinutes = agent.human_pause_duration || 60;
        const pausedUntil = new Date(Date.now() + pauseMinutes * 60 * 1000).toISOString();
        
        await sb
          .from("ai_agent_conversations")
          .update({ 
            paused_until: pausedUntil,
            waiting_human: false 
          })
          .eq("id", conversationId);
          
        console.log(`Webhook: Intervenção humana detectada via WhatsApp. Agente pausado por ${pauseMinutes} min.`);
        return new Response(JSON.stringify({ ok: true, paused_until: pausedUntil }), { status: 200 });
      }

      // Salvar mensagem do user (apenas mensagens de clientes chegam aqui)
      const { data: insertedMsg, error: insertErr } = await sb
        .from("ai_agent_messages")
        .insert({
          conversation_id: conversationId,
          organization_id: agent.organization_id,
          external_id: messageId || null,
          quoted_message_id: quotedMsgId,
          quoted_message_content: quotedMsgContent,
          role: "user",
          content: text,
          message_type: messageType,
        })
        .select("id, created_at")
        .single();

      if (insertErr) {
        console.error("Erro ao inserir mensagem:", insertErr);
        return new Response(JSON.stringify({ error: "Db error" }), { status: 500 });
      }

      const insertedMsgId = insertedMsg.id;

      // Incrementar contador de mensagens
      await sb.rpc("increment_ai_agent_stats", {
        p_agent_id: agent.id,
        p_conversations: 0,
        p_messages: 1,
      });

      // ─── Buffer/Debounce Inteligente (Resettable Timer) ───
      const bufferSeconds = agent.response_delay_seconds ?? 5;
      if (bufferSeconds > 0) {
        console.log(`Webhook: Iniciando debounce de ${bufferSeconds}s para a mensagem ${insertedMsgId}`);
        
        // Loop de espera: verifica a cada 1s se chegou algo mais novo ou se o usuário ainda digita
        const startTime = Date.now();
        const maxWait = 30000; // Máximo 30s para não estourar timeout do webhook
        
        while (Date.now() - startTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Buscar estado atual da conversa
          const { data: currentConv } = await sb
            .from("ai_agent_conversations")
            .select("last_message_at, last_presence_at")
            .eq("id", conversationId)
            .single();
            
          const lastMsgAt = currentConv?.last_message_at ? new Date(currentConv.last_message_at).getTime() : 0;
          const lastPresenceAt = currentConv?.last_presence_at ? new Date(currentConv.last_presence_at).getTime() : 0;
          const now = Date.now();
          
          // Se houve mensagem mais nova que EU, eu saio imediatamente
          const { data: latestMsg } = await sb
            .from("ai_agent_messages")
            .select("id, created_at")
            .eq("conversation_id", conversationId)
            .eq("role", "user")
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestMsg && latestMsg.id !== insertedMsgId) {
            console.log(`Webhook: Abortando ${insertedMsgId}. Mensagem mais nova detectada: ${latestMsg.id}`);
            return new Response(JSON.stringify({ ok: true, skipped: "newer_detected" }), { status: 200 });
          }

          // Se já passou o tempo de silêncio (tanto de msg quanto de 'typping')
          const silenceMs = bufferSeconds * 1000;
          if (now - lastMsgAt >= silenceMs && now - lastPresenceAt >= silenceMs) {
            console.log(`Webhook: Silêncio detectado para ${insertedMsgId}. Prosseguindo.`);
            break; 
          }
          
          console.log(`Webhook: Ainda aguardando silêncio para ${insertedMsgId}...`);
        }
      }

      // ─── Marcar como lido ───
      if (agent.mark_as_read && agent.uazapi_instance_token) {
        // A flag readchat no sendTextMessage já cuida disso
      }

      // ─── Carregar histórico ───
      const { data: historyRows } = await sb
        .from("ai_agent_messages")
        .select("role, content, external_id, quoted_message_id, quoted_message_content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(50);

      const conversationHistory = (historyRows || [])
        .slice(0, -1) // Excluir a última (é a mensagem atual)
        .map((m: any) => {
          if (m.role === "system") {
            // É uma mensagem do humano da nossa equipe enviada via WhatsApp
            return { 
                role: "user", 
                content: `[AVISO INTERNO DO SISTEMA]: Um Atendente Humano da nossa equipe assumiu o WhatsApp temporariamente e enviou esta mensagem para o cliente: "${m.content}"`
            };
          }

          const role = m.role === "assistant" ? "assistant" : "user";
          let content = m.content;
          if (role === "user" && m.external_id) {
            content = `[ID: ${m.external_id}]${m.quoted_message_id ? ` (Em resposta a: ${m.quoted_message_content})` : ""} ${content}`;
          }
          
          return { role, content };
        });

      // Incluir info de citação na mensagem atual também
      const currentMsgContext = `[ID: ${messageId}]${quotedMsgId ? ` (Em resposta a: ${quotedMsgContent})` : ""} ${text}`;

      // ─── Mensagem de boas-vindas (primeira msg da conversa) ───
      const isFirstMessage = conversationHistory.length === 0;
      if (isFirstMessage && agent.welcome_message) {
        // Enviar boas-vindas primeiro
        await sendTextMessage(
          agent.uazapi_instance_token,
          phone,
          agent.welcome_message,
          agent.show_typing ? 7000 : 500,
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
      const aiResult = await callAI(systemPrompt, conversationHistory, currentMsgContext);
      let cleanResponse = aiResult.content
        .replace(/\\n/g, "\n")
        // Troca `**texto**` por `*texto*` para o negrito do WhatsApp funcionar
        .replace(/\*\*(.*?)\*\*/g, '*$1*');

      let requestedHuman = false;
      // Verificar se a IA chamou ferramenta
      if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
        for (const toolCall of aiResult.toolCalls) {
          if (toolCall.function.name === "transferir_atendimento_para_humano") {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`Webhook: AI solicitou ajuda de colega. Motivo: ${args.motivo}`);
            
            requestedHuman = true;
            await sb.from("ai_agent_conversations").update({ waiting_human: true }).eq("id", conversationId);
            if (!cleanResponse) cleanResponse = "Vou consultar o departamento responsável e logo retorno para você, por favor, aguarde um momento.";
          }
        }
      }

      if (!cleanResponse) {
        console.log(`Webhook: Sem resposta da IA para ${insertedMsgId}`);
        return new Response(JSON.stringify({ ok: true, skipped: "no_ai_response" }), { status: 200 });
      }

      // VERICACAÇÃO DE SEGURANÇA (Para mensagens que chegaram enquanto a IA pensava)
      // Se o usuário mandou uma mensagem nova DURANTE os segundos que a IA levou para responder,
      // nós abortamos este envio para não cruzar mensagens. O novo webhook vai processar o histórico atualizado.
      const { data: latestMsgAfterAI } = await sb
        .from("ai_agent_messages")
        .select("id, created_at")
        .eq("conversation_id", conversationId)
        .eq("role", "user")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMsgAfterAI && latestMsgAfterAI.id !== insertedMsgId) {
        console.log(`Webhook: Abortando mensagem da IA porque o usuário já enviou algo mais novo (${latestMsgAfterAI.id}) enquanto a IA gerava a resposta.`);
        return new Response(JSON.stringify({ ok: true, skipped: "newer_detected_after_generation" }), { status: 200 });
      }

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
      const updateData: any = {
        message_count: (historyRows?.length || 0) + 2, // user msg + ai response
        last_message_at: new Date().toISOString(),
      };
      // Só setar como false se ela NÃO pediu ajuda nessa exata resposta
      if (!requestedHuman) {
        updateData.waiting_human = false;
      }

      await sb
        .from("ai_agent_conversations")
        .update(updateData)
        .eq("id", conversationId);

      // ─── Enviar via WhatsApp ───
      if (agent.uazapi_instance_token) {
        await sendTextMessage(
          agent.uazapi_instance_token,
          phone,
          cleanResponse,
          agent.show_typing ? 7000 : 500,
          agent.mark_as_read,
          aiResult.replyToId,
          uazapiUrl
        );
      } else {
        console.warn(`Webhook: Impossível enviar resposta para [${phone}] pois o agente [${agent.name}] não tem instance_token.`);
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Evento desconhecido
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("whatsapp-agent-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});
