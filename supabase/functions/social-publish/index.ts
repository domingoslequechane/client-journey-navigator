import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const LATE_API_BASE = "https://getlate.dev/api/v1";

const getPlatformContentType = (platform: string, internalContentType: string): string => {
  if (internalContentType === 'stories') return 'story';
  if (internalContentType === 'reels') {
    if (platform === 'facebook') return 'reel';
    if (platform === 'instagram') return 'reels';
  }
  return internalContentType || 'feed';
};

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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid or empty request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { post_id, publish_now } = body;
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles").select("current_organization_id").eq("id", user.id).single();

    if (!profile?.current_organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.current_organization_id;
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY")!;

    const { data: post, error: postError } = await supabase
      .from("social_posts").select("*").eq("id", post_id).eq("organization_id", orgId).single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountQuery = supabase
      .from("social_accounts").select("*").eq("organization_id", orgId)
      .eq("is_connected", true).in("platform", post.platforms || []);

    if (post.client_id) accountQuery.eq("client_id", post.client_id);

    const { data: accounts } = await accountQuery;

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ error: "No connected accounts for selected platforms" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare content with CTA if needed
    let finalContent = post.content;
    if (post.cta_type === 'whatsapp' && post.cta_value) {
      const whatsappLink = `https://wa.me/${post.cta_value.replace(/\D/g, '')}`;
      finalContent += `\n\nFale conosco pelo WhatsApp: ${whatsappLink}`;
    }

    const platforms = accounts
      .filter((a: any) => a.late_account_id)
      .map((a: any) => {
        const platform = a.platform;
        const contentType = getPlatformContentType(platform, post.content_type);
        
        const platformSpecificData: any = { contentType };

        // Add mandatory TikTok settings
        if (platform === 'tiktok') {
          platformSpecificData.tiktokSettings = {
            privacy_level: "PUBLIC_TO_EVERYONE",
            allow_comment: true,
            allow_duet: true,
            allow_stitch: true,
            content_preview_confirmed: true,
            express_consent_given: true
          };
        }

        // Google Business Profile CTA
        if (platform === 'googlebusiness' && post.cta_type !== 'none') {
          if (post.cta_type === 'whatsapp' && post.cta_value) {
            platformSpecificData.callToAction = {
              type: "CALL",
              url: `https://wa.me/${post.cta_value.replace(/\D/g, '')}`
            };
          } else if (post.cta_type === 'channel') {
            platformSpecificData.callToAction = {
              type: "LEARN_MORE",
              url: "https://getlate.dev" // Placeholder or actual channel link
            };
          }
        }

        // Add Instagram Reels defaults
        if (platform === 'instagram' && contentType === 'reels') {
          platformSpecificData.shareToFeed = true;
        }

        // Add YouTube defaults
        if (platform === 'youtube') {
          platformSpecificData.madeForKids = false;
          platformSpecificData.visibility = "public";
          platformSpecificData.title = post.content?.split('\n')[0]?.substring(0, 100) || "New Video";
        }

        // Add Facebook defaults
        if (platform === 'facebook' && contentType === 'reel') {
          platformSpecificData.title = post.content?.split('\n')[0]?.substring(0, 100) || "New Reel";
        }

        return {
          platform,
          accountId: a.late_account_id,
          platformSpecificData
        };
      });

    if (platforms.length === 0) {
      return new Response(JSON.stringify({ error: "No Late.dev connected accounts found." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latePayload: any = { 
      content: finalContent, 
      platforms,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use server/browser timezone
    };

    if (post.media_urls && post.media_urls.length > 0) {
      latePayload.mediaItems = post.media_urls.map((url: string) => {
        const isVideo = /\.(mp4|mov|avi|webm)$/i.test(url);
        return { type: isVideo ? "video" : "image", url };
      });
    }

    if (publish_now) {
      latePayload.publishNow = true;
    } else if (post.scheduled_at) {
      latePayload.scheduledFor = post.scheduled_at;
    } else {
      latePayload.publishNow = true;
    }

    console.log(`[social-publish] Sending post ${post_id} to Late.dev`);

    const lateRes = await fetch(`${LATE_API_BASE}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LATE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(latePayload),
    });

    let lateData: any = {};
    try {
      const lateText = await lateRes.text();
      lateData = lateText ? JSON.parse(lateText) : {};
    } catch {
      lateData = { error: `Late.dev returned status ${lateRes.status}` };
    }

    if (!lateRes.ok) {
      console.error("[social-publish] Late.dev publish error:", lateData);
      
      const errorMessage = lateData.error || `Late.dev returned status ${lateRes.status}`;
      const errorDetails = lateData.details ? `: ${JSON.stringify(lateData.details)}` : "";
      
      await supabase.from("social_posts").update({
        status: "failed",
        notes: `Late.dev error: ${errorMessage}${errorDetails}`
      }).eq("id", post_id);

      return new Response(JSON.stringify({
        error: errorMessage,
        details: lateData.details
      }), {
        status: lateRes.status >= 400 && lateRes.status < 600 ? lateRes.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latePostId = lateData.post?._id || lateData._id;
    const newStatus = publish_now ? "published" : "scheduled";

    await supabase.from("social_posts").update({
      late_post_id: latePostId, status: newStatus,
      ...(publish_now ? { published_at: new Date().toISOString() } : {}),
    }).eq("id", post_id);

    return new Response(JSON.stringify({ success: true, latePostId, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[social-publish] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});