-- Update plan limits for new business model
-- Bússola (free): $3/month
UPDATE public.plan_limits SET 
  max_clients = 6,
  max_contracts_per_month = 6,
  max_ai_messages_per_month = 150,
  max_team_members = 2,
  max_contract_templates = 1,
  can_export_data = false
WHERE plan_type = 'free';

-- Lança (starter): $7.50/month
UPDATE public.plan_limits SET 
  max_clients = 15,
  max_contracts_per_month = 15,
  max_ai_messages_per_month = 500,
  max_team_members = 7,
  max_contract_templates = 3,
  can_export_data = true
WHERE plan_type = 'starter';

-- Arco (pro): $19.99/month
UPDATE public.plan_limits SET 
  max_clients = 50,
  max_contracts_per_month = 50,
  max_ai_messages_per_month = 1200,
  max_team_members = 10,
  max_contract_templates = 10,
  can_export_data = true
WHERE plan_type = 'pro';

-- Catapulta (agency): $49.99/month
UPDATE public.plan_limits SET 
  max_clients = NULL,
  max_contracts_per_month = NULL,
  max_ai_messages_per_month = NULL,
  max_team_members = 20,
  max_contract_templates = NULL,
  can_export_data = true
WHERE plan_type = 'agency';