import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const LATE_API_BASE = "https://getlate.dev/api/v1";

const getPlatformContentType = (platform: string, internalContentType: string, mediaUrls: string[] = []): string => {
  const isVideo = mediaUrls.some(url =>
    /\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video')
  );

  // 1. Stories
  if (internalContentType === 'stories') {
    if (platform === 'facebook' || platform === 'instagram') return 'story';
    // Fallback for others - most don't support stories via API
    return isVideo ? 'video' : 'image';
  }

  // 2. Reels / Shorts / TikTok
  if (internalContentType === 'reels') {
    if (platform === 'facebook') return 'reel';
    if (platform === 'youtube' || platform === 'tiktok' || platform === 'instagram') return 'reels';
    return isVideo ? 'video' : 'image';
  }

  // 3. Carousel
  if (internalContentType === 'carousel') return 'carousel';

  // 4. Feed/default
  return isVideo ? 'video' : 'image';
};

const isPlatformCompatible = (platform: string, contentType: string): boolean => {
  const compatibility: Record<string, string[]> = {
    instagram: ['feed', 'stories', 'reels', 'carousel', 'image', 'video'],
    facebook: ['feed', 'stories', 'reels', 'carousel', 'image', 'video', 'reel'],
    tiktok: ['reels', 'video'],
    youtube: ['reels', 'video'],
    linkedin: ['feed', 'carousel', 'image', 'video'],
    twitter: ['feed', 'image', 'video'],
    googlebusiness: ['feed', 'image'],
    pinterest: ['feed', 'carousel', 'image'],
    threads: ['feed', 'image', 'video']
  };

  const allowed = compatibility[platform] || ['feed', 'image', 'video'];
  return allowed.includes(contentType);
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
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid or empty request body" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { post_id, publish_now, replace_late_post_id } = body;
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id is required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("current_organization_id").eq("id", user.id).maybeSingle();

    if (profileError) {
      console.error("[social-publish] Profile fetch error:", profileError);
      return new Response(JSON.stringify({ error: `Erro ao buscar perfil: ${profileError.message}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile?.current_organization_id) {
      return new Response(JSON.stringify({ error: "No organization found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.current_organization_id;
    const LATE_API_KEY = Deno.env.get("LATE_API_KEY");

    if (!LATE_API_KEY) {
      return new Response(JSON.stringify({ error: "LATE_API_KEY not configured in Supabase secrets" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle replacement: delete old posts from Late.dev if provided
    if (replace_late_post_id && LATE_API_KEY) {
      const idsToDelete = replace_late_post_id.split(',').filter(Boolean);
      console.log(`[social-publish] Replacing post: Deleting ${idsToDelete.length} parts from Late.dev`);
      for (const lateId of idsToDelete) {
        try {
          const lateRes = await fetch(`${LATE_API_BASE}/posts/${lateId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${LATE_API_KEY}` },
          });
          if (!lateRes.ok) {
            console.warn(`[social-publish] Failed to delete old part ${lateId} (status ${lateRes.status})`);
          }
        } catch (err) {
          console.error(`[social-publish] Network error deleting old part ${lateId}:`, err);
        }
      }
    }

    const { data: post, error: postError } = await supabase
      .from("social_posts").select("*").eq("id", post_id).eq("organization_id", orgId).maybeSingle();

    if (postError) {
      console.error("[social-publish] Post fetch error:", postError);
      return new Response(JSON.stringify({ error: `Erro ao buscar postagem: ${postError.message}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountQuery = supabase
      .from("social_accounts").select("*").eq("organization_id", orgId)
      .eq("is_connected", true).in("platform", post.platforms || []);

    if (post.client_id) accountQuery.eq("client_id", post.client_id);

    const { data: accounts } = await accountQuery;

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ error: "No connected accounts for selected platforms" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare content with CTA if needed
    let finalContent = post.content;
    if (post.cta_type === 'whatsapp' && post.cta_value) {
      const whatsappLink = `https://wa.me/${post.cta_value.replace(/\D/g, '')}`;
      finalContent += `\n\nFale conosco pelo WhatsApp: ${whatsappLink}`;
    }

    const platforms = accounts
      .filter((a: any) => {
        if (!a.late_account_id) return false;
        // Check compatibility
        return isPlatformCompatible(a.platform, post.content_type);
      })
      .map((a: any) => {
        const platform = a.platform;
        const contentType = getPlatformContentType(platform, post.content_type, post.media_urls || []);

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
        if (platform === 'facebook') {
          if (contentType === 'reel') {
            platformSpecificData.title = post.content?.split('\n')[0]?.substring(0, 100) || "New Reel";
          }
          // Only set pageId if we have a specific facebook_page_id stored in the db
          if (a.facebook_page_id) {
            platformSpecificData.pageId = a.facebook_page_id;
          }
        }

        return {
          platform,
          accountId: a.late_account_id,
          platformSpecificData
        };
      });

    if (platforms.length === 0) {
      return new Response(JSON.stringify({ error: "No Late.dev connected accounts found." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latePayload: any = {
      content: finalContent,
      platforms,
      timezone: "UTC" // Force UTC to match DB timestamps without Z
    };

    if (publish_now) {
      latePayload.publishNow = true;
    } else if (post.scheduled_at) {
      // Parse ISO string and remove the Z/milliseconds for Late API format
      const d = new Date(post.scheduled_at);
      latePayload.scheduledFor = d.toISOString().split('.')[0];
    } else {
      latePayload.publishNow = true;
    }

    console.log(`[social-publish] Final Late.dev Payload:`, JSON.stringify(latePayload));

    const isMultiStory = post.content_type === 'stories' && post.media_urls && post.media_urls.length > 1;
    const mediaToProcess = isMultiStory
      ? post.media_urls.map((url: string) => [url])
      : [post.media_urls || []];

    const results = [];
    let lastError = null;

    for (const currentMediaUrls of mediaToProcess) {
      const currentLatePayload = { ...latePayload };

      if (currentMediaUrls.length > 0) {
        currentLatePayload.mediaItems = currentMediaUrls.map((url: string) => {
          const isVideo = /\.(mp4|mov|avi|webm|m4v)$/i.test(url) || url.includes('video');
          return { type: isVideo ? "video" : "image", url };
        });
      }

      console.log(`[social-publish] Publishing ${isMultiStory ? 'story slide' : 'post'} to Late.dev`);
      console.log(`[social-publish] Payload:`, JSON.stringify(currentLatePayload));

      const lateRes = await fetch(`${LATE_API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LATE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(currentLatePayload),
      });

      const lateText = await lateRes.text();
      let lateData: any = {};
      try {
        lateData = lateText ? JSON.parse(lateText) : {};
        console.log(`[social-publish] Late.dev response (Status ${lateRes.status}):`, lateText);
      } catch {
        console.warn(`[social-publish] Late.dev response not JSON (Status ${lateRes.status}):`, lateText);
        lateData = { error: `Late.dev returned status ${lateRes.status}`, raw: lateText };
      }

      if (!lateRes.ok) {
        console.error("[social-publish] Late.dev publish error:", lateData);
        lastError = lateData;
        if (!isMultiStory) break; // If not multi-story, stop on first error
      } else {
        const resultId = lateData.post?._id || lateData._id || (lateData.data?.post?._id);
        if (resultId) {
          results.push(resultId);
        } else {
          console.error("[social-publish] Late.dev returned 200 OK but NO ID found in response:", lateData);
          lastError = { error: "No post ID returned from Late.dev", details: lateData };
          if (!isMultiStory) break;
        }
      }
    }

    if (results.length === 0 && lastError) {
      const errorMessage = lastError.error || "Late.dev publication failed";
      const errorDetails = lastError.details ? `: ${JSON.stringify(lastError.details)}` : "";

      await supabase.from("social_posts").update({
        status: "failed",
        notes: `Late.dev error: ${errorMessage}${errorDetails}`
      }).eq("id", post_id);

      return new Response(JSON.stringify({
        error: errorMessage,
        details: lastError.details
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latePostId = results.join(',');
    const newStatus = publish_now ? "published" : "scheduled";

    await supabase.from("social_posts").update({
      late_post_id: latePostId, status: newStatus,
      ...(publish_now ? { published_at: new Date().toISOString() } : {}),
      notes: results.length < mediaToProcess.length ? `${results.length}/${mediaToProcess.length} slides publicados.` : null
    }).eq("id", post_id);

    return new Response(JSON.stringify({ success: true, latePostId, status: newStatus, publishedCount: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("[social-publish] error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});