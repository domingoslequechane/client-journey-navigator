
-- Add Late.dev profile ID to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS late_profile_id TEXT;

-- Add Late.dev post ID to social_posts
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS late_post_id TEXT;

-- Add Late.dev account ID to social_accounts  
ALTER TABLE public.social_accounts ADD COLUMN IF NOT EXISTS late_account_id TEXT;
