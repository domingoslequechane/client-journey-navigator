-- 1. Criar RPC Security Definer para acesso público às link pages
CREATE OR REPLACE FUNCTION public.get_public_link_page(
  p_org_slug TEXT,
  p_page_slug TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT jsonb_build_object(
    'id', id,
    'client_id', client_id,
    'organization_id', organization_id,
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
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'link_page_id', link_page_id,
      'type', type,
      'content', content,
      'style', style,
      'is_enabled', is_enabled,
      'sort_order', sort_order,
      'clicks', clicks,
      'created_at', created_at,
      'updated_at', updated_at
    ) ORDER BY sort_order
  ), '[]'::jsonb) INTO v_blocks
  FROM link_blocks
  WHERE link_page_id = (v_link_page->>'id')::UUID
  AND is_enabled = true;
  
  -- Retornar com blocos aninhados
  RETURN v_link_page || jsonb_build_object('blocks', v_blocks);
END;
$$;

-- 2. Atualizar CHECK constraint para incluir novos tipos de bloco
ALTER TABLE public.link_blocks 
DROP CONSTRAINT IF EXISTS link_blocks_type_check;

ALTER TABLE public.link_blocks 
ADD CONSTRAINT link_blocks_type_check 
CHECK (type IN ('button', 'text', 'image', 'video', 'social', 'divider', 'email-form', 'carousel', 'contact-form'));