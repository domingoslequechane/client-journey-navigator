-- Update the default trial period from 14 days to 7 days for new organizations
ALTER TABLE public.organizations 
ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days');