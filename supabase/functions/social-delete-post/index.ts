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
        const { post_id, batch_id, post_ids } = body;

        if (!post_id && !batch_id && (!post_ids || !Array.isArray(post_ids))) {
            return new Response(JSON.stringify({ error: "post_id, batch_id or post_ids array is required" }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const LATE_API_KEY = Deno.env.get("LATE_API_KEY");
        let postsToDelete: any[] = [];

        if (batch_id) {
            // Find all posts in the batch
            console.log(`[social-delete-post] Deleting entire batch: ${batch_id}`);
            const { data: siblings, error: siblingsError } = await supabase
                .from("social_posts")
                .select("id, late_post_id")
                .ilike("notes", `%${batch_id}%`);

            if (siblingsError) throw siblingsError;
            postsToDelete = siblings || [];
        } else if (post_ids && Array.isArray(post_ids)) {
            // Bulk delete multiple IDs
            console.log(`[social-delete-post] Deleting ${post_ids.length} specific posts`);
            const { data: posts, error: postsError } = await supabase
                .from("social_posts")
                .select("id, late_post_id")
                .in("id", post_ids);
            
            if (postsError) throw postsError;
            postsToDelete = posts || [];
        } else {
            // Get single post
            const { data: post, error: postError } = await supabase
                .from("social_posts")
                .select("id, late_post_id")
                .eq("id", post_id)
                .single();

            if (postError || !post) {
                return new Response(JSON.stringify({ error: "Post not found" }), {
                    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
            postsToDelete = [post];
        }

        // Delete from Late.dev in parallel to avoid timeouts
        if (LATE_API_KEY) {
            const deletePromises = postsToDelete.flatMap(post => {
                if (!post.late_post_id) return [];
                const ids = post.late_post_id.split(',').filter(Boolean);
                return ids.map(async (lateId) => {
                    try {
                        console.log(`[social-delete-post] Deleting ${lateId} from Late.dev for post ${post.id}`);
                        const lateRes = await fetch(`${LATE_API_BASE}/posts/${lateId}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${LATE_API_KEY}` },
                        });

                        if (!lateRes.ok) {
                            const errorText = await lateRes.text();
                            console.error(`[social-delete-post] Failed to delete ${lateId} (status ${lateRes.status}):`, errorText);
                        } else {
                            console.log(`[social-delete-post] Deleted ${lateId} from Late.dev`);
                        }
                    } catch (err) {
                        console.error(`[social-delete-post] Network error deleting ${lateId}:`, err);
                    }
                });
            });

            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
            }
        }

        // Finally delete from Supabase
        if (batch_id) {
            const { error: deleteError } = await supabase
                .from("social_posts")
                .delete()
                .ilike("notes", `%${batch_id}%`);
            if (deleteError) throw deleteError;
        } else if (post_ids && Array.isArray(post_ids)) {
            const { error: deleteError } = await supabase
                .from("social_posts")
                .delete()
                .in("id", post_ids);
            if (deleteError) throw deleteError;
        } else {
            const { error: deleteError } = await supabase
                .from("social_posts")
                .delete()
                .eq("id", post_id);
            if (deleteError) throw deleteError;
        }

        return new Response(JSON.stringify({ success: true, count: postsToDelete.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (err: unknown) {
        console.error("[social-delete-post] error:", err);
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
