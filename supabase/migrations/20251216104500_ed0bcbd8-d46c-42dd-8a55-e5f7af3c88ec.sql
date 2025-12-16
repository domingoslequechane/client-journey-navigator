-- Fix admin permissions on clients to match the existing admin model (profiles.role)
-- and prevent privilege escalation by blocking non-admins from changing their own profile role.

-- 1) Prevent non-admin users from changing profile role
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can change roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_role_change_trigger
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change();

-- 2) Update clients admin policies to use is_admin(auth.uid())
DROP POLICY IF EXISTS "Admins can view all clients" ON public.clients;
CREATE POLICY "Admins can view all clients"
ON public.clients
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all clients" ON public.clients;
CREATE POLICY "Admins can update all clients"
ON public.clients
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete all clients" ON public.clients;
CREATE POLICY "Admins can delete all clients"
ON public.clients
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
