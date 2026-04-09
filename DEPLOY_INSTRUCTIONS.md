# Instruções de Deploy — Qualify (Evolution Go Integration Fix)

## Contexto

Foram corrigidas as Edge Functions de integração com a **Evolution Go API** (WhatsApp).
As funções que precisam ser re-deployed no Supabase são:

1. `evolution-go-webhook` — recebe eventos do Evolution Go (QR code, conexão, mensagens)
2. `whatsapp-agent-instance` — gere instâncias (criar, conectar, desconectar, status, enviar mensagem)

As outras Edge Functions **NÃO foram alteradas** e não precisam de redeploy.

---

## PASSO 1 — Deploy das Edge Functions

Deploy **apenas** as 2 funções alteradas. A ordem não importa, podem ser feitas em paralelo.

```bash
# Função 1: webhook que recebe eventos da Evolution Go
supabase functions deploy evolution-go-webhook --no-verify-jwt

# Função 2: gestão de instâncias (criar, conectar, status, etc.)
supabase functions deploy whatsapp-agent-instance
```

### IMPORTANTE sobre `--no-verify-jwt`:
- `evolution-go-webhook` **PRECISA** de `--no-verify-jwt` porque é chamado directamente pela Evolution Go (não tem token JWT do Supabase)
- `whatsapp-agent-instance` **NÃO precisa** de `--no-verify-jwt` porque é chamado pelo frontend via `supabase.functions.invoke()` que envia o JWT automaticamente

### Ficheiros de cada função:
- `supabase/functions/evolution-go-webhook/index.ts`
- `supabase/functions/whatsapp-agent-instance/index.ts`
- `supabase/functions/_shared/cors.ts` (dependência partilhada, já deve estar deployed)

---

## PASSO 2 — Configurar Secrets (Variáveis de Ambiente)

As Edge Functions precisam destas variáveis configuradas nos **Supabase Secrets**.
Verificar se já existem. Se não existirem, criar:

```bash
# Obrigatórias para Evolution Go:
supabase secrets set EVOLUTION_GO_URL="https://SEU-SERVIDOR-EVOLUTION.com"
supabase secrets set EVOLUTION_GO_API_KEY="SUA-CHAVE-GLOBAL-DA-EVOLUTION-GO"

# Obrigatória para IA (respostas automáticas):
supabase secrets set OPENAI_API_KEY="sk-..."

# Opcional — só se o módulo AI Agents (legado UAZAPI) estiver activo:
supabase secrets set UAZAPI_BASE_URL="https://api.uazapi.com"
supabase secrets set GROQ_API_KEY="gsk_..."
```

### Como verificar se já estão configuradas:
```bash
supabase secrets list
```

Deve mostrar pelo menos: `EVOLUTION_GO_URL`, `EVOLUTION_GO_API_KEY`, `OPENAI_API_KEY`.

**NOTA:** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injectadas automaticamente pelo Supabase nas Edge Functions — NÃO precisam ser configuradas manualmente.

---

## PASSO 3 — Verificar Tabelas no Banco de Dados

As funções dependem destas tabelas. Verificar se existem (devem ter sido criadas pelas migrations):

### Tabela `atende_ai_instances` (usada pelo AtendeAI)
Campos obrigatórios:
- `id` (uuid, PK)
- `organization_id` (uuid, FK)
- `name` (text)
- `evolution_instance_id` (text) — ID técnico na Evolution Go
- `evolution_id` (text) — ID retornado pela Evolution Go
- `instance_api_key` (text) — token da instância
- `evolution_webhook_secret` (uuid) — secret no URL do webhook
- `whatsapp_connected` (boolean)
- `status` (text) — "active" | "inactive"
- `connected_number` (text)
- `qr_code_base64` (text) — QR code salvo pelo webhook
- `welcome_message` (text)
- `instructions` (text)
- `show_typing` (boolean)
- `response_delay_seconds` (integer)

### Tabela `atende_ai_conversations`
- `id`, `instance_id`, `organization_id`, `contact_name`, `contact_phone`, `channel`, `status`, `last_message_at`, `paused_until`

### Tabela `atende_ai_messages`
- `id`, `conversation_id`, `organization_id`, `external_id`, `role`, `content`, `message_type`, `created_at`

### RPC obrigatória:
- `increment_atende_ai_stats(p_instance_id, p_conversations, p_messages)`

A migration que cria tudo isto é: `20260329020108_add_atende_ai_conversations_and_config.sql`

Para verificar se já foi aplicada:
```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version = '20260329020108';
```

Se NÃO foi aplicada:
```bash
supabase db push
```

---

## PASSO 4 — Testar o Fluxo

### 4.1 Testar criação de instância
No dashboard do Qualify, ir em **AtendeAI** → **Criar novo atendente**.
Verificar nos logs do Supabase se:
- A Edge Function `whatsapp-agent-instance` foi chamada com `action: create`
- A Evolution Go respondeu com sucesso (status 200)
- O registro foi criado na tabela `atende_ai_instances`

### 4.2 Testar conexão WhatsApp
Clicar em **Conectar** → **Gerar QR Code**.
Verificar se:
- O QR code aparece na UI
- O webhook `evolution-go-webhook` recebe o evento `QRCODE`
- Após escanear, o webhook recebe `CONNECTION` com status `open`
- A UI mostra "WhatsApp conectado"

### 4.3 Testar envio/recepção de mensagens
Enviar uma mensagem para o número conectado.
Verificar se:
- O webhook recebe o evento `MESSAGE`
- A mensagem é salva em `atende_ai_messages`
- A IA gera uma resposta via OpenAI
- A resposta é enviada via `POST /send/text` da Evolution Go

---

## Resumo dos Endpoints usados (Evolution Go API)

| Acção | Método | Endpoint | Auth |
|---|---|---|---|
| Criar instância | POST | `/instance/create` | Global API Key |
| Conectar | POST | `/instance/connect` | Instance Token |
| Status | GET | `/instance/status` | Instance Token |
| QR Code | GET | `/instance/qr` | Instance Token |
| Desconectar | POST | `/instance/disconnect` | Instance Token |
| Logout | POST | `/instance/logout` | Instance Token |
| Deletar | DELETE | `/instance/delete/{name}` | Instance Token |
| Listar todas | GET | `/instance/all` | Global API Key |
| Enviar texto | POST | `/send/text` | Instance Token |

---

## O que foi alterado neste commit

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/evolution-go-webhook/index.ts` | Endpoint de envio corrigido (`/send/text`), eventos normalizados, parsing dual-format |
| `supabase/functions/whatsapp-agent-instance/index.ts` | API key hardcoded removida, webhook no create body, action `send-text` adicionada |
| `src/hooks/useAtendeAIDetail.ts` | Chamadas directas à Evolution Go removidas do frontend (segurança) |
| `src/hooks/useAtendeAI.ts` | Bugs corrigidos: `syncInstance` sem `instance_id`, rollback sem `organization_id` |
| `src/components/atende-ai/ConnectionTab.tsx` | `EVOLUTION_GO_URL` removida do frontend |
