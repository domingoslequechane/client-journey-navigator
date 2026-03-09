-- Add template_definition JSONB column to studio_projects
ALTER TABLE "public"."studio_projects" ADD COLUMN IF NOT EXISTS "template_definition" jsonb;
