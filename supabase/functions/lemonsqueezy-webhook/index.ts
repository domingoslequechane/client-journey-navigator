import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

// Verify webhook signature from LemonSqueezy
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    const signatureBuffer = new Uint8Array(
      signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      encoder.encode(payload)
    );
    
    return isValid;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Plan prices in cents
const PLAN_PRICES: Record<string, number> = {
  starter: 500,  // $5
  pro: 1200,     // $12
  agency: 3000   // $30
};

// Get plan type from variant ID
const getPlanTypeFromVariant = (variantId: string): string => {
  const normalizeId = (v?: string | null) =>
    v?.trim().replace(/^["']+|["']+$/g, "");
    
  const starterVariant = normalizeId(Deno.env.get('LEMONSQUEEZY_VARIANT_ID_STARTER'));
  const proVariant = normalizeId(Deno.env.get('LEMONSQUEEZY_VARIANT_ID_PRO'));
  const agencyVariant = normalizeId(Deno.env.get('LEMONSQUEEZY_VARIANT_ID_AGENCY'));
  
  const normalizedVariantId = normalizeId(variantId);
  
  console.log("Mapping variant ID to plan:", { 
    variantId: normalizedVariantId, 
    starterVariant, 
    proVariant, 
    agencyVariant 
  });
  
  if (normalizedVariantId === starterVariant) return 'starter';
  if (normalizedVariantId === proVariant) return 'pro';
  if (normalizedVariantId === agencyVariant) return 'agency';
  
  // Default to starter if no match
  return 'starter';
};

// Get payment amount from LemonSqueezy data or fallback to plan prices
const getPaymentAmount = (subscriptionData: any, planType: string): number => {
  // Try different paths where LemonSqueezy might send the price
  const possiblePrices = [
    subscriptionData?.first_subscription_item?.price,
    subscriptionData?.first_order_item?.price,
    subscriptionData?.total,
    subscriptionData?.subtotal,
  ];
  
  for (const price of possiblePrices) {
    if (price && typeof price === 'number' && price > 0) {
      console.log("Using price from LemonSqueezy:", price);
      return price;
    }
  }
  
  // Fallback: use the price based on plan_type
  const fallbackPrice = PLAN_PRICES[planType] || PLAN_PRICES.starter;
  console.log("Using fallback price for plan", planType, ":", fallbackPrice);
  return fallbackPrice;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!webhookSecret) {
      console.error("LEMONSQUEEZY_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const signature = req.headers.get('x-signature');
    const payload = await req.text();

    console.log("Received webhook, event signature present:", !!signature);

    // Verify signature - MANDATORY for security
    if (!signature) {
      console.error("Missing webhook signature - rejecting request");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isValid = await verifySignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error("Invalid webhook signature - rejecting request");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Webhook signature verified successfully");

    const event = JSON.parse(payload);
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data;
    const subscriptionData = event.data?.attributes;

    console.log("Processing event:", eventName);
    console.log("Custom data:", JSON.stringify(customData));
    console.log("Subscription status:", subscriptionData?.status);
    console.log("Variant ID:", subscriptionData?.variant_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract organization_id from custom_data
    const organizationId = customData?.organization_id;
    
    // Get plan_type from custom_data or variant_id
    const planType = customData?.plan_type || 
      (subscriptionData?.variant_id ? getPlanTypeFromVariant(String(subscriptionData.variant_id)) : 'starter');

    if (!organizationId) {
      console.error("No organization_id in custom_data");
      return new Response(JSON.stringify({ error: "Missing organization_id" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map LemonSqueezy status to our subscription_status enum
    const mapStatus = (lsStatus: string): string => {
      const statusMap: Record<string, string> = {
        'active': 'active',
        'on_trial': 'trialing',
        'past_due': 'past_due',
        'cancelled': 'cancelled',
        'expired': 'expired',
        'unpaid': 'past_due',
        'paused': 'cancelled',
      };
      return statusMap[lsStatus] || 'active';
    };

    switch (eventName) {
      case 'subscription_created': {
        console.log("Creating subscription for organization:", organizationId, "with plan:", planType);
        
        const status = mapStatus(subscriptionData.status);
        const isOnTrial = subscriptionData.status === 'on_trial';
        
        // Calculate trial end date based on LemonSqueezy data
        let trialEndsAt: string | null = null;
        if (isOnTrial && subscriptionData.trial_ends_at) {
          trialEndsAt = new Date(subscriptionData.trial_ends_at).toISOString();
        } else if (isOnTrial && subscriptionData.renews_at) {
          trialEndsAt = new Date(subscriptionData.renews_at).toISOString();
        }
        
        // Update organization's trial_ends_at and plan_type
        const { error: orgError } = await supabase
          .from('organizations')
          .update({ 
            trial_ends_at: trialEndsAt || undefined,
            plan_type: planType
          })
          .eq('id', organizationId);
        
        if (orgError) {
          console.error("Error updating organization:", orgError);
        } else {
          console.log("Updated organization plan_type:", planType);
        }
        
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            organization_id: organizationId,
            lemonsqueezy_subscription_id: String(event.data.id),
            lemonsqueezy_customer_id: String(subscriptionData.customer_id),
            lemonsqueezy_order_id: String(subscriptionData.order_id),
            lemonsqueezy_product_id: String(subscriptionData.product_id),
            lemonsqueezy_variant_id: String(subscriptionData.variant_id),
            status: status,
            current_period_start: subscriptionData.renews_at ? new Date(subscriptionData.created_at).toISOString() : null,
            current_period_end: subscriptionData.renews_at ? new Date(subscriptionData.renews_at).toISOString() : null,
            cancel_at_period_end: subscriptionData.cancelled || false,
            lemonsqueezy_customer_portal_url: subscriptionData.urls?.customer_portal,
          }, {
            onConflict: 'organization_id'
          });

        if (error) {
          console.error("Error creating subscription:", error);
          throw error;
        }
        
        console.log("Subscription created successfully with status:", status, "and plan:", planType);
        break;
      }

      case 'subscription_updated': {
        console.log("Updating subscription for organization:", organizationId);
        
        const status = mapStatus(subscriptionData.status);
        
        // If transitioning from trial to active, update trial_ends_at to now
        if (subscriptionData.status === 'active') {
          const { data: currentSub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('organization_id', organizationId)
            .single();
          
          if (currentSub?.status === 'trialing') {
            console.log("Trial ended, subscription now active");
          }
        }
        
        // Update plan_type if variant changed
        const newPlanType = getPlanTypeFromVariant(String(subscriptionData.variant_id));
        const { error: orgError } = await supabase
          .from('organizations')
          .update({ plan_type: newPlanType })
          .eq('id', organizationId);
        
        if (orgError) {
          console.error("Error updating organization plan_type:", orgError);
        }
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: status,
            lemonsqueezy_variant_id: String(subscriptionData.variant_id),
            current_period_start: subscriptionData.renews_at ? new Date(subscriptionData.created_at).toISOString() : null,
            current_period_end: subscriptionData.renews_at ? new Date(subscriptionData.renews_at).toISOString() : null,
            cancel_at_period_end: subscriptionData.cancelled || false,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);

        if (error) {
          console.error("Error updating subscription:", error);
          throw error;
        }
        
        console.log("Subscription updated successfully with plan:", newPlanType);
        break;
      }

      case 'subscription_cancelled': {
        console.log("Cancelling subscription for organization:", organizationId);
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);

        if (error) {
          console.error("Error cancelling subscription:", error);
          throw error;
        }
        
        // Keep current plan_type but access is blocked via subscription status
        console.log("Subscription cancelled, access will end at period end");
        break;
      }

      case 'subscription_resumed': {
        console.log("Resuming subscription for organization:", organizationId);
        
        // Get plan type from variant
        const resumedPlanType = getPlanTypeFromVariant(String(subscriptionData.variant_id));
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);

        if (error) {
          console.error("Error resuming subscription:", error);
          throw error;
        }
        
        // Restore plan type
        await supabase
          .from('organizations')
          .update({ plan_type: resumedPlanType })
          .eq('id', organizationId);
        
        console.log("Subscription resumed with plan:", resumedPlanType);
        break;
      }

      case 'subscription_expired': {
        console.log("Expiring subscription for organization:", organizationId);
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);

        if (error) {
          console.error("Error expiring subscription:", error);
          throw error;
        }
        
        // Keep current plan_type but access is blocked via subscription status
        console.log("Subscription expired, access blocked via status");
        break;
      }

      case 'subscription_payment_success': {
        console.log("Payment success for organization:", organizationId);
        
        // Update subscription to active if it was past_due
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
          .eq('status', 'past_due');

        if (error) {
          console.error("Error updating subscription after payment:", error);
        }

        // Record payment in history with correct amount based on plan
        const amount = getPaymentAmount(subscriptionData, planType);
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            organization_id: organizationId,
            amount: amount / 100, // Convert from cents to dollars
            currency: 'USD',
            status: 'confirmed',
            payment_date: new Date().toISOString(),
            lemonsqueezy_order_id: String(subscriptionData?.order_id || ''),
            description: 'Assinatura mensal Qualify',
          });

        if (paymentError) {
          console.error("Error recording payment:", paymentError);
        }
        
        console.log("Payment processed successfully");
        break;
      }

      case 'subscription_payment_failed': {
        console.log("Payment failed for organization:", organizationId);
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId);

        if (error) {
          console.error("Error updating subscription after failed payment:", error);
        }

        // Record failed payment in history with correct amount based on plan
        const failedAmount = getPaymentAmount(subscriptionData, planType);
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            organization_id: organizationId,
            amount: failedAmount / 100,
            currency: 'USD',
            status: 'failed',
            payment_date: new Date().toISOString(),
            lemonsqueezy_order_id: String(subscriptionData?.order_id || ''),
            description: 'Assinatura mensal Qualify - Falha no pagamento',
          });

        if (paymentError) {
          console.error("Error recording failed payment:", paymentError);
        }
        
        console.log("Payment failure recorded");
        break;
      }

      default:
        console.log("Unhandled event type:", eventName);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
