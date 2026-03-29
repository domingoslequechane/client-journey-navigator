import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const EVOLUTION_URL = Deno.env.get("EVOLUTION_GO_URL")?.replace(/\/$/, "") || "http://localhost:8080";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_GO_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function evolutionRequest<T = any>(
  path: string,
  method = "GET",
  body?: any
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const url = `${EVOLUTION_URL}${path}`;
    console.log(`[Evolution] ${method} request to: ${url}`);
    
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await res.json();
    if (!res.ok) {
      console.error(`[Evolution] Error ${res.status}:`, data);
      return { ok: false, error: data?.error || data?.message || `HTTP ${res.status}` };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    console.error(`[Evolution] Connection error:`, err);
    return { ok: false, error: err instanceof Error ? err.message : "Unreachable" };
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Invalid user session" }, 401);

    const body = await req.json();
    const { action, agent_id, organization_id } = body;

    // --- ACTION: sync ---
    if (action === "sync") {
      console.log(`[Sync] Realizando sincronização para org: ${organization_id}`);
      if (!organization_id) return json({ ok: false, error: "organization_id is required for sync" }, 200);

      // 1. Fetch all instances from Evolution
      const { ok, data, error } = await evolutionRequest("/instance/all", "GET");
      
      if (!ok) {
        console.error("[Sync] Erro ao buscar instâncias na Evolution:", error);
        return json({ ok: false, error: "A API da Evolution retornou erro: " + error }, 200);
      }      // 1.1 Robust Parser: Using the exact schema provided by user
      let evoInstances = [];
      if (data && data.message === "success" && Array.isArray(data.data)) {
        evoInstances = data.data;
      } else if (Array.isArray(data)) {
        evoInstances = data;
      } else if (data && typeof data === 'object') {
        evoInstances = data.data || data.instances || data.result || [];
      }

      const { data: dbAgents } = await supabase
        .from("atende_ai_instances")
        .select("*")
        .eq("organization_id", organization_id);

      const matchedDbIds = new Set();
      let updatedCount = 0;
      let createdCount = 0;

      for (const ins of evoInstances) {
        const instanceId = ins.id;
        const instanceName = ins.name || ins.instanceName;
        const isConnected = ins.connected === true;
        const owner = ins.jid?.replace("@s.whatsapp.net", "") || null;
        const profilePic = ins.profilePictureUrl || null;

        const existingAgent = dbAgents?.find(a => 
          a.evolution_instance_id === instanceId
        );

        if (existingAgent) {
          matchedDbIds.add(existingAgent.id);
          const { error: upErr } = await supabase
            .from("atende_ai_instances")
            .update({
              whatsapp_connected: isConnected,
              connected_number: owner,
              profile_picture: profilePic,
              status: isConnected ? "active" : "inactive"
            })
            .eq("id", existingAgent.id);
          
          if (!upErr) updatedCount++;
        } else {
          const { error: insErr } = await supabase
            .from("atende_ai_instances")
            .insert({
              organization_id,
              name: instanceName,
              evolution_instance_id: instanceId,
              whatsapp_connected: isConnected,
              connected_number: owner,
              profile_picture: profilePic,
              status: isConnected ? "active" : "inactive"
            });
          if (!insErr) createdCount++;
        }
      }

      let orphanCount = 0;
      // SMART CLEANUP with 10min GRACE PERIOD
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      const orphans = dbAgents?.filter(dbA => {
        // If the agent is in the Evolution list, it's not an orphan
        const isInEvolution = evoInstances.some((evoA: any) => (evoA.id || evoA.instance?.instanceId) === dbA.evolution_instance_id);
        if (isInEvolution) return false;

        // If the agent was created in the last 10 minutes, give it a grace period (don't delete)
        const isRecentlyCreated = dbA.created_at > tenMinutesAgo;
        if (isRecentlyCreated) return false;

        // Otherwise, it's a true orphan (doesn't exist in Evolution and is old enough)
        return true;
      }) || [];
      
      orphanCount = orphans.length;
      if (orphanCount > 0) {
        await supabase.from("atende_ai_instances").delete().in("id", orphans.map(a => a.id));
      }

      return new Response(JSON.stringify({ ok: true, updated: updatedCount, created: createdCount, deleted: orphanCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ACTION: create ---
    if (action === "create") {
      const { name, organization_id } = body;
      if (!name) return json({ ok: false, error: "Name is required" }, 200);
      
      // CREATE UNIQUE SLUG with Org Prefix + Random Suffix to avoid collisions
      const orgPrefix = organization_id ? organization_id.substring(0, 4) : "off";
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const instanceName = `${orgPrefix}-${slug}-${uniqueSuffix}`;
      
      console.log(`[Create] Criando instância única: ${instanceName}`);
      
      const { ok, data, error } = await evolutionRequest("/instance/create", "POST", {
        instanceName: instanceName,
        name: instanceName,
        token: Math.random().toString(36).substring(2, 12)
      });
      
      if (!ok) {
        console.error("[Create] Erro ao criar instância na central:", error);
        const errDetail = typeof error === 'string' ? error : JSON.stringify(error);
        return json({ ok: false, error: "Erro na central: " + errDetail }, 200);
      }
      
      // Return the data directly from Evolution AND our generated instanceName
      return json({ ok: true, data, evolution_instance_id: instanceName }, 200);
    }

    // --- ACTION: delete ---
    if (action === "delete") {
      const instanceIdentifier = body.instance_id || body.instance_name;
      if (!instanceIdentifier) return json({ ok: false, error: "instance_id is required" }, 200);

      let uuidToDelete = instanceIdentifier;

      // 1. Evolution Go DELETE requires the strict UUID format (instance.id), not the instanceName.
      // We must fetch all instances to map the instanceName to its actual UUID.
      // Utilizando '/instance/all' visto que é a roda que provadamente funciona no bloco 'sync'
      const { data: allRes, ok: fetchOk } = await evolutionRequest("/instance/all", "GET");
      
      if (fetchOk) {
        let arr = [];
        if (allRes && allRes.message === "success" && Array.isArray(allRes.data)) arr = allRes.data;
        else if (Array.isArray(allRes)) arr = allRes;
        else if (allRes && typeof allRes === 'object') arr = allRes.data || allRes.instances || allRes.result || [];

        const target = arr.find((a: any) => 
          a.id === instanceIdentifier || 
          a.name === instanceIdentifier || 
          a.instanceName === instanceIdentifier ||
          a.instance?.instanceName === instanceIdentifier ||
          a.instance?.name === instanceIdentifier ||
          a.instance?.id === instanceIdentifier
        );

        if (target) {
            if (target.id) uuidToDelete = target.id;
            else if (target.instance?.instanceId) uuidToDelete = target.instance.instanceId;
            else if (target.instance?.id) uuidToDelete = target.instance.id;
        } else {
            console.warn(`[Delete] Instance ${instanceIdentifier} not found in Evolution Go. Assuming already deleted.`);
            return json({ ok: true, deleted_in_evolution: true, notes: "Already deleted in Evolution" }, 200);
        }
      } else {
          console.warn(`[Delete] fetchInstances failed. Proceeding with raw identifier.`);
      }

      console.log(`[Delete] Resolved ${instanceIdentifier} to UUID: ${uuidToDelete}`);

      // Optional: Logout first to prevent Evolution 'active' blockers
      await evolutionRequest(`/instance/logout/${instanceIdentifier}`, "DELETE");

      // Now Delete by UUID
      const { ok, error } = await evolutionRequest(`/instance/delete/${uuidToDelete}`, "DELETE");
      
      if (!ok) {
        console.warn(`[Delete] Evolution returned error: ${error}`);
        return json({ ok: false, error }, 200);
      }
      return json({ ok: true, deleted_in_evolution: true });
    }

    if (!agent_id) return json({ error: "agent_id is required" }, 400);

    const { data: agent } = await supabase.from("ai_agents").select("*").eq("id", agent_id).single();
    if (!agent) return json({ error: "Agent not found" }, 404);

    const instanceName = agent.uazapi_instance_id || agent.name.toLowerCase().replace(/\s+/g, '-');

    // --- ACTION: connect ---
    if (action === "connect") {
      // 1. Check if instance exists, if not create
      const checkRes = await evolutionRequest(`/instance/connectionState/${instanceName}`);
      
      if (!checkRes.ok && checkRes.error?.includes("not found")) {
        await evolutionRequest("/instance/create", "POST", {
          instanceName,
          token: agent.uazapi_instance_token || "default_token",
          qrcode: true
        });
      }

      // 2. Get connect info (QR/Pair)
      const connectRes = await evolutionRequest(`/instance/connect/${instanceName}`);
      if (!connectRes.ok) return json({ error: connectRes.error }, 500);

      return json(connectRes.data);
    }

    // --- ACTION: status ---
    if (action === "status") {
      const res = await evolutionRequest(`/instance/connectionState/${instanceName}`);
      if (!res.ok) return json({ status: "disconnected", whatsapp_connected: false });

      const isConnected = res.data?.instance?.state === "open";
      const owner = res.data?.instance?.owner?.replace("@s.whatsapp.net", "") || null;

      if (isConnected !== agent.whatsapp_connected) {
        await supabase
          .from("ai_agents")
          .update({
             whatsapp_connected: isConnected,
             connected_number: isConnected ? owner : agent.connected_number,
             status: isConnected ? "active" : "inactive"
          })
          .eq("id", agent_id);
      }

      return json({ 
        status: isConnected ? "connected" : "disconnected",
        whatsapp_connected: isConnected,
        owner,
        qrcode: res.data?.qrcode || null
      });
    }

    // --- ACTION: disconnect ---
    if (action === "disconnect") {
      await evolutionRequest(`/instance/logout/${instanceName}`, "DELETE");
      await supabase
        .from("ai_agents")
        .update({ whatsapp_connected: false, status: "inactive" })
        .eq("id", agent_id);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: "Internal server error" }, 500);
  }
});
