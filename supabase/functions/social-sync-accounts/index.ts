import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LATE_API_BASE = "https://getlate.dev/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.current_organization_id) {
      return new Response(
        JSON.stringify({ error: "No organization found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orgId = profile.current_organization_id;
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY")!;

    // Get org's Late profile ID
    const { data: org } = await supabase
      .from("organizations")
      .select("late_profile_id")
      .eq("id", orgId)
      .single();

    if (!org?.late_profile_id) {
      return new Response(
        JSON.stringify({ error: "No Late profile configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch connected accounts from Late.dev
    const accountsRes = await fetch(
      `${LATE_API_BASE}/accounts?profileId=${org.late_profile_id}`,
      {
        headers: {
          Authorization: `Bearer ${LATE_API_KEY}`,
        },
      }
    );

    const accountsData = await accountsRes.json();
    if (!accountsRes.ok) {
      console.error("Failed to fetch Late accounts:", accountsData);
      return new Response(
        JSON.stringify({ error: "Failed to fetch accounts", details: accountsData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const lateAccounts = accountsData.accounts || [];

    // Get existing accounts from Supabase
    const { data: existingAccounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("organization_id", orgId);

    const existing = existingAccounts || [];
    const existingByLateId = new Map(
      existing.filter((a: any) => a.late_account_id).map((a: any) => [a.late_account_id, a])
    );

    // Platform name mapping from Late.dev to our format
    const platformMap: Record<string, string> = {
      twitter: "twitter",
      instagram: "instagram",
      facebook: "facebook",
      linkedin: "linkedin",
      tiktok: "tiktok",
      youtube: "youtube",
      pinterest: "pinterest",
      threads: "threads",
    };

    const syncedIds = new Set<string>();

    for (const account of lateAccounts) {
      const platform = platformMap[account.platform] || account.platform;
      const lateId = account._id;
      syncedIds.add(lateId);

      const accountData = {
        organization_id: orgId,
        platform,
        account_name: account.displayName || account.username || platform,
        username: account.username || "",
        avatar_url: account.avatarUrl || null,
        is_connected: account.isActive !== false,
        followers_count: account.followers || 0,
        late_account_id: lateId,
        client_id: null,
      };

      if (existingByLateId.has(lateId)) {
        // Update existing
        const existingAccount = existingByLateId.get(lateId);
        await supabase
          .from("social_accounts")
          .update(accountData)
          .eq("id", existingAccount.id);
      } else {
        // Check if there's an existing account for this platform without late_account_id
        const existingPlatformAccount = existing.find(
          (a: any) => a.platform === platform && !a.late_account_id
        );

        if (existingPlatformAccount) {
          await supabase
            .from("social_accounts")
            .update(accountData)
            .eq("id", existingPlatformAccount.id);
        } else {
          // Insert new
          await supabase.from("social_accounts").insert(accountData);
        }
      }
    }

    // Mark disconnected accounts (those in DB with late_account_id but not in Late anymore)
    for (const acc of existing) {
      if (acc.late_account_id && !syncedIds.has(acc.late_account_id)) {
        await supabase
          .from("social_accounts")
          .update({ is_connected: false })
          .eq("id", acc.id);
      }
    }

    return new Response(
      JSON.stringify({
        synced: lateAccounts.length,
        accounts: lateAccounts.map((a: any) => ({
          platform: a.platform,
          username: a.username,
          displayName: a.displayName,
          isActive: a.isActive,
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("social-sync-accounts error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
