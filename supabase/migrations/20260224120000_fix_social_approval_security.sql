-- Drop insecure policies that allowed anyone to list or update posts with tokens
DROP POLICY IF EXISTS "Anyone can view posts by approval token" ON social_posts;
DROP POLICY IF EXISTS "Anyone can update post status via approval token" ON social_posts;

-- Create secure function to fetch a specific post by its secret token
-- This prevents listing all posts while allowing access to the specific one if the token is known
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
  FROM social_posts p
  LEFT JOIN clients c ON c.id = p.client_id
  WHERE p.approval_token = p_token;
END;
$$;

-- Create secure function to update post status by token
-- This ensures only users with the valid token can approve or reject a post
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
  -- Validate status to prevent unauthorized status changes
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected.';
  END IF;

  -- Find and update the post only if the token matches
  UPDATE social_posts
  SET 
    status = p_status,
    approved_by = p_approver_name,
    approved_at = now(),
    rejection_reason = p_rejection_reason
  WHERE approval_token = p_token
  RETURNING id INTO v_post_id;

  RETURN v_post_id IS NOT NULL;
END;
$$;

-- Grant access to anon (public) and authenticated users
GRANT EXECUTE ON FUNCTION public.get_social_post_by_token(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_social_post_approval(uuid, text, text, text) TO anon, authenticated;