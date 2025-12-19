import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const CheckoutRequestSchema = z.object({
  organizationId: z.string().uuid("ID da organização inválido"),
  planType: z.enum(["starter", "pro", "agency"]),
  userEmail: z.string().email("Email inválido").max(255, "Email muito longo").optional(),
  userName: z.string().max(100, "Nome muito longo").optional(),
});

// Get variant ID based on plan type
const getVariantId = (planType: string): string | undefined => {
  const normalizeId = (v?: string | null) => v?.trim().replace(/^["']+|["']+$/g, "");

  const variants: Record<string, string | undefined> = {
    starter: normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID_STARTER")),
    pro: normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID_PRO")),
    agency: normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID_AGENCY")),
  };

  // Fallback to default LEMONSQUEEZY_VARIANT_ID if specific variant not found
  return variants[planType] || normalizeId(Deno.env.get("LEMONSQUEEZY_VARIANT_ID"));
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const normalizeId = (v?: string | null) => v?.trim().replace(/^["']+|["']+$/g, "");

    const apiKey = (Deno.env.get("LEMONSQUEEZY_API_KEY") ?? "").trim();
    const storeId = normalizeId(Deno.env.get("LEMONSQUEEZY_STORE_ID"));

    // Force test mode by default (per your request).
    // If you ever need to go live, set LEMONSQUEEZY_TEST_MODE="false".
    const testModeEnv = (Deno.env.get("LEMONSQUEEZY_TEST_MODE") ?? "").trim().toLowerCase();
    const testMode = testModeEnv !== "false";

    if (!apiKey || !storeId) {
      console.error("Missing LemonSqueezy configuration", {
        hasApiKey: Boolean(apiKey),
        storeId,
      });
      return new Response(JSON.stringify({ error: "Payment system not configured" }), {
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

    // Verify the user's JWT
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

    const body = await req.json();

    // Validate input with Zod
    const validationResult = CheckoutRequestSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Dados inválidos",
          details: validationResult.error.errors.map((e) => e.message),
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const { organizationId, planType, userEmail, userName } = validationResult.data;

    // Get the correct variant ID for the plan
    const variantId = getVariantId(planType);

    if (!variantId) {
      console.error("No variant ID found for plan:", planType);
      return new Response(JSON.stringify({ error: "Plano não encontrado" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify user belongs to this organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.organization_id !== organizationId) {
      return new Response(JSON.stringify({ error: "Access denied to this organization" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get the origin for redirect URL
    const origin = req.headers.get("origin") || "https://qualify.onixagence.com";
    const redirectUrl = `${origin}/app/onboarding?success=true`;

    console.log("Creating checkout", {
      organizationId,
      planType,
      storeId,
      variantId,
      testMode,
      userId: user.id,
      redirectUrl,
    });

    // Create checkout session with LemonSqueezy API
    const checkoutResponse = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            test_mode: testMode,
            checkout_data: {
              email: userEmail || user.email,
              name: userName,
              custom: {
                organization_id: organizationId,
                user_id: user.id,
                plan_type: planType,
              },
            },
            product_options: {
              redirect_url: redirectUrl,
            },
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: storeId,
              },
            },
            variant: {
              data: {
                type: "variants",
                id: variantId,
              },
            },
          },
        },
      }),
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error("LemonSqueezy API error:", {
        status: checkoutResponse.status,
        body: errorText,
      });

      return new Response(
        JSON.stringify({
          error: "Failed to create checkout session",
          lemonsqueezy_status: checkoutResponse.status,
          lemonsqueezy_error: errorText,
          context: {
            planType,
            storeId,
            variantId,
            testMode,
          },
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const checkoutData = await checkoutResponse.json();
    const checkoutUrl = checkoutData.data?.attributes?.url;

    if (!checkoutUrl) {
      console.error("No checkout URL in response:", checkoutData);
      return new Response(
        JSON.stringify({ error: "Invalid checkout response" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Checkout URL created:", checkoutUrl);

    return new Response(
      JSON.stringify({ checkoutUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-checkout function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
