-- Add currency field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'MZN';

-- Add comment for clarity
COMMENT ON COLUMN public.organizations.currency IS 'ISO 4217 currency code for the organization';