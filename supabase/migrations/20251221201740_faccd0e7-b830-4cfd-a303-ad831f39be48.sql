-- Criar função SECURITY DEFINER para obter email do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Remover policy problemática e recriar com função segura
DROP POLICY IF EXISTS "Users can view invites to their email" ON public.organization_invites;

CREATE POLICY "Users can view invites to their email"
ON public.organization_invites
FOR SELECT
USING (email = public.get_current_user_email());

-- Adicionar policy para owners da organização poderem ver membros
DROP POLICY IF EXISTS "Organization owners can view members" ON public.organization_members;
CREATE POLICY "Organization owners can view members"
ON public.organization_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organizations
    WHERE organizations.id = organization_members.organization_id
    AND organizations.owner_id = auth.uid()
  )
);

-- Policy para owners verem profiles de membros da organização
DROP POLICY IF EXISTS "Organization owners can view member profiles" ON public.profiles;
CREATE POLICY "Organization owners can view member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = profiles.id
    AND o.owner_id = auth.uid()
    AND om.is_active = true
  )
);