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

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.current_organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.current_organization_id;
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY")!;

    // Find posts that are not yet published but have a Late ID
    const { data: posts, error: postsError } = await supabase
      .from("social_posts")
      .select("id, late_post_id, status")
      .eq("organization_id", orgId)
      .not("late_post_id", "is", null)
      .in("status", ["scheduled", "failed", "pending_approval"]);

    if (postsError) throw postsError;

    let syncedCount = 0;

    for (const post of (posts || [])) {
      try {
        const response = await fetch(`${LATE_API_BASE}/posts/${post.late_post_id}`, {
          headers: { Authorization: `Bearer ${LATE_API_KEY}` },
        });

        if (response.ok) {
          const lateData = await response.json();
          const lateStatus = lateData.post?.status || lateData.status;
          
          // Map Late.dev status to our status
          let newStatus = post.status;
          if (lateStatus === 'published' || lateStatus === 'sent') {
            newStatus = 'published';
          } else if (lateStatus === 'failed' || lateStatus === 'error') {
            newStatus = 'failed';
          } else if (lateStatus === 'scheduled') {
            newStatus = 'scheduled';
          }

          if (newStatus !== post.status) {
            await supabase
              .from("social_posts")
              .update({ 
                status: newStatus,
                ...(newStatus === 'published' ? { published_at: new Date().toISOString() } : {})
              })
              .eq("id", post.id);
            syncedCount++;
          }
        }
      } catch (err) {
        console.error(`Failed to sync post ${post.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, synced: syncedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[social-sync-posts] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});