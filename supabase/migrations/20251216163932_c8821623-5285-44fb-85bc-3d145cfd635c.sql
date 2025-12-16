-- Fix PUBLIC_DATA_EXPOSURE: AI Conversations expose all client data cross-user
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view all conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can view all messages" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can create conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can create messages" ON public.ai_messages;

-- Restrict conversations to owner or admin
CREATE POLICY "Users can view own client conversations"
ON public.ai_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = ai_conversations.client_id
    AND (clients.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can create conversations for own clients"
ON public.ai_conversations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_id
    AND (clients.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can update own client conversations"
ON public.ai_conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = ai_conversations.client_id
    AND (clients.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- Restrict messages to conversations the user can access
CREATE POLICY "Users can view messages for accessible conversations"
ON public.ai_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ai_conversations
    JOIN public.clients ON clients.id = ai_conversations.client_id
    WHERE ai_conversations.id = ai_messages.conversation_id
    AND (clients.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can create messages in accessible conversations"
ON public.ai_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_conversations
    JOIN public.clients ON clients.id = ai_conversations.client_id
    WHERE ai_conversations.id = conversation_id
    AND (clients.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- Fix STORAGE_EXPOSURE: Client contracts accessible to all users
-- Drop the overly permissive contracts policies
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON storage.objects;

-- Create a function to check if user owns the client for a contract path
CREATE OR REPLACE FUNCTION public.user_owns_contract(contract_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_uuid uuid;
BEGIN
  -- Extract client ID from path (format: {client_id}/{filename})
  client_uuid := split_part(contract_path, '/', 1)::uuid;
  
  -- Check if user owns this client or is admin
  RETURN EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = client_uuid
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()))
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Create secure storage policies
CREATE POLICY "Users can upload contracts for own clients"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts' AND
  public.user_owns_contract(name)
);

CREATE POLICY "Users can view contracts for own clients"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts' AND
  public.user_owns_contract(name)
);

CREATE POLICY "Users can update contracts for own clients"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  public.user_owns_contract(name)
);

CREATE POLICY "Users can delete contracts for own clients"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  public.user_owns_contract(name)
);