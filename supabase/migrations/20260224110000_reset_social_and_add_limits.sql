-- Add columns to clients table for disconnection control
ALTER TABLE public.clients ADD COLUMN social_disconnection_count INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN is_social_locked BOOLEAN DEFAULT FALSE;

-- Cleanup existing social media data to ensure a fresh start with the new counting logic
DELETE FROM public.social_messages;
DELETE FROM public.social_posts;
DELETE FROM public.social_accounts;

-- Reset usage tracking for social_posts
DELETE FROM public.usage_tracking WHERE feature_type = 'social_posts';

-- RPC to handle social disconnection: increments the counter and locks the client if limit reached
CREATE OR REPLACE FUNCTION public.handle_social_disconnection(p_client_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clients
  SET 
    social_disconnection_count = social_disconnection_count + 1,
    is_social_locked = CASE WHEN social_disconnection_count + 1 >= 3 THEN TRUE ELSE FALSE END
  WHERE id = p_client_id;
END;
$$;

-- RPC to get count of unique clients with social accounts for an organization
CREATE OR REPLACE FUNCTION public.get_social_clients_count(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(DISTINCT client_id)::INTEGER
  FROM public.social_accounts
  WHERE organization_id = p_organization_id;
$$;