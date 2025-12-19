import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type StoreSummary = {
  id: string;
  name?: string;
  slug?: string;
  test_mode?: boolean;
};

const normalizeId = (v?: string | null) => v?.trim().replace(/^["']+|["']+$/g, "");

const pickStore = (store: any): StoreSummary => ({
  id: String(store?.id ?? ""),
  name: store?.attributes?.name,
  slug: store?.attributes?.slug,
  test_mode: store?.attributes?.test_mode,
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = (Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "").trim();
    const storeId = normalizeId(Deno.env.get("LEMONSQUEEZY_STORE_ID"));

    const configuredVariants = {
      default: normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID")),
      starter: normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID_STARTER")),
      pro: normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID_PRO")),
      agency: normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID_AGENCY")),
    };

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LEMONSQUEEZY_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Admin-only (matches your app rule: only admins manage billing)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("LemonSqueezy diagnostics: fetching stores", {
      configuredStoreId: storeId,
      configuredVariants,
      userId: user.id,
    });

    const storesRes = await fetch("https://api.lemonsqueezy.com/v1/stores", {
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const storesText = await storesRes.text();
    let storesJson: any = null;
    try {
      storesJson = JSON.parse(storesText);
    } catch {
      // ignore
    }

    if (!storesRes.ok) {
      console.error("LemonSqueezy diagnostics: failed to list stores", {
        status: storesRes.status,
        body: storesText,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to list LemonSqueezy stores",
          lemonsqueezy_status: storesRes.status,
          lemonsqueezy_error: storesText,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const stores: StoreSummary[] = Array.isArray(storesJson?.data)
      ? storesJson.data.map(pickStore)
      : [];

    const storeIdValid = !!storeId && stores.some((s) => s.id === storeId);

    return new Response(
      JSON.stringify({
        configured: {
          storeId: storeId ?? null,
          variants: configuredVariants,
        },
        storeIdValid,
        stores,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in lemonsqueezy-diagnostics function:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
