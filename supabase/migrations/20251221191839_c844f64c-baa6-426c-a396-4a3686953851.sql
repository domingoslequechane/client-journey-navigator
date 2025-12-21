-- Criar tabela de convites para organizações
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'sales',
  invited_by UUID NOT NULL,
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT unique_pending_invite UNIQUE NULLS NOT DISTINCT (organization_id, email, status)
);

-- Criar índices para performance
CREATE INDEX idx_organization_invites_org_id ON public.organization_invites(organization_id);
CREATE INDEX idx_organization_invites_email ON public.organization_invites(email);
CREATE INDEX idx_organization_invites_token ON public.organization_invites(invite_token);
CREATE INDEX idx_organization_invites_status ON public.organization_invites(status);

-- Habilitar RLS
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Policies para admins da organização
CREATE POLICY "Admins can view organization invites"
ON public.organization_invites
FOR SELECT
USING (
  public.is_admin(auth.uid()) 
  AND public.user_is_member_of_org(auth.uid(), organization_id)
);

CREATE POLICY "Admins can create organization invites"
ON public.organization_invites
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) 
  AND public.user_is_member_of_org(auth.uid(), organization_id)
);

CREATE POLICY "Admins can update organization invites"
ON public.organization_invites
FOR UPDATE
USING (
  public.is_admin(auth.uid()) 
  AND public.user_is_member_of_org(auth.uid(), organization_id)
);

-- Policy para proprietários verem todos os convites
CREATE POLICY "Proprietors can manage all invites"
ON public.organization_invites
FOR ALL
USING (public.has_role(auth.uid(), 'proprietor'))
WITH CHECK (public.has_role(auth.uid(), 'proprietor'));

-- Policy para usuários verem convites direcionados a eles (para aceitar)
CREATE POLICY "Users can view invites to their email"
ON public.organization_invites
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy para owners da organização
CREATE POLICY "Organization owners can manage invites"
ON public.organization_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_invites.organization_id
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_invites.organization_id
    AND owner_id = auth.uid()
  )
);