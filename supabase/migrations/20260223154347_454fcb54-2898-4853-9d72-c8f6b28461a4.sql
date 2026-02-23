
CREATE TABLE public.social_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  social_account_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'dm',
  post_id TEXT,
  sender_name TEXT NOT NULL,
  sender_username TEXT,
  sender_avatar_url TEXT,
  content TEXT NOT NULL,
  reply_content TEXT,
  replied_at TIMESTAMPTZ,
  is_read BOOLEAN NOT NULL DEFAULT false,
  external_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_messages_org_read ON public.social_messages(organization_id, is_read);
CREATE INDEX idx_social_messages_client ON public.social_messages(client_id);
CREATE UNIQUE INDEX idx_social_messages_external ON public.social_messages(organization_id, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.social_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org messages"
  ON public.social_messages FOR SELECT
  USING (user_is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Members can insert org messages"
  ON public.social_messages FOR INSERT
  WITH CHECK (user_is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Members can update org messages"
  ON public.social_messages FOR UPDATE
  USING (user_is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Members can delete org messages"
  ON public.social_messages FOR DELETE
  USING (user_is_member_of_org(auth.uid(), organization_id));

CREATE POLICY "Service role full access social_messages"
  ON public.social_messages FOR ALL
  USING (true)
  WITH CHECK (true);
