import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";

const LATE_API_BASE = "https://getlate.dev/api/v1";

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

        const body = await req.json();
        const { post_id } = body;

        if (!post_id) {
            return new Response(JSON.stringify({ error: "post_id is required" }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Get the post to find late_post_id
        const { data: post, error: postError } = await supabase
            .from("social_posts")
            .select("late_post_id, organization_id")
            .eq("id", post_id)
            .single();

        if (postError || !post) {
            return new Response(JSON.stringify({ error: "Post not found" }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const LATE_API_KEY = Deno.env.get("LATE_API_KEY");
        if (post.late_post_id && LATE_API_KEY) {
            const ids = post.late_post_id.split(',').filter(Boolean);
            console.log(`[social-delete-post] Deleting ${ids.length} parts from Late.dev for post ${post_id}`);

            for (const lateId of ids) {
                try {
                    const lateRes = await fetch(`${LATE_API_BASE}/posts/${lateId}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${LATE_API_KEY}` },
                    });

                    if (!lateRes.ok) {
                        const errorData = await lateRes.json().catch(() => ({}));
                        console.error(`[social-delete-post] Failed to delete ${lateId} from Late.dev:`, errorData);
                    } else {
                        console.log(`[social-delete-post] Deleted ${lateId} from Late.dev`);
                    }
                } catch (err) {
                    console.error(`[social-delete-post] Network error deleting ${lateId}:`, err);
                }
            }
        }

        // Finally delete from Supabase
        const { error: deleteError } = await supabase
            .from("social_posts")
            .delete()
            .eq("id", post_id);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: unknown) {
        console.error("[social-delete-post] error:", err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
