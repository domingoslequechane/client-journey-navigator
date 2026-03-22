import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const ZERNIO_API_BASE = "https://zernio.com/api/v1";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const zernioApiKey = Deno.env.get("ZERNIO_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: claims, error: claimsError } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claims.claims.sub as string;
    const { message_id, reply_content } = await req.json();

    if (!message_id || !reply_content) {
      return new Response(JSON.stringify({ error: "message_id and reply_content are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase.from("profiles").select("current_organization_id").eq("id", userId).single();
    if (!profile?.current_organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orgId = profile.current_organization_id;
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: message, error: msgError } = await serviceClient.from("social_messages").select("*").eq("id", message_id).eq("organization_id", orgId).single();
    if (msgError || !message) {
      return new Response(JSON.stringify({ error: "Message not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let lateProfileId: string | null = null;
    if (message.client_id) {
      const { data: client } = await serviceClient.from("clients").select("late_profile_id").eq("id", message.client_id).single();
      lateProfileId = client?.late_profile_id || null;
    }

    if (lateProfileId && zernioApiKey && message.external_id) {
      try {
        const endpoint = message.message_type === "comment"
          ? `${ZERNIO_API_BASE}/comments/${message.external_id}/reply?profileId=${lateProfileId}`
          : `${ZERNIO_API_BASE}/messages/${message.external_id}/reply?profileId=${lateProfileId}`;

        const lateResponse = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${zernioApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content: reply_content }),
        });

        if (!lateResponse.ok) console.error("[social-reply-message] Zernio reply error:", await lateResponse.text());
      } catch (err) {
        console.error("[social-reply-message] Zernio reply failed:", err);
      }
    }

    const { error: updateError } = await serviceClient.from("social_messages").update({
      reply_content, replied_at: new Date().toISOString(), is_read: true,
    }).eq("id", message_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("[social-reply-message] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


