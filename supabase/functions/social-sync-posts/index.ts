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

    const { data: profile } = await supabase.from("profiles").select("current_organization_id").eq("id", user.id).single();
    if (!profile?.current_organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const orgId = profile.current_organization_id;
    const ZERNIO_API_KEY = Deno.env.get("ZERNIO_API_KEY")!;

    const { data: posts, error: postsError } = await supabase
      .from("social_posts").select("id, late_post_id, status")
      .eq("organization_id", orgId).not("late_post_id", "is", null)
      .in("status", ["scheduled", "failed", "pending_approval"]);

    if (postsError) throw postsError;

    let syncedCount = 0;

    for (const post of (posts || [])) {
      try {
        const ids = post.late_post_id.split(',').filter(Boolean);
        let somePublished = false;
        let allFailed = true;
        let someScheduled = false;
        let allDeleted = true;

        for (const lateId of ids) {
          const response = await fetch(`${ZERNIO_API_BASE}/posts/${lateId}`, {
            headers: { Authorization: `Bearer ${ZERNIO_API_KEY}` }
          });

          if (response.status === 404) {
            console.log(`[social-sync-posts] Post ${lateId} not found on Zernio (404)`);
            continue; // Treat as deleted on Zernio
          }

          if (response.ok) {
            allDeleted = false;
            const lateData = await response.json();
            const lateStatus = lateData.post?.status || lateData.status;

            if (lateStatus === 'published' || lateStatus === 'sent') {
              somePublished = true;
              allFailed = false;
            } else if (lateStatus === 'scheduled') {
              someScheduled = true;
              allFailed = false;
            } else if (lateStatus === 'failed' || lateStatus === 'error') {
              // remains allFailed true unless another part is scheduled/published
            } else if (lateStatus === 'cancelled' || lateStatus === 'deleted') {
              // treat as deleted/ignored for status aggregation
            } else {
              allFailed = false;
            }
          }
        }

        // Aggregate status for multi-part posts
        let newStatus = post.status;

        if (allDeleted && ids.length > 0) {
          console.log(`[social-sync-posts] All parts of post ${post.id} deleted from Zernio. Removing from DB.`);
          await supabase.from("social_posts").delete().eq("id", post.id);
          syncedCount++;
          continue;
        }

        if (somePublished) newStatus = 'published';
        else if (someScheduled) newStatus = 'scheduled';
        else if (allFailed && ids.length > 0) newStatus = 'failed';

        if (newStatus !== post.status) {
          await supabase.from("social_posts").update({
            status: newStatus,
            ...(newStatus === 'published' ? { published_at: new Date().toISOString() } : {})
          }).eq("id", post.id);
          syncedCount++;
        }
      } catch (err) {
        console.error(`[social-sync-posts] Failed to sync post ${post.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, synced: syncedCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    console.error("[social-sync-posts] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});


