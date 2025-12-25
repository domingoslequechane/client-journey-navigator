-- Create table for message favorites (shared across team)
CREATE TABLE public.ai_message_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One favorite per message per organization (team-wide)
  UNIQUE(message_id, organization_id)
);

-- Create indexes for performance
CREATE INDEX idx_ai_message_favorites_org ON public.ai_message_favorites(organization_id);
CREATE INDEX idx_ai_message_favorites_message ON public.ai_message_favorites(message_id);

-- Enable RLS
ALTER TABLE public.ai_message_favorites ENABLE ROW LEVEL SECURITY;

-- RLS: Team members can view favorites in their organization
CREATE POLICY "Team members can view favorites"
  ON public.ai_message_favorites
  FOR SELECT
  USING (public.user_is_member_of_org(auth.uid(), organization_id));

-- RLS: Team members can add favorites
CREATE POLICY "Team members can add favorites"
  ON public.ai_message_favorites
  FOR INSERT
  WITH CHECK (public.user_is_member_of_org(auth.uid(), organization_id));

-- RLS: Team members can remove favorites
CREATE POLICY "Team members can remove favorites"
  ON public.ai_message_favorites
  FOR DELETE
  USING (public.user_is_member_of_org(auth.uid(), organization_id));