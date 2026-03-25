import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map variant IDs to plan types
function getPlanTypeFromVariantId(variantId: string): string {
  const variantIdStarter = Deno.env.get('LEMONSQUEEZY_VARIANT_ID_STARTER');
  const variantIdPro = Deno.env.get('LEMONSQUEEZY_VARIANT_ID_PRO');
  const variantIdAgency = Deno.env.get('LEMONSQUEEZY_VARIANT_ID_AGENCY');
  
  if (variantId === variantIdStarter) return 'starter';
  if (variantId === variantIdPro) return 'pro';
  if (variantId === variantIdAgency) return 'agency';
  return 'free';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lemonsqueezyApiKey = Deno.env.get('LEMONSQUEEZY_API_KEY');

    if (!lemonsqueezyApiKey) {
      throw new Error('LEMONSQUEEZY_API_KEY not configured');
    }

    // Get auth token and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organizationId } = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'organizationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user belongs to organization
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.organization_id !== organizationId) {
      return new Response(JSON.stringify({ error: 'User does not belong to this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing subscription from our database
    const { data: existingSub } = await supabaseClient
      .from('subscriptions')
      .select('lemonsqueezy_subscription_id, lemonsqueezy_customer_id')
      .eq('organization_id', organizationId)
      .single();

    console.log('Existing subscription:', existingSub);

    let subscriptionData = null;

    // If we have a subscription ID, fetch directly from LemonSqueezy
    if (existingSub?.lemonsqueezy_subscription_id) {
      console.log('Fetching subscription from LemonSqueezy:', existingSub.lemonsqueezy_subscription_id);
      
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions/${existingSub.lemonsqueezy_subscription_id}`,
        {
          headers: {
            'Authorization': `Bearer ${lemonsqueezyApiKey}`,
            'Accept': 'application/vnd.api+json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        subscriptionData = data.data;
        console.log('LemonSqueezy subscription data:', subscriptionData);
      } else {
        console.error('Failed to fetch subscription from LemonSqueezy:', await response.text());
      }
    }

    // If we have a customer ID, search for subscriptions by customer
    if (!subscriptionData && existingSub?.lemonsqueezy_customer_id) {
      console.log('Searching subscriptions by customer:', existingSub.lemonsqueezy_customer_id);
      
      const response = await fetch(
        `https://api.lemonsqueezy.com/v1/subscriptions?filter[customer_id]=${existingSub.lemonsqueezy_customer_id}`,
        {
          headers: {
            'Authorization': `Bearer ${lemonsqueezyApiKey}`,
            'Accept': 'application/vnd.api+json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          // Get the most recent subscription
          subscriptionData = data.data.sort((a: any, b: any) => 
            new Date(b.attributes.created_at).getTime() - new Date(a.attributes.created_at).getTime()
          )[0];
          console.log('Found subscription by customer:', subscriptionData);
        }
      }
    }

    // Search subscriptions by user email as last resort
    if (!subscriptionData) {
      console.log('Searching subscriptions by user email:', user.email);
      
      // First get all stores to find customers
      const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID');
      const customersResponse = await fetch(
        `https://api.lemonsqueezy.com/v1/customers?filter[store_id]=${storeId}&filter[email]=${user.email}`,
        {
          headers: {
            'Authorization': `Bearer ${lemonsqueezyApiKey}`,
            'Accept': 'application/vnd.api+json',
          },
        }
      );

      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        console.log('Found customers:', customersData.data?.length);

        if (customersData.data && customersData.data.length > 0) {
          const customerId = customersData.data[0].id;
          
          // Now get subscriptions for this customer
          const subsResponse = await fetch(
            `https://api.lemonsqueezy.com/v1/subscriptions?filter[customer_id]=${customerId}`,
            {
              headers: {
                'Authorization': `Bearer ${lemonsqueezyApiKey}`,
                'Accept': 'application/vnd.api+json',
              },
            }
          );

          if (subsResponse.ok) {
            const subsData = await subsResponse.json();
            if (subsData.data && subsData.data.length > 0) {
              subscriptionData = subsData.data.sort((a: any, b: any) => 
                new Date(b.attributes.created_at).getTime() - new Date(a.attributes.created_at).getTime()
              )[0];
              console.log('Found subscription by email:', subscriptionData);
            }
          }
        }
      }
    }

    if (!subscriptionData) {
      return new Response(JSON.stringify({ 
        error: 'No subscription found in LemonSqueezy',
        synced: false 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract subscription details
    const attrs = subscriptionData.attributes;
    const variantId = String(attrs.variant_id);
    const planType = getPlanTypeFromVariantId(variantId);
    
    // Map LemonSqueezy status to our status
    let status = 'active';
    if (attrs.status === 'on_trial') status = 'trialing';
    else if (attrs.status === 'active') status = 'active';
    else if (attrs.status === 'past_due') status = 'past_due';
    else if (attrs.status === 'cancelled') status = 'cancelled';
    else if (attrs.status === 'expired') status = 'expired';
    else if (attrs.status === 'on_hold') status = 'past_due';
    else if (attrs.status === 'unpaid') status = 'past_due';

    console.log('Updating subscription - planType:', planType, 'status:', status);
    
    // Determine current period start and end
    // LemonSqueezy status 'cancelled' or 'expired' might have renwes_at = null, but they have ends_at
      const portalUrl = subscriptionData.attributes.urls?.customer_portal;
      
      console.log(`[sync-subscription] Found subscription: ${subscriptionData.id}, mapping status: ${attrs.status} -> ${status}`);
      console.log(`[sync-subscription] Portal URL: ${portalUrl}`);

      const { error: subError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          organization_id: organizationId,
          lemonsqueezy_subscription_id: String(subscriptionData.id),
          lemonsqueezy_customer_id: String(attrs.customer_id),
          lemonsqueezy_order_id: String(attrs.order_id),
          lemonsqueezy_product_id: String(attrs.product_id),
          lemonsqueezy_variant_id: String(attrs.variant_id),
          status: status,
          current_period_start: (attrs.renews_at || attrs.ends_at) ? new Date(attrs.created_at).toISOString() : null,
          current_period_end: (attrs.renews_at || attrs.ends_at) ? new Date(attrs.renews_at || attrs.ends_at).toISOString() : null,
          cancel_at_period_end: attrs.cancelled || (status === 'cancelled' || status === 'expired'),
          lemonsqueezy_customer_portal_url: portalUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id'
        });

    if (subError) {
      console.error('Error upserting subscription:', subError);
      throw subError;
    }

    // Update organization plan type
    const { error: orgError } = await supabaseClient
      .from('organizations')
      .update({ plan_type: planType, updated_at: new Date().toISOString() })
      .eq('id', organizationId);

    if (orgError) {
      console.error('Error updating organization:', orgError);
      throw orgError;
    }

    console.log('Sync complete - organization updated to plan:', planType);

    return new Response(JSON.stringify({ 
      success: true,
      synced: true,
      planType,
      status,
      subscriptionId: subscriptionData.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Sync subscription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync subscription';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      synced: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
