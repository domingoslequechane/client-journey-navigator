
-- Update plan_limits data with module access and new limits
UPDATE public.plan_limits SET
  has_finance_module = false,
  has_studio_module = false,
  has_linktree_module = false,
  has_editorial_module = false,
  has_social_module = false,
  has_social_inbox = false,
  max_social_accounts = 0,
  max_social_posts_per_month = 0,
  max_link_pages = 0,
  max_studio_generations = 10
WHERE plan_type = 'free';

UPDATE public.plan_limits SET
  has_finance_module = true,
  has_studio_module = true,
  has_linktree_module = true,
  has_editorial_module = true,
  has_social_module = true,
  has_social_inbox = false,
  max_social_accounts = 3,
  max_social_posts_per_month = 50,
  max_link_pages = 1,
  max_studio_generations = 30
WHERE plan_type = 'starter';

UPDATE public.plan_limits SET
  has_finance_module = true,
  has_studio_module = true,
  has_linktree_module = true,
  has_editorial_module = true,
  has_social_module = true,
  has_social_inbox = true,
  max_social_accounts = 7,
  max_social_posts_per_month = 200,
  max_link_pages = 5,
  max_studio_generations = 100
WHERE plan_type = 'pro';

UPDATE public.plan_limits SET
  has_finance_module = true,
  has_studio_module = true,
  has_linktree_module = true,
  has_editorial_module = true,
  has_social_module = true,
  has_social_inbox = true,
  max_social_accounts = 15,
  max_social_posts_per_month = NULL,
  max_link_pages = NULL,
  max_studio_generations = NULL
WHERE plan_type = 'agency';
