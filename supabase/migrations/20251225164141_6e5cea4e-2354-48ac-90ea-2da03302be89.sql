-- Add new activity types for checklist tracking
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'task_completed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'task_uncompleted';