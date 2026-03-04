-- Drop the public access policies that allow enumeration of all published pages
DROP POLICY IF EXISTS "Anyone can view published link pages by slug" ON public.link_pages;
DROP POLICY IF EXISTS "Anyone can view blocks of published pages" ON public.link_blocks;

-- Create a helper function to check if a page is published without requiring SELECT access to the table.
-- This is used to maintain the ability for public users to record analytics (views/clicks).
CREATE OR REPLACE FUNCTION public.is_page_published(p_page_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
 STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.link_pages
    WHERE id = p_page_id AND is_published = true
  );
$function$;

-- Update the link_analytics insert policy to use the secure helper function.
-- This ensures public users can still trigger analytics events for valid published pages
-- without being able to query the link_pages table directly.
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.link_analytics;
CREATE POLICY "Anyone can insert analytics" ON public.link_analytics
FOR INSERT WITH CHECK (public.is_page_published(link_page_id));

-- Note: Public access to specific link pages remains available via the 
-- get_public_link_page(p_org_slug, p_page_slug) RPC, which is already 
-- implemented and used by the frontend.