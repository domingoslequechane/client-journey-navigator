-- Fix infinite recursion in profiles RLS policies
-- Drop problematic policies that query the profiles table within itself
DROP POLICY IF EXISTS "profiles_select_admin_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin_policy" ON public.profiles;

-- Create a function to check admin role without recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'::user_role
  )
$$;

-- Recreate admin policies using the function
CREATE POLICY "profiles_select_admin_policy" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "profiles_update_admin_policy" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Update the client to have the correct user_id
UPDATE public.clients 
SET user_id = '481f00a6-29b2-487b-84e9-f8f1e8b0efa3'
WHERE user_id IS NULL;