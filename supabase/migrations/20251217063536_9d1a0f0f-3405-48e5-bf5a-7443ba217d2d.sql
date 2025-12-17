-- Update handle_new_user to default to 'admin' role for all new signups (agency owners)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_full_name TEXT;
  user_role public.user_role;
BEGIN
  user_full_name := new.raw_user_meta_data ->> 'full_name';
  
  -- Default to 'admin' for all signups (agency owners)
  -- Only team members invited by admin get other roles
  user_role := COALESCE(
    (new.raw_user_meta_data ->> 'role')::public.user_role, 
    'admin'::public.user_role
  );

  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id, 
    user_full_name,
    user_role,
    new.email
  );
  RETURN new;
END;
$$;