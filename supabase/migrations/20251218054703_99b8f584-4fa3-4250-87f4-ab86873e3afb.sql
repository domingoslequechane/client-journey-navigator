-- Add report field to checklist_items table for storing activity reports
ALTER TABLE public.checklist_items 
ADD COLUMN report TEXT;