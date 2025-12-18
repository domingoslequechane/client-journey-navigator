-- =============================================
-- FIX: Multi-tenant security for clients table
-- Remove global admin access, enforce organization isolation
-- =============================================

-- Step 1: Drop insecure admin policies that allow global access
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete all clients" ON public.clients;

-- Step 2: Create new secure admin policies with organization check
-- Admins can only view clients within their own organization
CREATE POLICY "Admins can view organization clients"
ON public.clients
FOR SELECT
USING (
  is_admin(auth.uid()) 
  AND organization_id IS NOT NULL
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Admins can only update clients within their own organization
CREATE POLICY "Admins can update organization clients"
ON public.clients
FOR UPDATE
USING (
  is_admin(auth.uid()) 
  AND organization_id IS NOT NULL
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Admins can only delete clients within their own organization
CREATE POLICY "Admins can delete organization clients"
ON public.clients
FOR DELETE
USING (
  is_admin(auth.uid()) 
  AND organization_id IS NOT NULL
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Admins can only insert clients into their own organization
CREATE POLICY "Admins can insert organization clients"
ON public.clients
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  AND organization_id IS NOT NULL
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Step 3: Fix clients with NULL organization_id
-- Associate them with the correct organization based on user_id
UPDATE public.clients c
SET organization_id = p.organization_id
FROM public.profiles p
WHERE c.user_id = p.id
AND c.organization_id IS NULL
AND p.organization_id IS NOT NULL;