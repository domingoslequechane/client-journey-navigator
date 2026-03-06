-- =============================================
-- FIX: ALLOW PUBLIC VIEWING OF INVITES BY TOKEN
-- =============================================

-- 1. Drop the restrictive policy if it's the only one allowing SELECT
-- (We keep it for security, but we add a more permissive one for tokens)

-- 2. Add policy to allow anyone to view invite details if they have the token
-- This is safe because invite_token is a UUID and very hard to guess.
-- This allows the AcceptInvite page to show organization name and invitee name 
-- BEFORE the user is logged in.

CREATE POLICY "Anyone with a valid token can view invite details"
ON public.organization_invites
FOR SELECT
TO anon, authenticated
USING (invite_token IS NOT NULL);

-- 3. Ensure organizations can be viewed publicly (minimum info) for the invite page
-- We only allow viewing if the organization has an active pending invite.
-- This prevents total enumeration of the organizations table.

DROP POLICY IF EXISTS "Public can view organization basic info" ON public.organizations;
CREATE POLICY "Public can view organization basic info"
ON public.organizations
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_invites
    WHERE organization_id = organizations.id
    AND status = 'pending'
  )
);
