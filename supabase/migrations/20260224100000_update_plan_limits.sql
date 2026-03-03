-- Migration to align plan_limits with the new requirements

-- Plan: Lança (Starter)
UPDATE public.plan_limits SET
  max_clients = 15,
  max_contracts_per_month = 15,
  max_ai_messages_per_month = 500,
  max_team_members = 5,
  max_contract_templates = 3,
  max_studio_generations = 150, -- 5/day * 30
  max_social_accounts = null, -- Unlimited
  max_social_posts_per_month = null, -- Unlimited
  max_link_pages = 15, -- Matches client limit
  can_export_data = true,
  has_finance_module = true,
  has_studio_module = true,
  has_linktree_module = true,
  has_editorial_module = true,
  has_social_module = true,
  has_social_inbox = false
WHERE plan_type = 'starter';

-- Plan: Arco (Pro)
UPDATE public.plan_limits SET
  max_clients = 25,
  max_contracts_per_month = 50,
  max_ai_messages_per_month = 1200,
  max_team_members = 10,
  max_contract_templates = 10,
  max_studio_generations = 450, -- 15/day * 30
  max_social_accounts = null, -- Unlimited
  max_social_posts_per_month = null, -- Unlimited
  max_link_pages = 25, -- Matches client limit
  can_export_data = true,
  has_finance_module = true,
  has_studio_module = true,
  has_linktree_module = true,
  has_editorial_module = true,
  has_social_module = true,
  has_social_inbox = true
WHERE plan_type = 'pro';

-- Plan: Catapulta (Agency)
UPDATE public.plan_limits SET
  max_clients = null, -- Unlimited
  max_contracts_per_month = null, -- Unlimited
  max_ai_messages_per_month = null, -- Unlimited
  max_team_members = 20,
  max_contract_templates = null, -- Unlimited
  max_studio_generations = 900, -- 30/day * 30
  max_social_accounts = null, -- Unlimited
  max_social_posts_per_month = null, -- Unlimited
  max_link_pages = null, -- Unlimited (Matches client limit)
  can_export_data = true,
  has_finance_module = true,
  has_studio_module = true,
  has_linktree_module = true,
  has_editorial_module = true,
  has_social_module = true,
  has_social_inbox = true
WHERE plan_type = 'agency';

-- Ensure free plan has correct limits
UPDATE public.plan_limits SET
  max_clients = 3,
  max_contracts_per_month = 3,
  max_ai_messages_per_month = 90,
  max_team_members = 1,
  max_contract_templates = 1,
  max_studio_generations = 150, -- 5/day * 30
  max_social_accounts = 0,
  max_social_posts_per_month = 0,
  max_link_pages = 0,
  can_export_data = false,
  has_finance_module = false,
  has_studio_module = true,
  has_linktree_module = false,
  has_editorial_module = false,
  has_social_module = false,
  has_social_inbox = false
WHERE plan_type = 'free';