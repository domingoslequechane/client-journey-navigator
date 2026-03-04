import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const LATE_API_BASE = "https://getlate.dev/api/v1";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("current_organization_id").eq("id", user.id).single();
    if (!profile?.current_organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orgId = profile.current_organization_id;
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY")!;

    let clientId: string | null = null;
    try { const body = await req.json(); clientId = body.client_id || null; } catch { }

    const platformMap: Record<string, string> = {
      twitter: "twitter", instagram: "instagram", facebook: "facebook", linkedin: "linkedin",
      tiktok: "tiktok", youtube: "youtube", pinterest: "pinterest", threads: "threads",
      google_business: "google_business", bluesky: "bluesky", reddit: "reddit", telegram: "telegram"
    };

    let clientsToSync: { id: string; late_profile_id: string }[] = [];

    if (clientId) {
      const { data: client } = await supabase.from("clients").select("id, late_profile_id").eq("id", clientId).eq("organization_id", orgId).single();
      if (client?.late_profile_id) clientsToSync = [{ id: client.id, late_profile_id: client.late_profile_id }];
    } else {
      const { data: clients } = await supabase.from("clients").select("id, late_profile_id").eq("organization_id", orgId).not("late_profile_id", "is", null);
      clientsToSync = (clients || []).filter((c: any) => c.late_profile_id);
    }

    if (clientsToSync.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "No clients with Late.dev profiles found" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let totalSynced = 0;

    for (const client of clientsToSync) {
      console.log(`[social-sync-accounts] Syncing accounts for client ${client.id} (Late Profile: ${client.late_profile_id})`);
      
      const accountsRes = await fetch(`${LATE_API_BASE}/accounts?profileId=${client.late_profile_id}`, { headers: { Authorization: `Bearer ${LATE_API_KEY}` } });
      const accountsData = await accountsRes.json();
      
      if (!accountsRes.ok) { 
        console.error(`[social-sync-accounts] Failed to fetch Late accounts for client ${client.id}:`, accountsData); 
        continue; 
      }

      const lateAccounts = accountsData.accounts || accountsData.data || [];
      console.log(`[social-sync-accounts] Found ${lateAccounts.length} accounts in Late.dev for profile ${client.late_profile_id}`);

      const { data: existingAccounts } = await supabase.from("social_accounts").select("*").eq("organization_id", orgId).eq("client_id", client.id);
      const existing = existingAccounts || [];
      const existingByLateId = new Map(existing.filter((a: any) => a.late_account_id).map((a: any) => [a.late_account_id, a]));
      const syncedIds = new Set<string>();

      for (const account of lateAccounts) {
        const platform = platformMap[account.platform] || account.platform;
        const lateId = account._id || account.id;
        syncedIds.add(lateId);

        const accountData = {
          organization_id: orgId, client_id: client.id, platform,
          account_name: account.displayName || account.username || platform,
          username: account.username || "", avatar_url: account.avatarUrl || account.avatar_url || null,
          is_connected: account.isActive !== false && account.status !== 'inactive', 
          followers_count: account.followers || account.followers_count || 0,
          late_account_id: lateId,
        };

        if (existingByLateId.has(lateId)) {
          await supabase.from("social_accounts").update(accountData).eq("id", existingByLateId.get(lateId).id);
        } else {
          const existingPlatformAccount = existing.find((a: any) => a.platform === platform && !a.late_account_id);
          if (existingPlatformAccount) {
            await supabase.from("social_accounts").update(accountData).eq("id", existingPlatformAccount.id);
          } else {
            await supabase.from("social_accounts").insert(accountData);
          }
        }
        totalSynced++;
      }

      // Mark accounts as disconnected if they are no longer in Late.dev
      for (const acc of existing) {
        if (acc.late_account_id && !syncedIds.has(acc.late_account_id)) {
          await supabase.from("social_accounts").update({ is_connected: false }).eq("id", acc.id);
        }
      }
    }

    return new Response(JSON.stringify({ synced: totalSynced }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    console.error("[social-sync-accounts] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});