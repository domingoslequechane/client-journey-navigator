-- Add phone column to organizations table for agency contact
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS phone text;