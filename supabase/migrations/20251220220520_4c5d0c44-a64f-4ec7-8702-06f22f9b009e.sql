-- Política para permitir que owners da organização possam inserir membros
CREATE POLICY "Organization owners can insert members"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id
    AND owner_id = auth.uid()
  )
);

-- Política para permitir que owners possam atualizar membros
CREATE POLICY "Organization owners can update members"
ON public.organization_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id
    AND owner_id = auth.uid()
  )
);

-- Política para permitir que owners possam visualizar membros
CREATE POLICY "Organization owners can view members"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = organization_id
    AND owner_id = auth.uid()
  )
);

-- Corrigir dados existentes: adicionar organization_members para owners que não têm registro
INSERT INTO public.organization_members (user_id, organization_id, role, is_active)
SELECT o.owner_id, o.id, 'admin', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.organization_members om
  WHERE om.user_id = o.owner_id 
  AND om.organization_id = o.id
)
AND o.owner_id IS NOT NULL;