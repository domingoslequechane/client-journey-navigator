-- Update get_public_link_page to remove sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_link_page(p_org_slug text, p_page_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_page_id UUID;
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
  
  -- Find published link_page and capture internal ID for blocks query
  -- We remove client_id and organization_id from the public output for security.
  -- We keep the page 'id' as it is the public identifier used by the analytics system.
  SELECT 
    id,
    jsonb_build_object(
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
    ) 
  INTO v_page_id, v_link_page
  FROM link_pages
  WHERE slug = p_page_slug
  AND organization_id = v_org_id
  AND is_published = true
  LIMIT 1;
  
  IF v_page_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Find enabled blocks (removing clicks and internal link_page_id)
  -- This prevents competitors from seeing which links are performing best.
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
  WHERE link_page_id = v_page_id
  AND is_enabled = true;
  
  -- Return with nested blocks
  RETURN v_link_page || jsonb_build_object('blocks', v_blocks);
END;
$function$;