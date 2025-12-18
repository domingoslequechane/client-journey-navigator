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

    // Verify signature
    if (signature) {
      const isValid = await verifySignature(payload, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const event = JSON.parse(payload);
    const eventName = event.meta?.event_name;
    const customData = event.meta?.custom_data;
    const subscriptionData = event.data?.attributes;

    console.log("Processing event:", eventName);
    console.log("Custom data:", JSON.stringify(customData));

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract organization_id from custom_data
    const organizationId = customData?.organization_id;

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
        console.log("Creating subscription for organization:", organizationId);
        
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            organization_id: organizationId,
            lemonsqueezy_subscription_id: String(event.data.id),
            lemonsqueezy_customer_id: String(subscriptionData.customer_id),
            lemonsqueezy_order_id: String(subscriptionData.order_id),
            lemonsqueezy_product_id: String(subscriptionData.product_id),
            lemonsqueezy_variant_id: String(subscriptionData.variant_id),
            status: mapStatus(subscriptionData.status),
            current_period_start: subscriptionData.renews_at ? new Date(subscriptionData.created_at).toISOString() : null,
            current_period_end: subscriptionData.renews_at ? new Date(subscriptionData.renews_at).toISOString() : null,
            cancel_at_period_end: subscriptionData.cancelled || false,
          }, {
            onConflict: 'organization_id'
          });

        if (error) {
          console.error("Error creating subscription:", error);
          throw error;
        }
        
        console.log("Subscription created successfully");
        break;
      }

      case 'subscription_updated': {
        console.log("Updating subscription for organization:", organizationId);
        
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: mapStatus(subscriptionData.status),
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
        
        console.log("Subscription updated successfully");
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
        
        console.log("Subscription cancelled successfully");
        break;
      }

      case 'subscription_resumed': {
        console.log("Resuming subscription for organization:", organizationId);
        
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
        
        console.log("Subscription resumed successfully");
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
        
        console.log("Subscription expired successfully");
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

        // Record payment in history
        const amount = subscriptionData?.first_subscription_item?.price || 700; // Default to $7 in cents
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

        // Record failed payment in history
        const amount = subscriptionData?.first_subscription_item?.price || 700; // Default to $7 in cents
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            organization_id: organizationId,
            amount: amount / 100,
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
