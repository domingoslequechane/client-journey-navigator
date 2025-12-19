-- Add a SELECT policy for organization owners to see their own organization
-- This is needed for INSERT...RETURNING to work correctly
CREATE POLICY "Owners can view their own organization"
ON public.organizations
FOR SELECT
USING (owner_id = auth.uid());