-- Update the get_public_link_page function to exclude internal UUIDs and sensitive metrics
CREATE OR REPLACE FUNCTION public.get_public_link_page(p_org_slug text, p_page_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_link_page JSONB;
  v_blocks JSONB;
BEGIN
  -- Find organization_id by slug (bypasses RLS because of SECURITY DEFINER)
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug
  AND deleted_at IS NULL
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Fetch published link_page - EXCLUDING client_id and organization_id for security
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
  
  -- Fetch enabled blocks - EXCLUDING link_page_id and clicks for security
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', type,
      'content', content,
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
  
  -- Return combined object
  RETURN v_link_page || jsonb_build_object('blocks', v_blocks);
END;
$function$;

-- Remove overly permissive public SELECT policies
-- This prevents attackers from using the REST API to dump the entire table
DROP POLICY IF EXISTS "Anyone can view published link pages by slug" ON public.link_pages;
DROP POLICY IF EXISTS "Anyone can view blocks of published pages" ON public.link_blocks;

-- Note: The "Anyone can insert analytics" policy on link_analytics remains active
-- and will still work because RLS checks on referenced tables (link_pages) 
-- are performed by the database engine.