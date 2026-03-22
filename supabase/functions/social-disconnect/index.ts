import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const ZERNIO_API_BASE = "https://zernio.com/api/v1";

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

    const { late_account_id } = await req.json();
    if (!late_account_id) {
      return new Response(JSON.stringify({ error: "late_account_id is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY")!;
    console.log(`[social-disconnect] Disconnecting account ${late_account_id}`);

    const response = await fetch(`${ZERNIO_API_BASE}/accounts/${late_account_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[social-disconnect] Zernio error:", errorData);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    console.error("[social-disconnect] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


