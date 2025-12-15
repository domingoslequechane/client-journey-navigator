-- Create app_role enum for user roles (separate from profile role)
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user'::app_role,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix activities table RLS (currently allows all)
DROP POLICY IF EXISTS "Allow all access to activities" ON public.activities;

CREATE POLICY "Authenticated users can view activities"
ON public.activities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update activities"
ON public.activities FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete activities"
ON public.activities FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix checklist_items table RLS (currently allows all)
DROP POLICY IF EXISTS "Allow all access to checklist_items" ON public.checklist_items;

CREATE POLICY "Authenticated users can view checklist_items"
ON public.checklist_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create checklist_items"
ON public.checklist_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update checklist_items"
ON public.checklist_items FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete checklist_items"
ON public.checklist_items FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Fix clients table RLS (currently allows all)
DROP POLICY IF EXISTS "Allow all access to clients" ON public.clients;

CREATE POLICY "Authenticated users can view clients"
ON public.clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Trigger to assign default role when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();