import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const EVOLUTION_URL = Deno.env.get("EVOLUTION_GO_URL")?.replace(/\/$/, "") || Deno.env.get("EVOLUTION_GO_BASE_URL")?.replace(/\/$/, "") || "http://localhost:8080";
const EVOLUTION_API_KEY = (Deno.env.get("EVOLUTION_GO_API_KEY") || "").trim();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function generateStrongToken(length = 32) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let retVal = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

async function evolutionRequest<T = any>(
  path: string,
  method = "GET",
  body?: any,
  extraHeaders?: Record<string, string>,
  overrideApiKey?: string
): Promise<{ ok: boolean; data?: T; error?: string; status?: number }> {
  try {
    const rawKey = overrideApiKey || EVOLUTION_API_KEY;
    const trimmedKey = (rawKey || "").trim();
    
    if (!trimmedKey) {
      return { ok: false, error: "Evolution API Key is missing", status: 401 };
    }
    
    const url = `${EVOLUTION_URL}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": trimmedKey,
      ...extraHeaders,
    };

    console.log(`[Evolution] ${method} -> ${url} | Key: ${trimmedKey.slice(0, 4)}...`);

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const rawText = await res.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      data = { message: rawText };
    }

    if (!res.ok) {
      console.error(`[Evolution] Error ${res.status}:`, data);
      return { ok: false, error: data?.error || data?.message || rawText || `HTTP ${res.status}`, status: res.status };
    }
    return { ok: true, data: data as T, status: res.status };
  } catch (err) {
    console.error(`[Evolution] Fetch Error:`, err);
    return { ok: false, error: err instanceof Error ? err.message : "Unreachable" };
  }
}

function extractInstanceMetadata(remote: any) {
  const data = remote.data || remote;
  
  // Connections status extraction
  const state = (data.status || data.state || data.connectionStatus || "").toString().toLowerCase();
  const isConnected = state === "open" || state === "connected" || data.Connected === true || data.status === "CONNECTED";

  // Phone number extraction fallback chain
  let rawJid = data.owner || data.ownerJid || data.jid || data.number || 
               data.me?.id || data.info?.me?.id || 
               data.instance?.owner || data.instance?.jid || data.instance?.settings?.owner ||
               null;
  
  let connectedNumber = rawJid ? rawJid.toString().split(/[#:@]/)[0] : null;
  
  // Profile picture fallback
  const profilePic = data.profilePictureUrl || data.profilePicUrl || data.profilePicture ||
                     data.instance?.profilePictureUrl || null;

  return { isConnected, state, connectedNumber, profilePic, name: data.Name };
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
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return json({ error: "Invalid user session" }, 401);
    
    const body = await req.json();
    const { action, organization_id } = body;

    console.log(`[Request] Action: ${action}, Org: ${organization_id}, Body Keys: ${Object.keys(body).join(", ")}`);

    if (!organization_id) {
      console.error("[Error] organization_id is missing in request body");
      return json({ error: "organization_id is required" }, 400);
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) return json({ error: "Unauthorized access to this agency" }, 403);

    // ROUTING
    switch (action) {
      case "sync-all": {
        console.log(`[SyncAll] Syncing local instances via status fetch (global key failed previously)`);
        
        const { data: localInstances } = await supabase
          .from("atende_ai_instances")
          .select("*")
          .eq("organization_id", organization_id);

        if (!localInstances || localInstances.length === 0) {
           return json({ ok: true, updated: 0 });
        }

        let updatedCount = 0;
        const debugLogs: any[] = [];

        for (const local of localInstances) {
           const apiKey = local.instance_api_key || local.evolution_instance_token || EVOLUTION_API_KEY;
           const targetId = local.evolution_instance_id || local.evolution_id || local.name;

           if (!targetId || !apiKey) {
               debugLogs.push({ id: local.id, name: local.name, status: "skipped_missing_credentials" });
               continue;
           }

           console.log(`[SyncAll] Checking status for ${local.name}... target: ${targetId}`);
           
           try {
             // Chamada na API usando o apiKey
             const res = await evolutionRequest(`/instance/status`, "GET", undefined, undefined, apiKey);
             
             if (res.ok && res.data) {
               const { isConnected, connectedNumber, profilePic } = extractInstanceMetadata(res.data);
               const updatePayload: any = {
                  whatsapp_connected: isConnected,
                  status: isConnected ? "active" : "inactive",
                  updated_at: new Date().toISOString()
               };

               if (connectedNumber) updatePayload.connected_number = connectedNumber;
               if (profilePic) updatePayload.profile_picture = profilePic;

               await supabase.from("atende_ai_instances").update(updatePayload).eq("id", local.id);
               updatedCount++;
               debugLogs.push({ id: local.id, name: local.name, status: isConnected ? "active" : "inactive", error: null });
             } else {
               // Falhou - vamos marcar como desconectado
               await supabase.from("atende_ai_instances").update({
                  whatsapp_connected: false,
                  status: "inactive",
                  updated_at: new Date().toISOString()
               }).eq("id", local.id);
               updatedCount++;
               debugLogs.push({ id: local.id, name: local.name, status: "inactive_fallback", error: res.error || "Evolution Failed" });
             }
           } catch (loopErr: any) {
               console.error(`Error processing instance ${local.name}:`, loopErr);
               debugLogs.push({ id: local.id, name: local.name, status: "error", error: loopErr.message });
           }
        }
        
        return json({ ok: true, updated: updatedCount, logs: debugLogs });
      }

      case "create": {
        const { name } = body;
        if (!name) return json({ error: "Name is required" }, 400);

        const technicalId = generateStrongToken(12);
        const instanceToken = generateStrongToken();
        const webhook_secret = crypto.randomUUID();
        const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-go-webhook/${webhook_secret}`;

        // Criar instância já com webhook configurado (Evolution Go docs)
        // Usar ALL para receber todos os eventos (MESSAGE, CONNECTION, QRCODE, etc.)
        const createRes = await evolutionRequest("/instance/create", "POST", {
          name: technicalId,
          token: instanceToken,
          webhook: webhookUrl,
          webhookEvents: ["ALL"],
        });

        if (!createRes.ok) return json({ ok: false, error: createRes.error }, 200);

        const resData = createRes.data as any;
        const evolutionId = resData?.id || resData?.data?.id || resData?.instance?.id;

        return json({
          ok: true,
          evolution_instance_id: technicalId,
          evolution_id: evolutionId,
          instance_api_key: instanceToken,
          evolution_webhook_secret: webhook_secret
        });
      }

      default: {
        // Actions requiring instance_id
        const instanceId = body.instance_id || body.agentId || body.id;
        if (!instanceId) return json({ error: "instance_id is required" }, 400);

        console.log(`[Action] ${action} for instance: ${instanceId}`);

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(instanceId);
        
        let query = supabase.from("atende_ai_instances").select("*").eq("organization_id", organization_id);
        
        if (isUuid) {
          query = query.or(`id.eq.${instanceId},evolution_id.eq.${instanceId},evolution_instance_id.eq.${instanceId}`);
        } else {
          query = query.or(`evolution_id.eq.${instanceId},evolution_instance_id.eq.${instanceId},name.eq.${instanceId}`);
        }

        const { data: atendeInstance, error: searchError } = await query.maybeSingle();

        if (searchError) {
          console.error(`[Error] Database search failed:`, searchError);
          throw searchError;
        }

        let targetInstance: any = null;
        let isLegacyAgent = false;

        if (atendeInstance) {
          targetInstance = atendeInstance;
        } else {
          // Fallback para tabela ai_agents
          let legacyQuery = supabase.from("ai_agents").select("*").eq("organization_id", organization_id);
          if (isUuid) {
            legacyQuery = legacyQuery.or(`id.eq.${instanceId},uazapi_instance_id.eq.${instanceId},evolution_instance_id.eq.${instanceId}`);
          } else {
            legacyQuery = legacyQuery.or(`evolution_instance_id.eq.${instanceId},name.eq.${instanceId}`);
          }
          const { data: legacyInstance } = await legacyQuery.maybeSingle();
          if (legacyInstance) {
            targetInstance = legacyInstance;
            isLegacyAgent = true;
          }
        }

        if (!targetInstance) {
          console.error(`[Error] Instance NOT found for: ${instanceId} in Org: ${organization_id}`);
          return json({ error: "Instância não encontrada no banco de dados local" }, 404);
        }

        const apiKey = targetInstance.instance_api_key || targetInstance.evolution_instance_token || targetInstance.evolution_apikey || targetInstance.uazapi_instance_token || EVOLUTION_API_KEY;

        if (action === "status" || action === "sync") {
          const res = await evolutionRequest(`/instance/status`, "GET", undefined, undefined, apiKey);
          
          if (!res.ok && res.status === 404) {
             // Fallback: search by name in all
             const all = await evolutionRequest("/instance/all", "GET");
             const remote = Array.isArray(all.data) ? all.data.find((r: any) => r.id === atendeInstance.evolution_id || r.name === atendeInstance.evolution_instance_id) : null;
             
             if (remote) {
                const { isConnected, connectedNumber, profilePic } = extractInstanceMetadata(remote);
                const updatePayload: any = {
                  whatsapp_connected: isConnected,
                  status: isConnected ? "active" : "inactive",
                  updated_at: new Date().toISOString()
                };

                if (connectedNumber) updatePayload.connected_number = connectedNumber;
                if (profilePic) updatePayload.profile_picture = profilePic;

                 await supabase.from(isLegacyAgent ? "ai_agents" : "atende_ai_instances").update(updatePayload).eq("id", targetInstance.id);
                 return json({ ok: true, isConnected });
              } else {
                 // Not found even in fallback. Mark as disconnected.
                 await supabase.from(isLegacyAgent ? "ai_agents" : "atende_ai_instances").update({
                   whatsapp_connected: false,
                   status: "inactive",
                   updated_at: new Date().toISOString()
                 }).eq("id", targetInstance.id);
                return json({ ok: true, isConnected: false });
             }
          } else if (!res.ok) {
             // Other error, mark disconnected.
             await supabase.from(isLegacyAgent ? "ai_agents" : "atende_ai_instances").update({
                whatsapp_connected: false,
                status: "inactive",
                updated_at: new Date().toISOString()
             }).eq("id", targetInstance.id);
             return json({ ok: false, isConnected: false, error: res.error });
          }

          const { isConnected, connectedNumber, profilePic } = extractInstanceMetadata(res.data);
          
          const updatePayload: any = {
            whatsapp_connected: isConnected,
            status: isConnected ? "active" : "inactive",
            updated_at: new Date().toISOString()
          };

          if (connectedNumber) updatePayload.connected_number = connectedNumber;
          if (profilePic) updatePayload.profile_picture = profilePic;

          await supabase.from(isLegacyAgent ? "ai_agents" : "atende_ai_instances").update(updatePayload).eq("id", targetInstance.id);

          return json({ ok: true, isConnected });
        }

        if (action === "connect") {
          let currentApiKey = apiKey;
          let currentTechnicalId = targetInstance.evolution_instance_id || targetInstance.uazapi_instance_id || targetInstance.evolution_id;
          let webhookSecret = targetInstance.evolution_webhook_secret || targetInstance.uazapi_webhook_secret || crypto.randomUUID();

          // Lazy Create se não existir na Evolution
          if (!currentTechnicalId || currentApiKey === EVOLUTION_API_KEY) {
            console.log(`[Connect] Instance not found in Evolution. Creating lazily for ${targetInstance.name}...`);
            const technicalId = generateStrongToken(12);
            const instanceToken = generateStrongToken();
            const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-go-webhook/${webhookSecret}`;

            const createRes = await evolutionRequest("/instance/create", "POST", {
              name: technicalId,
              token: instanceToken,
              webhook: webhookUrl,
              webhookEvents: ["ALL"],
            }, undefined, EVOLUTION_API_KEY);

            if (!createRes.ok) return json({ ok: false, error: "Falha ao registrar agente na API externa: " + createRes.error }, 200);

            const resData = createRes.data as any;
            currentApiKey = instanceToken;

            // Compatibilidade com ambos sistemas (Legacy e Atende)
            const updateDB: any = {
              evolution_instance_id: technicalId,
              evolution_id: resData?.id || resData?.data?.id || resData?.instance?.id || technicalId
            };

            if (isLegacyAgent) {
              updateDB.uazapi_instance_id = technicalId;
              updateDB.uazapi_instance_token = instanceToken;
              updateDB.evolution_instance_token = instanceToken;
              updateDB.evolution_apikey = instanceToken;
              if (!targetInstance.uazapi_webhook_secret && !targetInstance.evolution_webhook_secret) updateDB.uazapi_webhook_secret = webhookSecret;
            } else {
              updateDB.instance_api_key = instanceToken;
              if (!targetInstance.evolution_webhook_secret) updateDB.evolution_webhook_secret = webhookSecret;
            }

            await supabase.from(isLegacyAgent ? "ai_agents" : "atende_ai_instances").update(updateDB).eq("id", targetInstance.id);
            // Reatribui targetInstance modificado pra garantir que continue preenchido
            targetInstance = { ...targetInstance, ...updateDB };
          } else {
            // Se já existia mas webhookSecret era nulo
            if (!targetInstance.evolution_webhook_secret && !targetInstance.uazapi_webhook_secret) {
              await supabase
                .from(isLegacyAgent ? "ai_agents" : "atende_ai_instances")
                .update(isLegacyAgent ? { uazapi_webhook_secret: webhookSecret } : { evolution_webhook_secret: webhookSecret })
                .eq("id", targetInstance.id);
            }
          }

          const digits = body.phone ? body.phone.replace(/\D/g, "") : null;
          const webhookUrl = `${SUPABASE_URL}/functions/v1/evolution-go-webhook/${webhookSecret}`;
          
          const payload: any = { 
            webhookUrl: webhookUrl,
            subscribe: [
              "MESSAGE", 
              "SEND_MESSAGE", 
              "CONNECTION", 
              "QRCODE", 
              "MESSAGES_SET", 
              "MESSAGES_UPSERT", 
              "OFFLINE_SYNC_COMPLETED"
            ],
            immediate: true
          };

          // If phone is provided, Evolution uses it for Pairing Code
          if (digits) {
            payload.phone = digits;
          }

          const res = await evolutionRequest(`/instance/connect`, "POST", payload, undefined, currentApiKey);
          
          console.log(`[Connect] Evolution returned:`, JSON.stringify(res.data).substring(0, 500));
          
          if (!res.ok) return json({ ok: false, error: res.error }, 200);

          let qr = res.data?.base64 || res.data?.qrcode || res.data?.data?.qrcode || res.data?.data?.base64 || res.data?.instance?.qrcode;
          let code = res.data?.pairingCode || res.data?.code || res.data?.data?.code || res.data?.instance?.code;

          return json({ 
            ok: true, 
            qrcode: qr, 
            paircode: code,
            debug: res.data
          });
        }

        if (action === "disconnect") {
          console.log(`[Disconnect] Attempting to disconnect ${atendeInstance.evolution_instance_id}...`);
          try {
            // Tentamos desconectar na Evolution. Se falhar, ignoramos e limpamos localmente.
            const res = await evolutionRequest(`/instance/disconnect`, "POST", undefined, undefined, apiKey);
            if (!res.ok) {
               console.warn(`[Disconnect] Evolution API returned error (ignoring): ${res.error}`);
               // Fallback para /logout se /disconnect falhar
               await evolutionRequest(`/instance/logout`, "POST", undefined, undefined, apiKey);
            }
          } catch (e) {
            console.error(`[Disconnect] Failed to call Evolution API:`, e);
          }
          
          console.log(`[Disconnect] Cleaning up local database for ${targetInstance.id}`);
          // Garantimos que o estado local seja limpo
          const { error: updateError } = await supabase
            .from(isLegacyAgent ? "ai_agents" : "atende_ai_instances")
            .update({
              whatsapp_connected: false,
              status: "inactive",
              updated_at: new Date().toISOString()
            })
            .eq("id", targetInstance.id);
            
          if (updateError) {
            console.error(`[Disconnect] Database update failed:`, updateError);
            return json({ error: "Erro ao atualizar banco de dados local" }, 500);
          }

          return json({ ok: true, message: "Instância desconectada com sucesso localmente" });
        }

        if (action === "send-text") {
          const { to, text } = body;
          if (!to || !text) return json({ error: "to and text are required" }, 400);

          const number = to.replace(/[^0-9]/g, "");
          const res = await evolutionRequest("/send/text", "POST", {
            number,
            text,
            delay: 1000,
          }, undefined, apiKey);

          if (!res.ok) return json({ ok: false, error: res.error }, 200);
          return json({ ok: true, data: res.data });
        }

        if (action === "delete") {
          const deleteId = targetInstance.evolution_instance_id || targetInstance.evolution_id || targetInstance.name;
          await evolutionRequest(`/instance/delete/${deleteId}`, "DELETE", undefined, undefined, apiKey);
          await supabase.from(isLegacyAgent ? "ai_agents" : "atende_ai_instances").delete().eq("id", targetInstance.id);
          return json({ ok: true });
        }

        return json({ error: `Unsupported action: ${action}` }, 400);
      }
    }
  } catch (err: any) {
    console.error("Function Error:", err);
    return json({ error: err.message }, 500);
  }
});
