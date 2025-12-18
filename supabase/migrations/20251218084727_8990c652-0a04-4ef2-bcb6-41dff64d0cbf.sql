-- =============================================
-- COMPREHENSIVE MULTI-TENANT SECURITY FIX
-- Fix RLS policies for all tables to enforce organization isolation
-- =============================================

-- =============================================
-- 1. ACTIVITIES TABLE
-- =============================================
-- Drop insecure global admin policy
DROP POLICY IF EXISTS "Admins can manage all activities" ON public.activities;

-- Create new secure admin policy with organization check via client relationship
CREATE POLICY "Admins can manage organization activities"
ON public.activities
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = activities.client_id
    AND c.organization_id IS NOT NULL
    AND is_admin(auth.uid())
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = activities.client_id
    AND c.organization_id IS NOT NULL
    AND is_admin(auth.uid())
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

-- =============================================
-- 2. CHECKLIST_ITEMS TABLE (CRITICAL FIX)
-- =============================================
-- Drop all insecure policies
DROP POLICY IF EXISTS "Authenticated users can view checklist_items" ON public.checklist_items;
DROP POLICY IF EXISTS "Authenticated users can create checklist_items" ON public.checklist_items;
DROP POLICY IF EXISTS "Authenticated users can update checklist_items" ON public.checklist_items;
DROP POLICY IF EXISTS "Authenticated users can delete checklist_items" ON public.checklist_items;

-- Create secure policies with organization isolation via client relationship
CREATE POLICY "Users can view organization checklist_items"
ON public.checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checklist_items.client_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

CREATE POLICY "Users can create organization checklist_items"
ON public.checklist_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checklist_items.client_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

CREATE POLICY "Users can update organization checklist_items"
ON public.checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checklist_items.client_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

CREATE POLICY "Users can delete organization checklist_items"
ON public.checklist_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = checklist_items.client_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

-- =============================================
-- 3. LOGIN_HISTORY TABLE
-- =============================================
-- Drop insecure global admin policy
DROP POLICY IF EXISTS "Admins can view all login history" ON public.login_history;

-- Create secure admin policy - admins can only view login history of users in their org
CREATE POLICY "Admins can view organization login history"
ON public.login_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = login_history.user_id
    AND p.organization_id IS NOT NULL
    AND is_admin(auth.uid())
    AND user_belongs_to_org(auth.uid(), p.organization_id)
  )
);

-- =============================================
-- 4. PAYMENT_HISTORY TABLE
-- =============================================
-- Drop insecure global admin policy
DROP POLICY IF EXISTS "Admins can manage payment history" ON public.payment_history;

-- Create secure admin policy - admins only manage their own org payments
CREATE POLICY "Admins can manage organization payment history"
ON public.payment_history
FOR ALL
USING (
  is_admin(auth.uid())
  AND user_belongs_to_org(auth.uid(), organization_id)
)
WITH CHECK (
  is_admin(auth.uid())
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Proprietors can manage all payment history (for SaaS management)
CREATE POLICY "Proprietors can manage all payment history"
ON public.payment_history
FOR ALL
USING (has_role(auth.uid(), 'proprietor'))
WITH CHECK (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 5. PROFILES TABLE
-- =============================================
-- Drop insecure global admin policies
DROP POLICY IF EXISTS "profiles_select_admin_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_policy" ON public.profiles;

-- Create secure admin policies - admins only see/update profiles in their org
CREATE POLICY "Admins can view organization profiles"
ON public.profiles
FOR SELECT
USING (
  is_admin(auth.uid())
  AND organization_id IS NOT NULL
  AND user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Admins can update organization profiles"
ON public.profiles
FOR UPDATE
USING (
  is_admin(auth.uid())
  AND organization_id IS NOT NULL
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Proprietors can view and manage all profiles
CREATE POLICY "Proprietors can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'proprietor'));

CREATE POLICY "Proprietors can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 6. SUBSCRIPTIONS TABLE
-- =============================================
-- Drop insecure global admin policy
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

-- Create secure admin policy - admins only manage their own org subscription
CREATE POLICY "Admins can manage organization subscription"
ON public.subscriptions
FOR ALL
USING (
  is_admin(auth.uid())
  AND user_belongs_to_org(auth.uid(), organization_id)
)
WITH CHECK (
  is_admin(auth.uid())
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Proprietors can manage all subscriptions (for SaaS management)
CREATE POLICY "Proprietors can manage all subscriptions"
ON public.subscriptions
FOR ALL
USING (has_role(auth.uid(), 'proprietor'))
WITH CHECK (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 7. ORGANIZATIONS TABLE
-- =============================================
-- Drop insecure update policy
DROP POLICY IF EXISTS "Organization owner can update" ON public.organizations;

-- Create secure update policy - owner or admin of THAT org only
CREATE POLICY "Organization owner or admin can update"
ON public.organizations
FOR UPDATE
USING (
  owner_id = auth.uid()
  OR (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), id))
);

-- Proprietors can view and update all organizations
CREATE POLICY "Proprietors can view all organizations"
ON public.organizations
FOR SELECT
USING (has_role(auth.uid(), 'proprietor'));

CREATE POLICY "Proprietors can update all organizations"
ON public.organizations
FOR UPDATE
USING (has_role(auth.uid(), 'proprietor'));