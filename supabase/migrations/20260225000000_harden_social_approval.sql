-- 1. Remover as políticas inseguras que permitiam acesso público a qualquer post com token
DROP POLICY IF EXISTS "Anyone can view posts by approval token" ON public.social_posts;
DROP POLICY IF EXISTS "Anyone can update post status via approval token" ON public.social_posts;

-- 2. Criar função segura para buscar post pelo token (usada na página de aprovação)
-- Definida como SECURITY DEFINER para ignorar RLS, mas validando o token internamente
CREATE OR REPLACE FUNCTION public.get_social_post_by_token(p_token UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  media_urls JSONB,
  platforms TEXT[],
  content_type TEXT,
  hashtags TEXT[],
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  client_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.content,
    p.media_urls,
    p.platforms,
    p.content_type,
    p.hashtags,
    p.scheduled_at,
    p.status,
    c.company_name as client_name
  FROM public.social_posts p
  LEFT JOIN public.clients c ON c.id = p.client_id
  WHERE p.approval_token = p_token;
END;
$$;

-- 3. Criar função segura para responder à aprovação (aprovar/rejeitar)
CREATE OR REPLACE FUNCTION public.respond_to_social_post_approval(
  p_token UUID,
  p_status TEXT,
  p_approver_name TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  -- Verifica se o token é válido e encontra o post
  SELECT id INTO v_post_id
  FROM public.social_posts
  WHERE approval_token = p_token;

  IF v_post_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Atualiza o post apenas se o token coincidir
  UPDATE public.social_posts
  SET 
    status = p_status,
    approved_by = p_approver_name,
    approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE NULL END,
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE id = v_post_id;

  RETURN TRUE;
END;
$$;

-- 4. Garantir permissões de execução para usuários anônimos (público) e autenticados
GRANT EXECUTE ON FUNCTION public.get_social_post_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_social_post_approval(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;