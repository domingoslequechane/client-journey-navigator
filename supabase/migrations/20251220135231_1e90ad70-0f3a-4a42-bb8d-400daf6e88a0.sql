-- Add tutorial_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT false;