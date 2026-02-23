import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lateApiKey = Deno.env.get("LATE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", userId)
      .single();

    if (!profile?.current_organization_id) {
      return new Response(
        JSON.stringify({ error: "No organization found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId = profile.current_organization_id;

    // Get organization's late_profile_id
    const { data: org } = await supabase
      .from("organizations")
      .select("late_profile_id")
      .eq("id", orgId)
      .single();

    if (!org?.late_profile_id || !lateApiKey) {
      // No Late.dev integration — return empty
      return new Response(
        JSON.stringify({ fetched: 0, message: "Late.dev integration not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch messages from Late.dev API
    const lateResponse = await fetch(
      `https://api.getlate.dev/v1/profiles/${org.late_profile_id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${lateApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!lateResponse.ok) {
      console.error("Late.dev API error:", await lateResponse.text());
      return new Response(
        JSON.stringify({ fetched: 0, error: "Failed to fetch from Late.dev" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lateData = await lateResponse.json();
    const lateMessages = lateData.data || lateData.messages || [];

    // Get social accounts for mapping
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: accounts } = await serviceClient
      .from("social_accounts")
      .select("id, late_account_id, platform, client_id")
      .eq("organization_id", orgId);

    const accountMap = new Map(
      (accounts || []).map((a: any) => [a.late_account_id, a])
    );

    let fetched = 0;

    for (const msg of lateMessages) {
      const account = accountMap.get(msg.account_id);
      if (!account) continue;

      const { error: insertError } = await serviceClient
        .from("social_messages")
        .upsert(
          {
            organization_id: orgId,
            social_account_id: account.id,
            client_id: account.client_id,
            platform: account.platform,
            message_type: msg.type === "comment" ? "comment" : "dm",
            post_id: msg.post_id || null,
            sender_name: msg.sender?.name || "Unknown",
            sender_username: msg.sender?.username || null,
            sender_avatar_url: msg.sender?.avatar_url || null,
            content: msg.content || msg.text || "",
            is_read: false,
            external_id: msg.id,
            received_at: msg.created_at || new Date().toISOString(),
          },
          { onConflict: "organization_id,external_id", ignoreDuplicates: true }
        );

      if (!insertError) fetched++;
    }

    return new Response(
      JSON.stringify({ fetched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
