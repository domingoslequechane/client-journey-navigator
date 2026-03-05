
CREATE OR REPLACE FUNCTION public.respond_to_social_post_approval(
  p_token TEXT,
  p_status TEXT,
  p_approver_name TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  -- Validate status input
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be approved or rejected.';
  END IF;

  -- Validate input lengths
  IF p_approver_name IS NOT NULL AND char_length(p_approver_name) > 255 THEN
    RAISE EXCEPTION 'Approver name too long (max 255 characters).';
  END IF;

  IF p_rejection_reason IS NOT NULL AND char_length(p_rejection_reason) > 1000 THEN
    RAISE EXCEPTION 'Rejection reason too long (max 1000 characters).';
  END IF;

  -- Find post by token that is pending approval
  SELECT id INTO v_post_id
  FROM public.social_posts
  WHERE approval_token = p_token
    AND status = 'pending_approval'
  LIMIT 1;

  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'Post not found or already processed.';
  END IF;

  -- Update post status
  UPDATE public.social_posts
  SET status = p_status,
      approved_by = p_approver_name,
      approved_at = CASE WHEN p_status = 'approved' THEN NOW() ELSE approved_at END,
      rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE rejection_reason END,
      approval_token = NULL,
      updated_at = NOW()
  WHERE id = v_post_id;
END;
$$;
