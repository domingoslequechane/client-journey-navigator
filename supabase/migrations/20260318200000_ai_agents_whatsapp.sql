-- ============================================================
-- AI Agents + WhatsApp UAZAPI Integration
-- ============================================================

-- 1. Tabela principal: Agentes de IA
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'paused')),

  -- Configuração da IA
  welcome_message text DEFAULT NULL,
  company_name text DEFAULT NULL,
  company_sector text DEFAULT NULL,
  company_description text DEFAULT NULL,
  business_hours text DEFAULT NULL,
  address text DEFAULT NULL,
  address_reference text DEFAULT NULL,
  instructions text DEFAULT NULL,
  extra_info text DEFAULT NULL,
  response_size integer DEFAULT 2 CHECK (response_size BETWEEN 1 AND 3), -- 1=curta, 2=média, 3=longa

  -- Comportamento no chat
  response_delay_seconds integer DEFAULT 3 CHECK (response_delay_seconds BETWEEN 0 AND 10),
  show_typing boolean DEFAULT true,
  mark_as_read boolean DEFAULT true,

  -- WhatsApp / UAZAPI
  uazapi_instance_id text,
  uazapi_instance_token text,
  uazapi_webhook_secret text,
  whatsapp_connected boolean DEFAULT false,
  connected_number text,

  -- Estatísticas (desnormalizadas para performance)
  total_conversations integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  last_activity_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON public.ai_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_client ON public.ai_agents(client_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON public.ai_agents(organization_id, status);

-- RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agents in their organization"
  ON public.ai_agents FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Users can create agents in their organization"
  ON public.ai_agents FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Users can update agents in their organization"
  ON public.ai_agents FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Users can delete agents in their organization"
  ON public.ai_agents FOR DELETE
  USING (
    organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), organization_id)
  );

-- 2. Conversas do agente
CREATE TABLE IF NOT EXISTS public.ai_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_name text DEFAULT NULL,
  contact_phone text,
  contact_email text,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'instagram', 'messenger', 'webchat')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  message_count integer DEFAULT 0,
  last_message_at timestamptz DEFAULT now(),
  started_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_conv_agent ON public.ai_agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conv_org ON public.ai_agent_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conv_phone ON public.ai_agent_conversations(agent_id, contact_phone, status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conv_status ON public.ai_agent_conversations(agent_id, status);

ALTER TABLE public.ai_agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations in their organization"
  ON public.ai_agent_conversations FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Service role can manage conversations"
  ON public.ai_agent_conversations FOR ALL
  USING (auth.role() = 'service_role');

-- 3. Mensagens da conversa
CREATE TABLE IF NOT EXISTS public.ai_agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_agent_conversations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_id text, -- message ID da UAZAPI (deduplicação)
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_msg_conv ON public.ai_agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_msg_org ON public.ai_agent_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_msg_ext ON public.ai_agent_messages(organization_id, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_agent_msg_dedup ON public.ai_agent_messages(conversation_id, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.ai_agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their organization"
  ON public.ai_agent_messages FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), organization_id)
  );

CREATE POLICY "Service role can manage messages"
  ON public.ai_agent_messages FOR ALL
  USING (auth.role() = 'service_role');

-- 4. Log de conexão WhatsApp
CREATE TABLE IF NOT EXISTS public.ai_agent_connection_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  event text NOT NULL, -- 'connected', 'disconnected', 'error'
  details text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_conn_log ON public.ai_agent_connection_log(agent_id);

ALTER TABLE public.ai_agent_connection_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connection logs in their org"
  ON public.ai_agent_connection_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = agent_id
      AND user_belongs_to_org(auth.uid(), a.organization_id)
    )
  );

CREATE POLICY "Service role can manage connection logs"
  ON public.ai_agent_connection_log FOR ALL
  USING (auth.role() = 'service_role');

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_ai_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_agent_updated_at();

-- 6. Função para incrementar contadores do agente
CREATE OR REPLACE FUNCTION public.increment_ai_agent_stats(
  p_agent_id uuid,
  p_conversations integer DEFAULT 0,
  p_messages integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
  UPDATE public.ai_agents
  SET
    total_conversations = total_conversations + p_conversations,
    total_messages = total_messages + p_messages,
    last_activity_at = now()
  WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
