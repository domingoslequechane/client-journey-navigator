-- Adicionar novas colunas à tabela plan_limits
ALTER TABLE public.plan_limits 
ADD COLUMN IF NOT EXISTS max_contract_templates integer,
ADD COLUMN IF NOT EXISTS can_export_data boolean DEFAULT false;

-- Atualizar os limites para cada plano
UPDATE public.plan_limits 
SET max_ai_messages_per_month = 10, 
    max_contract_templates = 1, 
    can_export_data = false 
WHERE plan_type = 'free';

UPDATE public.plan_limits 
SET max_contract_templates = 3, 
    can_export_data = true 
WHERE plan_type = 'starter';

UPDATE public.plan_limits 
SET max_contract_templates = 10, 
    can_export_data = true 
WHERE plan_type = 'pro';

UPDATE public.plan_limits 
SET max_contract_templates = NULL, 
    can_export_data = true 
WHERE plan_type = 'agency';