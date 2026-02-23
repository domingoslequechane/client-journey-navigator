
-- Add module access columns to plan_limits
ALTER TABLE public.plan_limits
  ADD COLUMN IF NOT EXISTS has_finance_module boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_studio_module boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_linktree_module boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_editorial_module boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_social_module boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_social_inbox boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_social_accounts integer,
  ADD COLUMN IF NOT EXISTS max_social_posts_per_month integer,
  ADD COLUMN IF NOT EXISTS max_link_pages integer;
