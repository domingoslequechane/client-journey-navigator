-- 1. Create a secure helper to check if a page is published without exposing the whole row
CREATE OR REPLACE FUNCTION public.is_page_published(p_page_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.link_pages
    WHERE id = p_page_id AND is_published = true
  );
$$;

-- 2. Update the public RPC to strip sensitive data and internal IDs
CREATE OR REPLACE FUNCTION public.get_public_link_page(p_org_slug text, p_page_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_link_page JSONB;
  v_blocks JSONB;
BEGIN
  -- Find organization_id by slug (bypasses RLS)
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug
  AND deleted_at IS NULL
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Find published link_page (exclude internal IDs for security)
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'slug', slug,
    'logo_url', logo_url,
    'bio', bio,
    'theme', theme,
    'is_published', is_published,
    'custom_domain', custom_domain,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_link_page
  FROM link_pages
  WHERE slug = p_page_slug
  AND organization_id = v_org_id
  AND is_published = true
  LIMIT 1;
  
  IF v_link_page IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Find enabled blocks and strip sensitive content (recipientEmail) and internal stats (clicks)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'link_page_id', link_page_id,
      'type', type,
      'content', CASE 
        WHEN type = 'contact-form' THEN content #- '{formConfig, recipientEmail}'
        ELSE content 
      END,
      'style', style,
      'is_enabled', is_enabled,
      'sort_order', sort_order,
      'created_at', created_at,
      'updated_at', updated_at
    ) ORDER BY sort_order
  ), '[]'::jsonb) INTO v_blocks
  FROM link_blocks
  WHERE link_page_id = (v_link_page->>'id')::UUID
  AND is_enabled = true;
  
  -- Return with nested blocks
  RETURN v_link_page || jsonb_build_object('blocks', v_blocks);
END;
$function$;

-- 3. Remove public read access to tables to force use of the secure RPC
-- This prevents scrapers from bypassing the RPC to get the full unfiltered content
DROP POLICY IF EXISTS "Anyone can view published link pages by slug" ON public.link_pages;
DROP POLICY IF EXISTS "Anyone can view blocks of published pages" ON public.link_blocks;

-- 4. Update analytics policy to use the secure helper instead of direct table access
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.link_analytics;
CREATE POLICY "Anyone can insert analytics" ON public.link_analytics
FOR INSERT TO public
WITH CHECK (public.is_page_published(link_page_id));