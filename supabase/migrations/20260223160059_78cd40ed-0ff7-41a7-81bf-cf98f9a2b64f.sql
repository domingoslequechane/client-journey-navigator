ALTER TABLE public.studio_projects ADD COLUMN IF NOT EXISTS footer_text text;

NOTIFY pgrst, 'reload schema';