-- Add profile_picture column to ai_agents table
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS profile_picture text;
