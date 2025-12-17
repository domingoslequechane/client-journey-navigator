-- Step 1: Add new enum value 'proprietor' and enable realtime
-- The enum value must be committed before it can be used

-- Add new value to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'proprietor';

-- Enable realtime for support_messages table
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- Add support_messages to realtime publication (ignore if already exists)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;