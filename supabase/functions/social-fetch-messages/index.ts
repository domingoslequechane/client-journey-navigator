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

    // Parse optional client_id from body
    let clientId: string | null = null;
    try {
      const body = await req.json();
      clientId = body.client_id || null;
    } catch {
      // No body
    }

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

    if (!lateApiKey) {
      return new Response(
        JSON.stringify({ fetched: 0, message: "Late.dev API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build list of clients to fetch messages for
    let clientsToFetch: { id: string; late_profile_id: string }[] = [];

    if (clientId) {
      const { data: client } = await serviceClient
        .from("clients")
        .select("id, late_profile_id")
        .eq("id", clientId)
        .eq("organization_id", orgId)
        .single();

      if (client?.late_profile_id) {
        clientsToFetch = [{ id: client.id, late_profile_id: client.late_profile_id }];
      }
    } else {
      const { data: clients } = await serviceClient
        .from("clients")
        .select("id, late_profile_id")
        .eq("organization_id", orgId)
        .not("late_profile_id", "is", null);

      clientsToFetch = (clients || []).filter((c: any) => c.late_profile_id);
    }

    if (clientsToFetch.length === 0) {
      return new Response(
        JSON.stringify({ fetched: 0, message: "No clients with Late.dev profiles" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalFetched = 0;

    for (const client of clientsToFetch) {
      const lateResponse = await fetch(
        `https://api.getlate.dev/v1/profiles/${client.late_profile_id}/messages`,
        {
          headers: {
            Authorization: `Bearer ${lateApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!lateResponse.ok) {
        console.error(`Late.dev API error for client ${client.id}:`, await lateResponse.text());
        continue;
      }

      const lateData = await lateResponse.json();
      const lateMessages = lateData.data || lateData.messages || [];

      // Get social accounts for this client
      const { data: accounts } = await serviceClient
        .from("social_accounts")
        .select("id, late_account_id, platform, client_id")
        .eq("organization_id", orgId)
        .eq("client_id", client.id);

      const accountMap = new Map(
        (accounts || []).map((a: any) => [a.late_account_id, a])
      );

      for (const msg of lateMessages) {
        const account = accountMap.get(msg.account_id);
        if (!account) continue;

        const { error: insertError } = await serviceClient
          .from("social_messages")
          .upsert(
            {
              organization_id: orgId,
              social_account_id: account.id,
              client_id: client.id,
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

        if (!insertError) totalFetched++;
      }
    }

    return new Response(
      JSON.stringify({ fetched: totalFetched }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
