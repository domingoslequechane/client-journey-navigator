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

    const { platform, redirect_url, client_id } = await req.json();
    if (!platform) {
      return new Response(JSON.stringify({ error: "Platform is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!client_id) {
      return new Response(JSON.stringify({ error: "client_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("current_organization_id").eq("id", user.id).single();
    if (!profile?.current_organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orgId = profile.current_organization_id;
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY")!;

    const { data: client, error: clientError } = await supabase
      .from("clients").select("id, company_name, late_profile_id, organization_id")
      .eq("id", client_id).eq("organization_id", orgId).single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let profileId = client.late_profile_id;

    if (!profileId) {
      const createRes = await fetch(`${LATE_API_BASE}/profiles`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LATE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: client.company_name }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to create Late profile", details: createData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      profileId = createData.profile?._id || createData._id;
      await supabase.from("clients").update({ late_profile_id: profileId }).eq("id", client_id);
    }

    const connectUrl = new URL(`${LATE_API_BASE}/connect/${platform}`);
    connectUrl.searchParams.set("profileId", profileId);
    if (redirect_url) connectUrl.searchParams.set("redirect_url", redirect_url);

    const connectRes = await fetch(connectUrl.toString(), { headers: { Authorization: `Bearer ${LATE_API_KEY}` } });
    const connectData = await connectRes.json();
    if (!connectRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to get connect URL", details: connectData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ authUrl: connectData.authUrl, profileId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    console.error("social-connect error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
