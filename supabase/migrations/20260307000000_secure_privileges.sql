-- =============================================
-- SECURITY HARDENING: GRANULAR PRIVILEGES ENFORCEMENT
-- =============================================

-- 1. Helper Function: Check if user has a specific privilege
CREATE OR REPLACE FUNCTION public.check_privilege(p_user_id UUID, p_privilege TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_privileges TEXT[];
    v_role TEXT;
BEGIN
    SELECT privileges, role INTO v_privileges, v_role
    FROM public.profiles
    WHERE id = p_user_id;

    -- Admin privilege or role 'admin' bypasses all checks
    IF v_role = 'admin' OR 'admin' = ANY(v_privileges) THEN
        RETURN TRUE;
    END IF;

    -- Check for the specific privilege
    RETURN p_privilege = ANY(v_privileges);
END;
$$;

-- 2. Helper Function: Check if user is admin of their organization
CREATE OR REPLACE FUNCTION public.is_org_admin(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id 
        AND organization_id = p_org_id
        AND (role = 'admin' OR 'admin' = ANY(privileges) OR 'team' = ANY(privileges))
    );
END;
$$;

-- 3. Update Clients Table Policies
DROP POLICY IF EXISTS "Users can view clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients in their organization" ON public.clients;

-- Vendas e Designers podem ver clientes
CREATE POLICY "Privileged users can view organization clients"
ON public.clients FOR SELECT
USING (
    organization_id IS NOT NULL 
    AND (
        check_privilege(auth.uid(), 'sales') OR 
        check_privilege(auth.uid(), 'designer')
    )
    AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Apenas Vendas ou Admin podem criar/editar/deletar clientes
CREATE POLICY "Sales users can manage organization clients"
ON public.clients FOR ALL
USING (
    organization_id IS NOT NULL 
    AND check_privilege(auth.uid(), 'sales')
    AND user_belongs_to_org(auth.uid(), organization_id)
)
WITH CHECK (
    organization_id IS NOT NULL 
    AND check_privilege(auth.uid(), 'sales')
    AND user_belongs_to_org(auth.uid(), organization_id)
);

-- 4. Update Organization Members Policies (Self-management and Team Management)
DROP POLICY IF EXISTS "Organization members can view other members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON public.organization_members;

-- Todos os membros da org podem ver a lista de equipe
CREATE POLICY "Members can view organization team"
ON public.organization_members FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Apenas membros com privilégio 'team' ou 'admin' podem gerenciar membros
CREATE POLICY "Team managers can manage organization members"
ON public.organization_members FOR ALL
USING (
    organization_id IS NOT NULL 
    AND (check_privilege(auth.uid(), 'team') OR check_privilege(auth.uid(), 'admin'))
    AND user_belongs_to_org(auth.uid(), organization_id)
)
WITH CHECK (
    organization_id IS NOT NULL 
    AND (check_privilege(auth.uid(), 'team') OR check_privilege(auth.uid(), 'admin'))
    AND user_belongs_to_org(auth.uid(), organization_id)
);

-- 5. Social Posts hardening
DROP POLICY IF EXISTS "Social post policies" ON public.social_posts; -- Placeholder if exists

CREATE POLICY "Social media users can manage social posts"
ON public.social_posts FOR ALL
USING (
    organization_id IS NOT NULL 
    AND (check_privilege(auth.uid(), 'social_media') OR check_privilege(auth.uid(), 'editorial'))
    AND user_belongs_to_org(auth.uid(), organization_id)
);
