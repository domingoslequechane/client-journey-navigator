import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid or empty request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { post_id, publish_now } = body;
    if (!post_id) {
      return new Response(
        JSON.stringify({ error: "post_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.current_organization_id) {
      return new Response(
        JSON.stringify({ error: "No organization found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const orgId = profile.current_organization_id;
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY")!;

    // Get the post
    const { data: post, error: postError } = await supabase
      .from("social_posts")
      .select("*")
      .eq("id", post_id)
      .eq("organization_id", orgId)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get connected accounts for the selected platforms, filtered by client
    const accountQuery = supabase
      .from("social_accounts")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_connected", true)
      .in("platform", post.platforms || []);

    // Filter by client_id if the post has one
    if (post.client_id) {
      accountQuery.eq("client_id", post.client_id);
    }

    const { data: accounts } = await accountQuery;

    if (!accounts || accounts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No connected accounts for selected platforms" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build Late.dev post payload
    const platforms = accounts
      .filter((a: any) => a.late_account_id)
      .map((a: any) => ({
        platform: a.platform,
        accountId: a.late_account_id,
      }));

    if (platforms.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Late.dev connected accounts found. Please reconnect your accounts." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const latePayload: any = {
      content: post.content,
      platforms,
      // CRITICAL: Pass the content type to Late.dev
      type: post.content_type || 'feed',
    };

    // Add media if present
    if (post.media_urls && post.media_urls.length > 0) {
      latePayload.mediaItems = post.media_urls.map((url: string) => {
        const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);
        return {
          type: isVideo ? "video" : "image",
          url,
        };
      });
    }

    // Schedule or publish now
    if (publish_now) {
      latePayload.publishNow = true;
    } else if (post.scheduled_at) {
      latePayload.scheduledFor = post.scheduled_at;
    } else {
      latePayload.publishNow = true;
    }

    console.log(`[social-publish] Sending post ${post_id} to Late.dev as ${latePayload.type}`);

    // Send to Late.dev
    const lateRes = await fetch(`${LATE_API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(latePayload),
    });

    let lateData: any = {};
    try {
      const lateText = await lateRes.text();
      lateData = lateText ? JSON.parse(lateText) : {};
    } catch {
      lateData = { error: `Late.dev returned status ${lateRes.status} with unparseable body` };
    }

    if (!lateRes.ok) {
      console.error("Late.dev publish error:", lateData);

      // Update post status to failed
      await supabase
        .from("social_posts")
        .update({
          status: "failed",
          notes: `Late.dev error: ${JSON.stringify(lateData)}`,
        })
        .eq("id", post_id);

      return new Response(
        JSON.stringify({ error: "Failed to publish", details: lateData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update post with Late.dev ID and status
    const latePostId = lateData.post?._id || lateData._id;
    const newStatus = publish_now ? "published" : "scheduled";

    await supabase
      .from("social_posts")
      .update({
        late_post_id: latePostId,
        status: newStatus,
        ...(publish_now ? { published_at: new Date().toISOString() } : {}),
      })
      .eq("id", post_id);

    return new Response(
      JSON.stringify({
        success: true,
        latePostId,
        status: newStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("social-publish error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});