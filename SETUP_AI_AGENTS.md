# Setup Completo — Agentes IA com WhatsApp (UAZAPI)

Guia passo-a-passo para configurar os Agentes IA no **Qualify CRM (OnixCRM)**.

**Stack:** Supabase Edge Functions (Deno) + UAZAPI + OpenAI GPT-5-mini + Groq Whisper

---

## Pré-requisitos

Antes de começar, certifique-se de ter:

- [ ] Acesso ao **Supabase Dashboard** do projeto (`hrarkpjuchrbffnrhzcy`)
- [ ] Conta na **UAZAPI** com Admin Token
- [ ] Chave da **OpenAI API** (para o GPT-5-mini)
- [ ] Chave da **Groq API** (para transcrição de áudio — gratuita)
- [ ] **Supabase CLI** instalada (`npm install -g supabase`)

---

## 1. Executar Migration SQL

Acesse **Supabase Dashboard > SQL Editor** e execute **todo** o conteúdo do arquivo:

```
supabase/migrations/20260318200000_ai_agents_whatsapp.sql
```

Este arquivo cria:

| Objeto | Descrição |
|--------|-----------|
| `ai_agents` | Tabela principal — configuração dos agentes |
| `ai_agent_conversations` | Conversas agrupadas por contacto (janela de 24h) |
| `ai_agent_messages` | Todas as mensagens (user, assistant, system) |
| `ai_agent_connection_log` | Log de eventos de conexão WhatsApp |
| `increment_ai_agent_stats()` | Função para incrementar contadores |
| `update_ai_agent_updated_at()` | Trigger para atualizar `updated_at` |
| Políticas RLS | Isolamento por organização em todas as tabelas |

> **IMPORTANTE:** A migration usa a função `user_belongs_to_org()` que **já deve existir** no projeto. Se não existir, a migration vai falhar. Verifique antes com:
> ```sql
> SELECT proname FROM pg_proc WHERE proname = 'user_belongs_to_org';
> ```

---

## 2. Configurar Secrets no Supabase

### Opção A: Via CLI (recomendado)

```bash
supabase secrets set \
  UAZAPI_BASE_URL="https://kodaflow.uazapi.com" \
  UAZAPI_ADMIN_TOKEN="seu_admin_token_aqui" \
  OPENAI_API_KEY="sk-proj-..." \
  GROQ_API_KEY="gsk_..."
```

### Opção B: Via Dashboard

Vá em **Supabase Dashboard > Settings > Edge Functions > Secrets** e adicione:

| Secret | Obrigatório | Descrição | Onde obter |
|--------|:-----------:|-----------|------------|
| `UAZAPI_BASE_URL` | Sim | URL base da sua instância UAZAPI (sem `/` no final) | Painel UAZAPI — geralmente `https://seudominio.uazapi.com` |
| `UAZAPI_ADMIN_TOKEN` | Sim | Token de administrador da UAZAPI | Painel UAZAPI > Configurações > Admin Token |
| `OPENAI_API_KEY` | Sim | Chave da API OpenAI (usada pelo GPT-5-mini para gerar respostas) | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `GROQ_API_KEY` | Sim | Chave da API Groq (usada pelo Whisper para transcrever áudios) | [console.groq.com/keys](https://console.groq.com/keys) — **gratuita** |

> **Secrets automáticos (NÃO precisa adicionar):**
> - `SUPABASE_URL` — já disponível em todas as Edge Functions
> - `SUPABASE_SERVICE_ROLE_KEY` — já disponível em todas as Edge Functions
> - `SUPABASE_ANON_KEY` — já disponível em todas as Edge Functions

### Referência no `.env` local

O arquivo `.env` na raiz do projeto contém essas mesmas variáveis como referência. **Elas NÃO são usadas pelas Edge Functions** — as Edge Functions leem do Supabase Secrets. O `.env` é apenas para referência/documentação.

---

## 3. Deploy das Edge Functions

### 3.1 Via CLI (recomendado)

```bash
# Login no Supabase (se ainda não fez)
supabase login

# Linkar ao projeto
supabase link --project-ref hrarkpjuchrbffnrhzcy

# Deploy das 3 funções (uma de cada vez)
supabase functions deploy whatsapp-agent-webhook
supabase functions deploy whatsapp-agent-instance
supabase functions deploy whatsapp-agent-config
```

### 3.2 Via Dashboard (alternativa)

1. Vá em **Supabase Dashboard > Edge Functions**
2. Crie cada função clicando em **New Function**
3. Para cada uma, copie o conteúdo do arquivo correspondente:

| Função | Arquivo | JWT |
|--------|---------|:---:|
| `whatsapp-agent-webhook` | `supabase/functions/whatsapp-agent-webhook/index.ts` | **Desabilitado** |
| `whatsapp-agent-instance` | `supabase/functions/whatsapp-agent-instance/index.ts` | Habilitado |
| `whatsapp-agent-config` | `supabase/functions/whatsapp-agent-config/index.ts` | Habilitado |

### 3.3 Configuração de JWT — CRÍTICO

Isto já está definido no `supabase/config.toml`, mas **se fizer deploy pelo Dashboard**, configure manualmente:

| Função | `verify_jwt` | Motivo |
|--------|:------------:|--------|
| `whatsapp-agent-instance` | `true` | Só usuários autenticados podem conectar/desconectar WhatsApp |
| `whatsapp-agent-config` | `true` | Só usuários autenticados podem ler/atualizar configurações |
| `whatsapp-agent-webhook` | **`false`** | Recebe chamadas da UAZAPI (servidor externo, sem JWT). A segurança é via webhook secret na URL |

> **Se `whatsapp-agent-webhook` estiver com JWT habilitado, o webhook da UAZAPI será rejeitado com 401 e o agente NÃO vai funcionar.**

### 3.4 Arquivo `_shared/cors.ts`

As funções `whatsapp-agent-instance` e `whatsapp-agent-config` importam o arquivo `supabase/functions/_shared/cors.ts`. Verifique que ele existe e exporta `getCorsHeaders` e `handleCors`. Ele **já deve existir** no projeto.

---

## 4. Configurar UAZAPI

### 4.1 Obter Admin Token

1. Acesse o painel da sua UAZAPI (`https://seudominio.uazapi.com`)
2. Vá em **Configurações** (ou Settings)
3. Copie o **Admin Token**
4. Coloque como `UAZAPI_ADMIN_TOKEN` nos Supabase Secrets (passo 2)

### 4.2 Fluxo Automático (não precisa fazer nada manual)

Quando o usuário clica em **"Conectar WhatsApp"** na interface:

1. A Edge Function `whatsapp-agent-instance` cria uma instância na UAZAPI via `POST /instance/init`
2. Gera um **webhook secret** aleatório (64 caracteres hex)
3. Configura o webhook da instância apontando para:
   ```
   https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/whatsapp-agent-webhook/{secret}
   ```
4. Solicita conexão via `POST /instance/connect` → retorna **QR Code**
5. O frontend exibe o QR Code e faz polling a cada 4 segundos
6. Quando o WhatsApp é escaneado, o status muda para `connected`

### 4.3 Eventos do Webhook

O webhook recebe dois tipos de eventos da UAZAPI:

| Evento | O que faz |
|--------|-----------|
| `connection` | Atualiza `whatsapp_connected` e `connected_number` no banco |
| `messages` | Processa a mensagem: salva no banco → transcreve áudio se necessário → chama GPT-5-mini → envia resposta |

Mensagens filtradas automaticamente:
- `wasSentByApi` — evita loop infinito (ignora mensagens enviadas pela própria API)
- `isGroupYes` — ignora mensagens de grupos

---

## 5. Verificar CORS

O arquivo `supabase/functions/_shared/cors.ts` já deve existir no projeto. Para confirmar:

```bash
cat supabase/functions/_shared/cors.ts
```

Deve exportar `getCorsHeaders(req)` e `handleCors(req)`. Se não existir, crie com:

```typescript
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }
  return null;
}
```

---

## 6. Testar

### 6.1 Criar um agente

1. Acesse `/app/ai-agents` no CRM
2. Clique em **"Novo Agente"**
3. Dê um nome (ex: "Atendente Restaurante X")
4. Confirme — será redirecionado para a página do agente

### 6.2 Configurar o agente

1. Vá na aba **Configuração**
2. Preencha os campos:
   - **Nome da empresa** — nome do negócio do cliente
   - **Ramo de atividade** — ex: "Restaurante", "Barbearia"
   - **Descrição** — o que a empresa faz
   - **Horário de funcionamento** — ex: "Seg-Sex 8h-18h, Sáb 8h-12h"
   - **Endereço** — localização física
   - **Instruções** — como o agente deve se comportar (ex: "Sempre ofereça o cardápio", "Não dê descontos")
   - **Informações extras** — produtos, preços, promoções, etc.
3. Ajuste as configurações de comportamento:
   - **Tamanho da resposta** — curta, média ou longa
   - **Tempo de espera** — buffer de segundos antes de responder (agrupa mensagens seguidas)
   - **Indicador de digitação** — mostra "digitando..." antes de enviar
   - **Marcar como lido** — marca mensagens como lidas automaticamente
4. **Salve**

### 6.3 Conectar WhatsApp

1. Vá na aba **Conexão**
2. Clique no card **WhatsApp**
3. Clique em **Conectar**
4. Escaneie o QR Code com o celular do cliente (WhatsApp > Dispositivos conectados)
5. Aguarde a confirmação automática (polling a cada 4s)
6. O badge mudará para "Conectado" com o número

### 6.4 Testar resposta

1. De **outro celular**, envie uma mensagem para o número conectado
2. O agente deve responder automaticamente em segundos
3. Teste também enviando um **áudio** — o agente transcreve e responde
4. Verifique as conversas na aba **Conversas** do agente

---

## 7. Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLUXO DE MENSAGEM                          │
│                                                                 │
│  Cliente (WhatsApp)                                             │
│       │                                                         │
│       ▼                                                         │
│  UAZAPI (recebe msg) ──POST──▶ whatsapp-agent-webhook/{secret} │
│                                       │                         │
│                                 ┌─────▼──────────┐             │
│                                 │  1. Valida secret              │
│                                 │  2. Deduplicação               │
│                                 │  3. Detecta tipo (texto/áudio) │
│                                 │  4. Transcreve áudio (Groq)    │
│                                 │  5. Salva mensagem             │
│                                 │  6. Buffer/debounce            │
│                                 │  7. Carrega histórico          │
│                                 │  8. Chama GPT-5-mini           │
│                                 │  9. Salva resposta             │
│                                 │ 10. Envia via UAZAPI           │
│                                 └─────┬──────────┘             │
│                                       │                         │
│  Cliente (WhatsApp) ◀── UAZAPI ◀──────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Edge Functions

| Função | Descrição | JWT | Usada por |
|--------|-----------|:---:|-----------|
| `whatsapp-agent-webhook` | Recebe webhooks da UAZAPI, processa mensagens com IA | Não | UAZAPI (servidor) |
| `whatsapp-agent-instance` | Gerencia instâncias UAZAPI (connect/status/disconnect) | Sim | Frontend (usuário) |
| `whatsapp-agent-config` | Lê e atualiza configurações do agente | Sim | Frontend (usuário) |

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `ai_agents` | Configuração, estado e credenciais UAZAPI de cada agente |
| `ai_agent_conversations` | Conversas agrupadas por contacto (janela de 24h) |
| `ai_agent_messages` | Todas as mensagens com role (user/assistant/system) |
| `ai_agent_connection_log` | Log de eventos de conexão/desconexão |

### Features

- **GPT-5-mini** para gerar respostas inteligentes
- **Groq Whisper** (`whisper-large-v3-turbo`) para transcrever áudios — via UAZAPI `/message/download`
- **Deduplicação** de mensagens via `external_id` + unique index
- **Buffer/debounce** — espera N segundos antes de responder (agrupa mensagens seguidas)
- **Mensagem de boas-vindas** na primeira interação de cada conversa
- **Histórico** de conversação (últimas 50 mensagens como contexto)
- **Conversas por janela de 24h** — nova conversa se passaram 24h desde a última mensagem
- **Indicador de digitação** e marcar como lido configuráveis
- **Tamanho de resposta** configurável (curta/média/longa)
- **Fallback de áudio** — se a transcrição falhar, avisa o cliente para digitar

---

## 8. Secrets — Resumo Completo

```bash
# Comando único para configurar todos os secrets:
supabase secrets set \
  UAZAPI_BASE_URL="https://kodaflow.uazapi.com" \
  UAZAPI_ADMIN_TOKEN="seu_admin_token" \
  OPENAI_API_KEY="sk-proj-..." \
  GROQ_API_KEY="gsk_..."
```

| Secret | Usado por | Para quê |
|--------|-----------|----------|
| `UAZAPI_BASE_URL` | webhook + instance | URL base da API UAZAPI |
| `UAZAPI_ADMIN_TOKEN` | instance | Criar novas instâncias UAZAPI |
| `OPENAI_API_KEY` | webhook | Gerar respostas com GPT-5-mini |
| `GROQ_API_KEY` | webhook | Transcrever áudios com Whisper |
| `SUPABASE_URL` | webhook + instance + config | Já existe automaticamente |
| `SUPABASE_SERVICE_ROLE_KEY` | webhook + instance + config | Já existe automaticamente |
| `SUPABASE_ANON_KEY` | instance | Já existe automaticamente |

---

## 9. Troubleshooting

### Webhook não recebe mensagens
- **Verifique se `whatsapp-agent-webhook` está com `verify_jwt = false`** — esta é a causa mais comum
- Confira os logs: **Supabase Dashboard > Edge Functions > whatsapp-agent-webhook > Logs**
- Verifique se o webhook foi configurado na UAZAPI: a URL deve ser `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/whatsapp-agent-webhook/{secret}`

### QR Code não aparece
- Verifique se `UAZAPI_BASE_URL` e `UAZAPI_ADMIN_TOKEN` estão configurados nos Supabase Secrets
- Confira se a instância foi criada: verifique `uazapi_instance_token` na tabela `ai_agents`
- Veja os logs de `whatsapp-agent-instance`

### Respostas não são enviadas
- Verifique se `OPENAI_API_KEY` está configurado nos Supabase Secrets
- Verifique se o agente está com `status = 'active'` (fica active automaticamente ao conectar WhatsApp)
- Confira os logs do webhook no Dashboard

### Áudio não é transcrito
- Verifique se `GROQ_API_KEY` está configurado nos Supabase Secrets
- A Groq tem rate limits no plano gratuito — verifique se não atingiu o limite
- O agente envia "Desculpe, não consegui entender o áudio. Pode digitar a sua mensagem?" quando a transcrição falha

### Erro de permissão (403)
- O usuário precisa ser membro da organização do agente
- Verifique a tabela `organization_members`

### Loop infinito (bot responde a si mesmo)
- O webhook da UAZAPI está configurado com `excludeMessages: ["wasSentByApi"]`
- Além disso, mensagens `fromMe` são salvas mas NÃO processadas com IA
- Se ainda assim houver loop, verifique se `excludeMessages` está correto na configuração do webhook UAZAPI

### Migration falha
- Verifique se a função `user_belongs_to_org()` existe no banco
- Verifique se as tabelas `organizations` e `clients` existem
