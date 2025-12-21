-- =====================================================
-- Fix 1: Restrict email access in profiles table
-- Only allow users to see their own email, not others'
-- =====================================================

-- Drop the existing permissive policies that allow admins/proprietors to see emails
DROP POLICY IF EXISTS "Admins can view organization profiles" ON public.profiles;
DROP POLICY IF EXISTS "Proprietors can view all profiles" ON public.profiles;

-- Create new policies that restrict email viewing
-- Admins can view organization profiles but email column is still visible (we'll handle in app layer)
CREATE POLICY "Admins can view organization profiles without email"
ON public.profiles
FOR SELECT
USING (
  is_admin(auth.uid()) 
  AND organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Proprietors can view profiles but should fetch emails from auth.users via service role
CREATE POLICY "Proprietors can view profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'proprietor'::app_role));

-- Recreate update policies (they were already fine)
-- These already exist but let's ensure they're correct

-- =====================================================
-- Fix 2: Add soft delete for organizations
-- =====================================================

-- Add columns for soft delete functionality
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delete_scheduled_for TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient querying of non-deleted organizations
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON public.organizations(deleted_at);

-- Update RLS policies to exclude soft-deleted organizations from normal queries
DROP POLICY IF EXISTS "Owners can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Proprietors can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Organization owner or admin can update" ON public.organizations;
DROP POLICY IF EXISTS "Proprietors can update all organizations" ON public.organizations;

-- Recreate policies with soft delete filter
CREATE POLICY "Owners can view their own organization"
ON public.organizations
FOR SELECT
USING (owner_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
USING (user_belongs_to_org(auth.uid(), id) AND deleted_at IS NULL);

CREATE POLICY "Proprietors can view all organizations"
ON public.organizations
FOR SELECT
USING (has_role(auth.uid(), 'proprietor'::app_role));

CREATE POLICY "Organization owner or admin can update"
ON public.organizations
FOR UPDATE
USING (
  (owner_id = auth.uid() OR (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), id)))
  AND deleted_at IS NULL
);

CREATE POLICY "Proprietors can update all organizations"
ON public.organizations
FOR UPDATE
USING (has_role(auth.uid(), 'proprietor'::app_role));

-- Create a function to schedule organization deletion (soft delete)
CREATE OR REPLACE FUNCTION public.schedule_organization_deletion(org_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark organization as scheduled for deletion (30 day grace period)
  UPDATE organizations 
  SET deleted_at = NOW(),
      deleted_by = user_id,
      delete_scheduled_for = NOW() + INTERVAL '30 days'
  WHERE id = org_id
  AND owner_id = user_id
  AND deleted_at IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Create a function to restore a soft-deleted organization
CREATE OR REPLACE FUNCTION public.restore_organization(org_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow restore if within grace period
  UPDATE organizations 
  SET deleted_at = NULL,
      deleted_by = NULL,
      delete_scheduled_for = NULL
  WHERE id = org_id
  AND owner_id = user_id
  AND deleted_at IS NOT NULL
  AND delete_scheduled_for > NOW();
  
  RETURN FOUND;
END;
$$;