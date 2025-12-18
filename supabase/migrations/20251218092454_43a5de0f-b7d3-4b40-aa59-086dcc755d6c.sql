-- Delete orphan study suggestions with null organization_id
DELETE FROM public.study_suggestions WHERE organization_id IS NULL;