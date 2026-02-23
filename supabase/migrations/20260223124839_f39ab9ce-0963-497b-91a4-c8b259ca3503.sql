
-- =============================================
-- Social Accounts table
-- =============================================
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  platform text NOT NULL,
  account_name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  avatar_url text,
  access_token text,
  is_connected boolean NOT NULL DEFAULT true,
  followers_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;

-- Members can view accounts in their org
CREATE POLICY "Members can view org social accounts"
  ON public.social_accounts FOR SELECT
  USING (user_is_member_of_org(auth.uid(), organization_id));

-- Members can create accounts in their org
CREATE POLICY "Members can create org social accounts"
  ON public.social_accounts FOR INSERT
  WITH CHECK (user_is_member_of_org(auth.uid(), organization_id));

-- Members can update accounts in their org
CREATE POLICY "Members can update org social accounts"
  ON public.social_accounts FOR UPDATE
  USING (user_is_member_of_org(auth.uid(), organization_id));

-- Admins can delete accounts in their org
CREATE POLICY "Admins can delete org social accounts"
  ON public.social_accounts FOR DELETE
  USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Social Posts table
-- =============================================
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid,
  content text NOT NULL DEFAULT '',
  media_urls jsonb DEFAULT '[]'::jsonb,
  platforms text[] NOT NULL DEFAULT '{}',
  content_type text NOT NULL DEFAULT 'feed',
  hashtags text[] DEFAULT '{}',
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  approval_token uuid DEFAULT gen_random_uuid(),
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,
  published_at timestamptz,
  metrics jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Members can view posts in their org
CREATE POLICY "Members can view org social posts"
  ON public.social_posts FOR SELECT
  USING (user_is_member_of_org(auth.uid(), organization_id));

-- Members can create posts in their org
CREATE POLICY "Members can create org social posts"
  ON public.social_posts FOR INSERT
  WITH CHECK (user_is_member_of_org(auth.uid(), organization_id));

-- Members can update posts in their org
CREATE POLICY "Members can update org social posts"
  ON public.social_posts FOR UPDATE
  USING (user_is_member_of_org(auth.uid(), organization_id));

-- Admins can delete posts in their org
CREATE POLICY "Admins can delete org social posts"
  ON public.social_posts FOR DELETE
  USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- Public access for approval page (by token, no auth needed)
CREATE POLICY "Anyone can view posts by approval token"
  ON public.social_posts FOR SELECT
  USING (approval_token IS NOT NULL);

-- Public update for approval (by token)
CREATE POLICY "Anyone can update post status via approval token"
  ON public.social_posts FOR UPDATE
  USING (approval_token IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique index on approval_token for fast lookup
CREATE INDEX idx_social_posts_approval_token ON public.social_posts(approval_token) WHERE approval_token IS NOT NULL;
CREATE INDEX idx_social_posts_org_status ON public.social_posts(organization_id, status);
CREATE INDEX idx_social_posts_scheduled ON public.social_posts(scheduled_at) WHERE status = 'scheduled';

-- =============================================
-- Storage bucket for social media assets
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true);

-- Storage policies
CREATE POLICY "Members can upload social media files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-media' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view social media files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-media');

CREATE POLICY "Members can update own social media files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'social-media' AND auth.role() = 'authenticated');

CREATE POLICY "Members can delete social media files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'social-media' AND auth.role() = 'authenticated');
