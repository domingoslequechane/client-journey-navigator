-- 1. Remove the insecure broad policies that allowed table scans
DROP POLICY IF EXISTS "Anyone can view posts by approval token" ON public.social_posts;
DROP POLICY IF EXISTS "Anyone can update post status via approval token" ON public.social_posts;

-- 2. Create/Update the secure RPC function to fetch a single post by token
-- This function is SECURITY DEFINER so it can bypass RLS, but it only returns
-- the specific row matching the token, preventing unauthorized data exfiltration.
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
    sp.id,
    sp.content,
    sp.media_urls,
    sp.platforms,
    sp.content_type,
    sp.hashtags,
    sp.scheduled_at,
    sp.status,
    c.company_name as client_name
  FROM public.social_posts sp
  LEFT JOIN public.clients c ON c.id = sp.client_id
  WHERE sp.approval_token = p_token;
END;
$$;

-- 3. Create/Update the secure RPC function to respond to an approval request
-- This ensures that only posts in 'pending_approval' status can be modified
-- and only if the correct token is provided.
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
BEGIN
  -- Validate status
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected.';
  END IF;

  UPDATE public.social_posts
  SET 
    status = CASE WHEN p_status = 'approved' THEN 'approved' ELSE 'rejected' END,
    approved_by = p_approver_name,
    approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE approved_at END,
    rejection_reason = p_rejection_reason,
    updated_at = NOW()
  WHERE approval_token = p_token
    AND status = 'pending_approval';
    
  RETURN FOUND;
END;
$$;

-- 4. Grant execute permissions to the public (anon) role
GRANT EXECUTE ON FUNCTION public.get_social_post_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_social_post_approval(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;