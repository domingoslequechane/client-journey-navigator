import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

let UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL") || "https://api.uazapi.com";
const UAZAPI_ADMIN_TOKEN = Deno.env.get("UAZAPI_ADMIN_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// SUPABASE_URL já contém o domínio correto para as Edge Functions

// ─── UAZAPI helpers ──────────────────────────────────────────

async function uazapiRequest<T = unknown>(
  path: string,
  opts: { method?: string; token?: string; adminToken?: boolean; body?: Record<string, unknown> } = {}
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const { method = "GET", token, adminToken = false, body } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (adminToken) headers["admintoken"] = UAZAPI_ADMIN_TOKEN;
  else if (token) headers["token"] = token;

  try {
    const res = await fetch(`${UAZAPI_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error || data?.message || `HTTP ${res.status}` };
    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Main handler ────────────────────────────────────────────

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const { action, agent_id } = await req.json();
    if (!agent_id) return json({ error: "agent_id é obrigatório" }, 400);

    // Validar configurações essenciais
    if (!UAZAPI_ADMIN_TOKEN) {
      console.error("ERRO: UAZAPI_ADMIN_TOKEN não configurado no Supabase Secrets.");
      return json({ error: "Configuração incompleta: UAZAPI_ADMIN_TOKEN não encontrado." }, 500);
    }
    
    if (UAZAPI_BASE_URL.includes("api.uazapi.com") && !UAZAPI_BASE_URL.startsWith("https://")) {
      // Pequeno fix caso a URL base venha sem protocolo
      UAZAPI_BASE_URL = "https://" + UAZAPI_BASE_URL;
    }

    // Buscar agente e validar acesso
    const { data: agent, error: agentErr } = await supabase
      .from("ai_agents")
      .select("*, organizations(name)")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) return json({ error: "Agente não encontrado" }, 404);

    // Verificar se user pertence à org
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", agent.organization_id)
      .maybeSingle();

    if (!membership) return json({ error: "Sem permissão" }, 403);

    // ─── ACTION: connect ───
    if (action === "connect") {
      let instanceToken = agent.uazapi_instance_token;
      let webhookSecret = agent.uazapi_webhook_secret;

      // Gerar webhook secret se não existe
      if (!webhookSecret) {
        webhookSecret = generateSecret();
        await supabase
          .from("ai_agents")
          .update({ uazapi_webhook_secret: webhookSecret })
          .eq("id", agent_id);
      }

      // Criar instância na UAZAPI se não existe
      if (!instanceToken) {
        const result = await uazapiRequest<{ id: string; token: string }>("/instance/init", {
          method: "POST",
          adminToken: true,
          body: {
            name: `qualify-${agent.organization_id.slice(0, 8)}-${agent_id.slice(0, 8)}`,
            systemName: agent.name,
            adminField01: agent.organization_id,
          },
        });

        if (!result.ok || !result.data) {
          console.error("Erro UAZAPI (/instance/init):", result.error);
          return json({ error: "Erro ao criar instância UAZAPI: " + (result.error || "desconhecido") }, 500);
        }

        instanceToken = result.data.token;
        await supabase
          .from("ai_agents")
          .update({
            uazapi_instance_id: result.data.id,
            uazapi_instance_token: result.data.token,
          })
          .eq("id", agent_id);
      }

      // Configurar webhook
      const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-agent-webhook/${webhookSecret}`;
      const webhookResult = await uazapiRequest("/webhook", {
        method: "POST",
        token: instanceToken,
        body: {
          enabled: true,
          url: webhookUrl,
          events: ["messages", "connection"],
          excludeMessages: ["wasSentByApi", "isGroupYes"],
        },
      });

      if (!webhookResult.ok) {
        console.warn("Aviso ao configurar webhook:", webhookResult.error);
        // Não bloqueia o connect, mas logamos o erro
      }

      // Conectar (gerar QR Code)
      const connectResult = await uazapiRequest<{
        status: string;
        qrcode?: string;
        paircode?: string;
        owner?: string;
      }>("/instance/connect", {
        method: "POST",
        token: instanceToken,
      });

      console.log("DEBUG: UAazAPI Connect Result:", JSON.stringify(connectResult));

      if (!connectResult.ok) {
        console.error("Erro UAZAPI (/instance/connect):", connectResult.error);
        return json({ error: "Erro ao conectar (UAZAPI): " + (connectResult.error || "") }, 500);
      }

      // Log
      await supabase.from("ai_agent_connection_log").insert({
        agent_id,
        event: "connect_attempt",
        details: JSON.stringify({ status: connectResult.data?.status }),
      });

      return json({
        status: connectResult.data?.status || "waiting_qr",
        qrcode: connectResult.data?.qrcode || null,
        paircode: connectResult.data?.paircode || null,
        owner: connectResult.data?.owner || null,
      });
    }

    // ─── ACTION: status ───
    if (action === "status") {
      const instanceToken = agent.uazapi_instance_token;
      if (!instanceToken) {
        return json({ status: "disconnected", whatsapp_connected: false });
      }

      const statusResult = await uazapiRequest<{ status: string; owner?: string }>("/instance/status", {
        method: "GET",
        token: instanceToken,
      });

      console.log("DEBUG: UAazAPI Status Result:", JSON.stringify(statusResult));

      const isConnected = statusResult.data?.status === "connected";

      // Atualizar estado se mudou
      if (isConnected !== agent.whatsapp_connected) {
        await supabase
          .from("ai_agents")
          .update({
            whatsapp_connected: isConnected,
            connected_number: isConnected ? (statusResult.data?.owner || null) : null,
            status: isConnected ? "active" : "inactive",
          })
          .eq("id", agent_id);

        // Se acabou de conectar, reconfigurar webhook
        if (isConnected && agent.uazapi_webhook_secret) {
          const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-agent-webhook/${agent.uazapi_webhook_secret}`;
          await uazapiRequest("/webhook", {
            method: "POST",
            token: instanceToken,
            body: {
              enabled: true,
              url: webhookUrl,
              events: ["messages", "connection"],
              excludeMessages: ["wasSentByApi", "isGroupYes"],
            },
          });
        }
      }

      return json({
        status: statusResult.data?.status || "disconnected",
        whatsapp_connected: isConnected,
        owner: statusResult.data?.owner || null,
        qrcode: (statusResult.data as Record<string, unknown>)?.qrcode || null,
      });
    }

    // ─── ACTION: disconnect ───
    if (action === "disconnect") {
      const instanceToken = agent.uazapi_instance_token;
      if (instanceToken) {
        await uazapiRequest("/instance/disconnect", {
          method: "POST",
          token: instanceToken,
        });
      }

      await supabase
        .from("ai_agents")
        .update({
          whatsapp_connected: false,
          connected_number: null,
          status: "inactive",
        })
        .eq("id", agent_id);

      await supabase.from("ai_agent_connection_log").insert({
        agent_id,
        event: "disconnected",
        details: "Desconectado pelo usuário",
      });

      return json({ ok: true, status: "disconnected" });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    console.error("whatsapp-agent-instance error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
