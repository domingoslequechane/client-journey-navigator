-- Adicionar coluna para controlar se onboarding foi concluído
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Atualizar organizações existentes que já têm nomes configurados como concluídas
UPDATE public.organizations 
SET onboarding_completed = true 
WHERE name NOT LIKE '%''s Agency%' 
AND name != 'Agency' 
AND name IS NOT NULL 
AND name != '';