-- Add suspended column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_by uuid;