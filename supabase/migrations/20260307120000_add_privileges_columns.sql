-- =============================================
-- FIX: ADD MISSING PRIVILEGES COLUMNS
-- =============================================

-- 1. Add privileges column to organization_invites
ALTER TABLE public.organization_invites 
ADD COLUMN IF NOT EXISTS privileges TEXT[] DEFAULT '{}';

-- 2. Add privileges column to organization_members
ALTER TABLE public.organization_members 
ADD COLUMN IF NOT EXISTS privileges TEXT[] DEFAULT '{}';

-- 3. Update existing members to have basic privileges based on their role if empty
UPDATE public.organization_members
SET privileges = ARRAY['sales']
WHERE role = 'sales' AND (privileges IS NULL OR privileges = '{}');

UPDATE public.organization_members
SET privileges = ARRAY['designer']
WHERE role = 'operations' AND (privileges IS NULL OR privileges = '{}');

UPDATE public.organization_members
SET privileges = ARRAY['admin']
WHERE role = 'admin' AND (privileges IS NULL OR privileges = '{}');
