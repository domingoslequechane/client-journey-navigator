import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting trial expiry check...");

    // Get organizations where:
    // 1. trial_ends_at has passed
    // 2. plan_type is not 'free' (still on trial plan)
    const now = new Date().toISOString();
    
    const { data: expiredOrgs, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, plan_type, trial_ends_at')
      .lt('trial_ends_at', now)
      .neq('plan_type', 'free');

    if (fetchError) {
      console.error("Error fetching expired trials:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredOrgs?.length || 0} organizations with expired trials`);

    let downgradedCount = 0;
    let skippedCount = 0;

    for (const org of expiredOrgs || []) {
      // Check if organization has an active subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('organization_id', org.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error(`Error checking subscription for org ${org.id}:`, subError);
        continue;
      }

      // If there's an active or past_due subscription, skip downgrade
      if (subscription && (subscription.status === 'active' || subscription.status === 'past_due')) {
        console.log(`Org ${org.id} (${org.name}) has active subscription, skipping`);
        skippedCount++;
        continue;
      }

      // Downgrade to free plan
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ plan_type: 'free' })
        .eq('id', org.id);

      if (updateError) {
        console.error(`Error downgrading org ${org.id}:`, updateError);
        continue;
      }

      console.log(`Downgraded org ${org.id} (${org.name}) from ${org.plan_type} to free`);
      downgradedCount++;
    }

    const result = {
      success: true,
      processed: expiredOrgs?.length || 0,
      downgraded: downgradedCount,
      skipped: skippedCount,
      timestamp: now,
    };

    console.log("Trial expiry check completed:", result);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-trial-expiry function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
