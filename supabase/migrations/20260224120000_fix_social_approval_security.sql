-- Remover as políticas inseguras que permitiam acesso a qualquer post com token não nulo
DROP POLICY IF EXISTS "Anyone can view posts by approval token" ON public.social_posts;
DROP POLICY IF EXISTS "Anyone can update post status via approval token" ON public.social_posts;

-- Função segura para obter os detalhes de um post usando o token de aprovação
-- Esta função é SECURITY DEFINER para ignorar o RLS, mas filtra estritamente pelo token
CREATE OR REPLACE FUNCTION public.get_social_post_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_post jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id,
    'content', p.content,
    'media_urls', p.media_urls,
    'platforms', p.platforms,
    'content_type', p.content_type,
    'hashtags', p.hashtags,
    'scheduled_at', p.scheduled_at,
    'status', p.status,
    'client_name', c.company_name,
    'rejection_reason', p.rejection_reason
  ) INTO v_post
  FROM social_posts p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.approval_token = p_token;

  RETURN v_post;
END;
$$;

-- Função segura para responder a uma solicitação de aprovação usando o token
CREATE OR REPLACE FUNCTION public.respond_to_social_post_approval(
  p_token uuid,
  p_status text,
  p_approver_name text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Apenas permite atualizar se o post estiver aguardando aprovação
  -- ou se estivermos visualizando um já respondido (para feedback visual no frontend)
  UPDATE social_posts
  SET 
    status = p_status,
    approved_by = p_approver_name,
    approved_at = now(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE approval_token = p_token
    AND status = 'pending_approval';

  RETURN FOUND;
END;
$$;

-- Garantir que as funções podem ser chamadas publicamente (anon)
GRANT EXECUTE ON FUNCTION public.get_social_post_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_social_post_approval(uuid, text, text, text) TO anon, authenticated;