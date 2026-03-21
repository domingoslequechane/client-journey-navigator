import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Campos permitidos na atualização
const ALLOWED_UPDATE_FIELDS = [
  "name",
  "welcome_message",
  "company_name",
  "company_sector",
  "company_description",
  "business_hours",
  "address",
  "address_reference",
  "instructions",
  "extra_info",
  "response_size",
  "response_delay_seconds",
  "show_typing",
  "mark_as_read",
  "status",
  "human_pause_duration",
];

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Não autorizado" }, 401);

    const body = await req.json();
    const { agent_id } = body;
    if (!agent_id) return json({ error: "agent_id é obrigatório" }, 400);

    // Buscar agente
    const { data: agent, error: agentErr } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("id", agent_id)
      .single();

    if (agentErr || !agent) return json({ error: "Agente não encontrado" }, 404);

    // Verificar permissão
    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", agent.organization_id)
      .maybeSingle();

    if (!membership) return json({ error: "Sem permissão" }, 403);

    // ─── GET (action === "get" ou sem action) ───
    if (req.method === "GET" || body.action === "get" || !body.action) {
      // Se não tem action específica e tem campos, é update
      if (body.action === "get" || (!body.action && Object.keys(body).length <= 1)) {
        return json({ agent });
      }
    }

    // ─── UPDATE ───
    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in body && field !== "agent_id") {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return json({ agent }); // Nada para atualizar, retorna o agente
    }

    const { data: updated, error: updateErr } = await supabase
      .from("ai_agents")
      .update(updates)
      .eq("id", agent_id)
      .select("*")
      .single();

    if (updateErr) {
      return json({ error: "Erro ao atualizar: " + updateErr.message }, 500);
    }

    return json({ agent: updated });
  } catch (err) {
    console.error("whatsapp-agent-config error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
