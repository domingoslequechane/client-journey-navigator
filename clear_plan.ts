import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env keys
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env and .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Removing plan for qualify.geral@gmail.com...");
  
  // 1. Get user by email
  // I might not have access to auth.users with anon key, but we can query profiles
  const { data: profile, error: errProfile } = await supabase
    .from('profiles')
    .select('id, organization_id, current_organization_id')
    .eq('email', 'qualify.geral@gmail.com')
    .single();

  if (errProfile || !profile) {
    console.error("Could not find profile for qualify.geral@gmail.com", errProfile);
    return;
  }

  const orgId = profile.current_organization_id || profile.organization_id;
  console.log("User ID:", profile.id, "Org ID:", orgId);

  if (!orgId) {
    console.log("User has no organization. Nothing to do.");
    return;
  }

  // 2. Delete subscription for that organization
  console.log("Deleting subscription...");
  const { error: subErr } = await supabase
    .from('subscriptions')
    .delete()
    .eq('organization_id', orgId);

  if (subErr) console.error("Error deleting subscription:", subErr);

  // 3. Set plan_type to null in organizations table
  console.log("Clearing plan_type...");
  const { error: orgErr } = await supabase
    .from('organizations')
    .update({ plan_type: null })
    .eq('id', orgId);

  if (orgErr) console.error("Error clearing plan_type:", orgErr);

  console.log("Done! Plan and subscription cleared.");
}

run();
