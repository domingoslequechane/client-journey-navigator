-- Atualiza a função RPC para remover dados sensíveis (e-mails e IDs internos)
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
  -- Buscar organization_id pelo slug (bypassa RLS por ser SECURITY DEFINER)
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug
  AND deleted_at IS NULL
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Buscar link_page publicada (removendo IDs internos sensíveis do retorno)
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
  
  -- Buscar blocos habilitados, removendo especificamente o recipientEmail do content
  -- O operador '-' remove uma chave de um objeto JSONB
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'link_page_id', link_page_id,
      'type', type,
      'content', CASE 
        WHEN type = 'contact-form' THEN (content - 'formConfig') || jsonb_build_object('formConfig', (content->'formConfig') - 'recipientEmail')
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
  
  -- Retornar com blocos aninhados
  RETURN v_link_page || jsonb_build_object('blocks', v_blocks);
END;
$function$;

-- Remove a política de SELECT público direto na tabela link_blocks
-- Isso garante que usuários não autenticados SÓ consigam ver dados através do RPC seguro acima
DROP POLICY IF EXISTS "Anyone can view blocks of published pages" ON public.link_blocks;

-- Opcional: Reforçar também a tabela link_pages removendo o acesso público direto
DROP POLICY IF EXISTS "Anyone can view published link pages by slug" ON public.link_pages;