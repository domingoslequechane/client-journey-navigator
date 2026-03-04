-- Update the handle_new_user function to be secure
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Extract full name from metadata if present
  user_full_name := new.raw_user_meta_data ->> 'full_name';
  
  -- SECURITY FIX: 
  -- 1. We ALWAYS default to 'sales' (low privilege).
  -- 2. We IGNORE any 'role' field in raw_user_meta_data to prevent injection.
  -- 3. Elevated roles (admin) must be assigned via secure Edge Functions 
  --    using the Service Role key or by an existing administrator.
  
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id, 
    user_full_name,
    'sales'::public.user_role,
    new.email
  );
  
  RETURN new;
END;
$function$;