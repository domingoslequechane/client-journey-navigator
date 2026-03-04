-- Add attempts column to track failed verification attempts
ALTER TABLE public.email_otps ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;