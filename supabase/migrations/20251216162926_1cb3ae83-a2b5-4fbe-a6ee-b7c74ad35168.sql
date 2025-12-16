-- Drop the overly permissive policies that allow all authenticated users
DROP POLICY IF EXISTS "Authenticated users can create activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can delete activities" ON public.activities;

-- Add admin override policy for managing all activities
CREATE POLICY "Admins can manage all activities"
ON public.activities FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));