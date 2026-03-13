-- Adiciona coluna 'completed' à tabela study_suggestions
ALTER TABLE public.study_suggestions ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Adiciona política para permitir que os usuários atualizem suas próprias sugestões
-- Primeiro removemos a política existente se houver
DROP POLICY IF EXISTS "Users can update their own organization study suggestions" ON public.study_suggestions;

-- Cria a nova política de UPDATE
CREATE POLICY "Users can update their own organization study suggestions"
ON public.study_suggestions
FOR UPDATE
USING (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);
