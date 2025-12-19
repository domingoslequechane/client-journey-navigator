-- Drop the current restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a new permissive INSERT policy that allows authenticated users to create their own organizations
CREATE POLICY "Users can create their own organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (owner_id = auth.uid());