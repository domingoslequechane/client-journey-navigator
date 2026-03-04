-- 1. Remove the insecure "Anyone can..." policies that allowed unauthorized access
DROP POLICY IF EXISTS "Anyone can view posts by approval token" ON public.social_posts;
DROP POLICY IF EXISTS "Anyone can update post status via approval token" ON public.social_posts;

-- 2. Create a secure function to fetch a post by token
-- This function is SECURITY DEFINER so it can be called by unauthenticated clients (the approvers)
-- while still maintaining strict data isolation.
CREATE OR REPLACE FUNCTION public.get_social_post_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  content text,
  media_urls jsonb,
  platforms text[],
  content_type text,
  hashtags text[],
  scheduled_at timestamptz,
  status text,
  client_name text,
  rejection_reason text
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
    c.company_name as client_name,
    p.rejection_reason
  FROM public.social_posts p
  LEFT JOIN public.clients c ON c.id = p.client_id
  WHERE p.approval_token = p_token;
END;
$$;

-- 3. Create a secure function to respond to approval/rejection
-- This ensures that only someone with the valid token can update the post status.
CREATE OR REPLACE FUNCTION public.respond_to_social_post_approval(
  p_token uuid,
  p_status text,
  p_approver_name text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id uuid;
BEGIN
  -- Find the post by token
  SELECT id INTO v_post_id
  FROM public.social_posts
  WHERE approval_token = p_token;

  IF v_post_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update the post
  UPDATE public.social_posts
  SET 
    status = p_status,
    approved_by = p_approver_name,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END,
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = v_post_id;

  RETURN true;
END;
$$;

-- 4. Ensure RLS is enabled and standard policies are intact
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_social_post_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_social_post_approval(uuid, text, text, text) TO anon, authenticated;