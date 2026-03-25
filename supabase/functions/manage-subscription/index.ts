import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionType = "get-portal-url" | "cancel" | "resume" | "change-plan";

interface RequestBody {
  action: ActionType;
  organizationId: string;
  newPlanType?: string; // For change-plan action
}

// Map plan types to LemonSqueezy variant IDs
function getVariantId(planType: string): string | undefined {
  const variantMap: Record<string, string> = {
    starter: Deno.env.get("LEMONSQUEEZY_VARIANT_ID_STARTER") || "",
    pro: Deno.env.get("LEMONSQUEEZY_VARIANT_ID_PRO") || "",
    agency: Deno.env.get("LEMONSQUEEZY_VARIANT_ID_AGENCY") || "",
  };
  return variantMap[planType];
}

// Map LemonSqueezy variant IDs back to plan types
function getPlanTypeFromVariant(variantId: string): string {
  const starterVariant = Deno.env.get("LEMONSQUEEZY_VARIANT_ID_STARTER");
  const proVariant = Deno.env.get("LEMONSQUEEZY_VARIANT_ID_PRO");
  const agencyVariant = Deno.env.get("LEMONSQUEEZY_VARIANT_ID_AGENCY");

  if (variantId === starterVariant) return "starter";
  if (variantId === proVariant) return "pro";
  if (variantId === agencyVariant) return "agency";
  return "starter"; // Default fallback
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LEMONSQUEEZY_API_KEY = Deno.env.get("LEMONSQUEEZY_API_KEY");
    if (!LEMONSQUEEZY_API_KEY) {
      throw new Error("LEMONSQUEEZY_API_KEY not configured");
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { action, organizationId, newPlanType } = body;

    console.log(`[manage-subscription] Action: ${action}, Org: ${organizationId}, User: ${user.id}`);

    if (!action || !organizationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: action, organizationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user belongs to the organization
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.organization_id !== organizationId) {
      return new Response(
        JSON.stringify({ error: "User does not belong to this organization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin
    if (profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can manage subscriptions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the subscription for this organization
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: "No subscription found for this organization" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lsSubscriptionId = subscription.lemonsqueezy_subscription_id;
    if (!lsSubscriptionId) {
      return new Response(
        JSON.stringify({ error: "No LemonSqueezy subscription ID found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle different actions
    switch (action) {
      case "get-portal-url": {
        // Fetch subscription from LemonSqueezy to get customer portal URL
        const lsResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
              Accept: "application/json",
            },
          }
        );

        if (!lsResponse.ok) {
          const errorData = await lsResponse.text();
          console.error("[manage-subscription] LemonSqueezy API error:", errorData);
          throw new Error("Failed to fetch subscription from LemonSqueezy");
        }

        const lsData = await lsResponse.json();
        const customerPortalUrl = lsData.data?.attributes?.urls?.customer_portal;
        const updatePaymentMethodUrl = lsData.data?.attributes?.urls?.update_payment_method;

        console.log("[manage-subscription] Portal URLs retrieved successfully");

        return new Response(
          JSON.stringify({
            success: true,
            customerPortalUrl,
            updatePaymentMethodUrl,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancel": {
        // Cancel the subscription at period end
        const lsResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: {
                type: "subscriptions",
                id: lsSubscriptionId,
                attributes: {
                  cancelled: true,
                },
              },
            }),
          }
        );

        if (!lsResponse.ok) {
          const errorData = await lsResponse.text();
          console.error("[manage-subscription] Cancel error:", errorData);
          throw new Error("Failed to cancel subscription");
        }

        // Update local database
        await supabaseClient
          .from("subscriptions")
          .update({ cancel_at_period_end: true })
          .eq("id", subscription.id);

        console.log("[manage-subscription] Subscription cancelled successfully");

        return new Response(
          JSON.stringify({ success: true, message: "Subscription will be cancelled at period end" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resume": {
        // Resume/uncancel the subscription
        // First, check if LS subscription exists and its current status
        // First, check the actual status in LemonSqueezy
        const getLsSub = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
          {
            headers: {
              Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
              Accept: "application/vnd.api+json",
            },
          }
        );

        if (getLsSub.ok) {
          const lsData = await getLsSub.json();
          const lsStatus = lsData.data.attributes.status;
          console.log(`[manage-subscription] Current LS status: ${lsStatus}`);
          
          if (lsStatus === 'expired') {
            return new Response(
              JSON.stringify({ error: "Sua assinatura já expirou no LemonSqueezy e não pode ser reativada. Por favor, assine novamente um plano." }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          if (lsStatus === 'active' && !lsData.data.attributes.cancelled) {
             // Already active and not cancelled, just update local db and return success
             await supabaseClient.from("subscriptions").update({ cancel_at_period_end: false, status: 'active' }).eq("id", subscription.id);
             return new Response(JSON.stringify({ success: true, message: "Subscription is already active" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }

        const lsResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
              Accept: "application/vnd.api+json",
              "Content-Type": "application/vnd.api+json",
            },
            body: JSON.stringify({
              data: {
                type: "subscriptions",
                id: lsSubscriptionId,
                attributes: {
                  cancelled: false,
                },
              },
            }),
          }
        );

        if (!lsResponse.ok) {
          const errorText = await lsResponse.text();
          console.error(`[manage-subscription] Resume error (status ${lsResponse.status}):`, errorText);
          
          let friendlyError = "Failed to resume subscription";
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.errors && errorJson.errors[0]) {
              friendlyError = errorJson.errors[0].detail || errorJson.errors[0].title || friendlyError;
            }
          } catch (e) { /* ignore */ }
          
          return new Response(
            JSON.stringify({ error: friendlyError, details: errorText }),
            { status: lsResponse.status || 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update local database
        // Also reset status to 'active' if it was cancelled/expired
        const { error: updateError } = await supabaseClient
          .from("subscriptions")
          .update({ 
            cancel_at_period_end: false,
            status: 'active', // Should become active if successfully resumed
            updated_at: new Date().toISOString()
          })
          .eq("id", subscription.id);

        if (updateError) {
          console.error("[manage-subscription] Error updating local db after resume:", updateError);
        }

        console.log("[manage-subscription] Subscription resumed successfully");

        return new Response(
          JSON.stringify({ success: true, message: "Subscription resumed successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "change-plan": {
        if (!newPlanType) {
          return new Response(
            JSON.stringify({ error: "newPlanType is required for change-plan action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const newVariantId = getVariantId(newPlanType);
        if (!newVariantId) {
          return new Response(
            JSON.stringify({ error: `Invalid plan type: ${newPlanType}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Change the subscription plan via LemonSqueezy API
        const lsResponse = await fetch(
          `https://api.lemonsqueezy.com/v1/subscriptions/${lsSubscriptionId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${LEMONSQUEEZY_API_KEY}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: {
                type: "subscriptions",
                id: lsSubscriptionId,
                attributes: {
                  variant_id: parseInt(newVariantId, 10),
                },
              },
            }),
          }
        );

        if (!lsResponse.ok) {
          const errorData = await lsResponse.text();
          console.error("[manage-subscription] Change plan error:", errorData);
          throw new Error("Failed to change subscription plan");
        }

        const lsData = await lsResponse.json();
        const updatedVariantId = lsData.data?.attributes?.variant_id?.toString();
        const updatedPlanType = updatedVariantId ? getPlanTypeFromVariant(updatedVariantId) : newPlanType;

        // Update local database
        await supabaseClient
          .from("subscriptions")
          .update({ 
            lemonsqueezy_variant_id: updatedVariantId || newVariantId,
          })
          .eq("id", subscription.id);

        await supabaseClient
          .from("organizations")
          .update({ plan_type: updatedPlanType })
          .eq("id", organizationId);

        console.log(`[manage-subscription] Plan changed to ${updatedPlanType} successfully`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Plan changed to ${updatedPlanType} successfully`,
            newPlanType: updatedPlanType,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("[manage-subscription] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

serve(handler);
