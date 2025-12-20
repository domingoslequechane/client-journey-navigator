-- Insert missing organization_members entries for users with organization_id in profiles
INSERT INTO public.organization_members (user_id, organization_id, role, is_active)
SELECT p.id, p.organization_id, p.role, true
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om 
    WHERE om.user_id = p.id AND om.organization_id = p.organization_id
  )
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Update current_organization_id for profiles that have organization_id but no current_organization_id
UPDATE public.profiles
SET current_organization_id = organization_id
WHERE organization_id IS NOT NULL
  AND current_organization_id IS NULL;