import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { late_account_id } = await req.json();
    if (!late_account_id) {
      return new Response(JSON.stringify({ error: "late_account_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LATE_API_KEY = Deno.env.get("LATE_API_KEY")!;

    console.log(`[social-disconnect] Disconnecting account ${late_account_id} from Late.dev`);

    // Call Late.dev API to delete the account
    const response = await fetch(`${LATE_API_BASE}/accounts/${late_account_id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${LATE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[social-disconnect] Late.dev error:", errorData);
      // Even if Late.dev fails (e.g. account already gone), we might want to proceed with local deletion
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[social-disconnect] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});