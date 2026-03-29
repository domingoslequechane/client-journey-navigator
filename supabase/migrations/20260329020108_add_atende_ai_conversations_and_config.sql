-- Adicionar campos ausentes em atende_ai_instances baseados na estrutura de AIAgent
ALTER TABLE public.atende_ai_instances
ADD COLUMN IF NOT EXISTS company_sector text,
ADD COLUMN IF NOT EXISTS company_description text,
ADD COLUMN IF NOT EXISTS business_hours text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS address_reference text,
ADD COLUMN IF NOT EXISTS extra_info text,
ADD COLUMN IF NOT EXISTS response_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS response_delay_seconds integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS show_typing boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mark_as_read boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS human_pause_duration integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS total_conversations integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_messages integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS evolution_webhook_secret uuid DEFAULT gen_random_uuid();

-- Criar tabela de conversas exclusiva para Atende AI
CREATE TABLE IF NOT EXISTS public.atende_ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    instance_id uuid NOT NULL REFERENCES public.atende_ai_instances(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_name text NOT NULL,
    contact_phone text,
    contact_email text,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    message_count integer DEFAULT 0,
    last_message_at timestamp with time zone DEFAULT now() NOT NULL,
    last_presence_at timestamp with time zone,
    paused_until timestamp with time zone,
    waiting_human boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Ativar RLS
ALTER TABLE public.atende_ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view atende_ai_conversations" ON public.atende_ai_conversations
    FOR SELECT USING (organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE (organization_members.user_id = auth.uid())
    ));

CREATE POLICY "Users can insert atende_ai_conversations" ON public.atende_ai_conversations
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE (organization_members.user_id = auth.uid())
    ));

CREATE POLICY "Users can update atende_ai_conversations" ON public.atende_ai_conversations
    FOR UPDATE USING (organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE (organization_members.user_id = auth.uid())
    ));

-- Criar tabela de mensagens exclusiva para Atende AI
CREATE TABLE IF NOT EXISTS public.atende_ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    conversation_id uuid NOT NULL REFERENCES public.atende_ai_conversations(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    external_id text,
    quoted_message_id text,
    quoted_message_content text,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Ativar RLS
ALTER TABLE public.atende_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view atende_ai_messages" ON public.atende_ai_messages
    FOR SELECT USING (organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE (organization_members.user_id = auth.uid())
    ));

CREATE POLICY "Users can insert atende_ai_messages" ON public.atende_ai_messages
    FOR INSERT WITH CHECK (organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE (organization_members.user_id = auth.uid())
    ));

CREATE POLICY "Users can update atende_ai_messages" ON public.atende_ai_messages
    FOR UPDATE USING (organization_id IN (
        SELECT organization_members.organization_id
        FROM public.organization_members
        WHERE (organization_members.user_id = auth.uid())
    ));

-- RPC para incrementar estatísticas de mensagens do Atende AI (parecido com increment_ai_agent_stats)
CREATE OR REPLACE FUNCTION increment_atende_ai_stats(p_instance_id uuid, p_conversations int, p_messages int)
RETURNS void AS $$
BEGIN
    UPDATE public.atende_ai_instances
    SET 
        total_conversations = total_conversations + p_conversations,
        total_messages = total_messages + p_messages,
        last_activity_at = CASE WHEN p_messages > 0 OR p_conversations > 0 THEN now() ELSE last_activity_at END
    WHERE id = p_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
