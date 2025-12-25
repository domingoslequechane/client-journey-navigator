-- Add new columns to activities table for tracking changes
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS changed_by uuid,
ADD COLUMN IF NOT EXISTS field_name text,
ADD COLUMN IF NOT EXISTS old_value text,
ADD COLUMN IF NOT EXISTS new_value text;

-- Add new activity types to the enum
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'field_change';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'stage_change';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'status_change';