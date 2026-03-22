import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const ZERNIO_API_BASE = "https://zernio.com/api/v1";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return new Response(JSON.stringify({ error: "fileName and fileType are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY")!;

    console.log(`[social-media-presign] Requesting presigned URL for ${fileName} (${fileType})`);

    const lateRes = await fetch(`${ZERNIO_API_BASE}/media/presign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ZERNIO_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ filename: fileName, contentType: fileType }),
    });

    const lateData = await lateRes.json();

    if (!lateRes.ok) {
      console.error("[social-media-presign] Zernio error:", lateData);
      return new Response(JSON.stringify({ error: lateData.message || lateData.error || "Failed to get presigned URL", details: lateData }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(lateData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[social-media-presign] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});



