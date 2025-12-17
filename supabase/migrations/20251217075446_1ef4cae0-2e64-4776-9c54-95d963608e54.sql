-- Fix function search path for generate_slug
CREATE OR REPLACE FUNCTION public.generate_slug(name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert to lowercase and replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Remove overly permissive policy on subscriptions and replace with specific ones
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Admins can manage subscriptions"
ON public.subscriptions FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));