-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create login_history table
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_in_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  provider text DEFAULT 'email'
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view login history
CREATE POLICY "Admins can view all login history"
ON public.login_history
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Users can insert their own login records
CREATE POLICY "Users can insert own login history"
ON public.login_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update handle_new_user to store email
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
  user_role := COALESCE(
    (new.raw_user_meta_data ->> 'role')::public.user_role, 
    'sales'::public.user_role
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

-- Update existing profiles with emails from auth.users (one-time migration)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;