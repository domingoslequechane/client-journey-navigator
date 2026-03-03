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
  -- Buscar organization_id pelo slug (bypassa RLS)
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug
  AND deleted_at IS NULL
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar link_page publicada
  -- EXCLUDING internal fields: client_id, organization_id
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
  
  -- Buscar blocos habilitados
  -- EXCLUDING internal/stats fields: link_page_id, clicks, is_enabled (implied), created_at, updated_at
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', type,
      'content', content,
      'style', style,
      'sort_order', sort_order
    ) ORDER BY sort_order
  ), '[]'::jsonb) INTO v_blocks
  FROM link_blocks
  WHERE link_page_id = (v_link_page->>'id')::UUID
  AND is_enabled = true;
  
  -- Retornar com blocos aninhados
  RETURN v_link_page || jsonb_build_object('blocks', v_blocks);
END;
$function$;