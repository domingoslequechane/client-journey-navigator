import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const LATE_API_BASE = "https://getlate.dev/api/v1";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY");

    if (!LATE_API_KEY) {
      console.error("LATE_API_KEY is missing");
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const { data: client, error: clientError } = await supabase
      .from("clients").select("id, company_name, late_profile_id, organization_id")
      .eq("id", client_id).eq("organization_id", orgId).single();

    if (clientError || !client) {
      return new Response(JSON.stringify({ error: "Client not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Helper to create profile in Late
    const createLateProfile = async (name: string) => {
      console.log("Creating Late profile for:", name);
      const res = await fetch(`${LATE_API_BASE}/profiles`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LATE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to create profile:", data);
        throw new Error(data.message || "Failed to create profile in Late API");
      }
      // Late API might return { profile: { _id: ... } } or { _id: ... } depending on version
      return data.profile?._id || data._id;
    };

    let profileId = client.late_profile_id;

    // Create profile if not exists locally
    if (!profileId) {
      try {
        profileId = await createLateProfile(client.company_name);
        await supabase.from("clients").update({ late_profile_id: profileId }).eq("id", client_id);
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Helper to get connect URL
    const getConnectUrlParams = (profId: string) => {
      const url = new URL(`${LATE_API_BASE}/connect/${platform}`);
      url.searchParams.set("profileId", profId);
      if (redirect_url) url.searchParams.set("redirectUrl", redirect_url);
      return url.toString();
    };

    // Try to get connect URL
    let connectRes = await fetch(getConnectUrlParams(profileId), { 
      headers: { Authorization: `Bearer ${LATE_API_KEY}` } 
    });

    // If 404, profile might be deleted in Late but exists in our DB. Re-create it.
    if (connectRes.status === 404) {
      console.log("Profile not found in Late API (404), re-creating...");
      try {
        profileId = await createLateProfile(client.company_name);
        await supabase.from("clients").update({ late_profile_id: profileId }).eq("id", client_id);
        
        // Retry connect
        connectRes = await fetch(getConnectUrlParams(profileId), { 
          headers: { Authorization: `Bearer ${LATE_API_KEY}` } 
        });
      } catch (e: any) {
        return new Response(JSON.stringify({ error: "Failed to recover profile: " + e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const connectData = await connectRes.json();
    if (!connectRes.ok) {
      console.error("Failed to get connect URL:", connectData);
      return new Response(JSON.stringify({ error: "Failed to get connect URL", details: connectData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle different response formats (authUrl or auth_url)
    const authUrl = connectData.authUrl || connectData.auth_url;

    if (!authUrl) {
      console.error("No authUrl in response:", connectData);
      return new Response(JSON.stringify({ error: "Invalid response from Late API", details: connectData }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ authUrl, profileId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    console.error("social-connect error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});