-- Criar tabela de membros de organização (relação N:N)
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'sales',
  is_active boolean NOT NULL DEFAULT true,
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  removed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Habilitar RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Adicionar coluna current_organization_id ao profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES public.organizations(id);

-- Migrar dados existentes de profiles.organization_id para organization_members
INSERT INTO public.organization_members (user_id, organization_id, role)
SELECT id, organization_id, role 
FROM public.profiles 
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Atualizar current_organization_id com os valores existentes
UPDATE public.profiles 
SET current_organization_id = organization_id 
WHERE organization_id IS NOT NULL AND current_organization_id IS NULL;

-- Função para verificar se usuário é membro ativo de uma organização
CREATE OR REPLACE FUNCTION public.user_is_member_of_org(user_uuid uuid, org_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_uuid 
    AND is_active = true
  )
$$;

-- Função para obter organizações de um usuário
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid uuid)
RETURNS TABLE(organization_id uuid, organization_name text, role public.user_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT om.organization_id, o.name, om.role
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE om.user_id = user_uuid AND om.is_active = true
$$;

-- Função para definir organização atual do usuário
CREATE OR REPLACE FUNCTION public.set_current_organization(user_uuid uuid, org_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é membro ativo da organização
  IF NOT public.user_is_member_of_org(user_uuid, org_uuid) THEN
    RETURN false;
  END IF;
  
  -- Atualizar organização atual
  UPDATE public.profiles 
  SET current_organization_id = org_uuid, updated_at = now()
  WHERE id = user_uuid;
  
  RETURN true;
END;
$$;

-- Função para remover usuário de uma equipe (não deleta o usuário)
CREATE OR REPLACE FUNCTION public.remove_from_team(member_user_id uuid, org_uuid uuid, removed_by_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Verificar se quem remove é admin da organização
  IF NOT (public.is_admin(removed_by_user_id) AND public.user_is_member_of_org(removed_by_user_id, org_uuid)) THEN
    RETURN false;
  END IF;
  
  -- Desativar membro
  UPDATE public.organization_members 
  SET is_active = false, 
      removed_at = now(), 
      removed_by = removed_by_user_id,
      updated_at = now()
  WHERE user_id = member_user_id 
  AND organization_id = org_uuid
  AND is_active = true;
  
  -- Se a organização atual do usuário era esta, limpar
  UPDATE public.profiles 
  SET current_organization_id = NULL, updated_at = now()
  WHERE id = member_user_id 
  AND current_organization_id = org_uuid;
  
  RETURN true;
END;
$$;

-- Políticas RLS para organization_members

-- Proprietors podem gerenciar todos
CREATE POLICY "Proprietors can manage all organization members"
ON public.organization_members
FOR ALL
USING (public.has_role(auth.uid(), 'proprietor'))
WITH CHECK (public.has_role(auth.uid(), 'proprietor'));

-- Admins podem ver membros da sua organização
CREATE POLICY "Admins can view organization members"
ON public.organization_members
FOR SELECT
USING (
  public.is_admin(auth.uid()) 
  AND public.user_is_member_of_org(auth.uid(), organization_id)
);

-- Admins podem inserir membros na sua organização
CREATE POLICY "Admins can insert organization members"
ON public.organization_members
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) 
  AND public.user_is_member_of_org(auth.uid(), organization_id)
);

-- Admins podem atualizar membros da sua organização
CREATE POLICY "Admins can update organization members"
ON public.organization_members
FOR UPDATE
USING (
  public.is_admin(auth.uid()) 
  AND public.user_is_member_of_org(auth.uid(), organization_id)
);

-- Usuários podem ver seus próprios registros
CREATE POLICY "Users can view own memberships"
ON public.organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();