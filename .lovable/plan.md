

# Plano: Inbox de Mensagens Sociais + Seguidores em Tempo Real nos Relatorios

## Resumo

Adicionar uma nova aba **Inbox** ao modulo Social Media para receber e responder mensagens diretas (DMs) e comentarios das contas conectadas. Alem disso, adicionar o total de seguidores em tempo real na aba de Relatorios.

---

## 1. Nova Tabela: `social_messages`

Criar tabela no Supabase para armazenar mensagens recebidas (DMs e comentarios):

```text
social_messages
- id (uuid, PK)
- organization_id (uuid, NOT NULL)
- social_account_id (uuid, NOT NULL, FK -> social_accounts.id)
- client_id (uuid, nullable)
- platform (text, NOT NULL) -- instagram, facebook, etc.
- message_type (text, NOT NULL) -- 'dm' ou 'comment'
- post_id (text, nullable) -- ID do post se for comentario
- sender_name (text, NOT NULL)
- sender_username (text, nullable)
- sender_avatar_url (text, nullable)
- content (text, NOT NULL)
- reply_content (text, nullable) -- resposta enviada
- replied_at (timestamptz, nullable)
- is_read (boolean, default false)
- external_id (text, nullable) -- ID da mensagem na plataforma
- received_at (timestamptz, default now())
- created_at (timestamptz, default now())
```

Politicas RLS: membros da organizacao podem SELECT, UPDATE (para marcar como lido e responder), e INSERT (para sincronizacao).

## 2. Nova Aba: Inbox

Adicionar `'inbox'` ao tipo `TabValue` em `SocialMedia.tsx` com icone `MessageCircle`.

### Componente: `SocialInbox.tsx`

Layout dividido em 2 paineis (estilo email/chat):

**Painel esquerdo - Lista de conversas:**
- Filtros: Todas | DMs | Comentarios
- Filtro por plataforma (icones)
- Busca por nome/conteudo
- Lista de mensagens com: avatar do remetente, nome, preview da mensagem, plataforma (icone), timestamp, badge de "nao lido"
- Contador de nao lidas no topo

**Painel direito - Detalhe da conversa:**
- Header: avatar + nome + username + plataforma
- Se for comentario: mostra o post original (imagem + legenda)
- Historico de mensagens (bolhas de chat)
- Campo de resposta + botao enviar
- Botao "Marcar como lida"

**Mobile:** lista ocupa tela inteira; ao clicar numa mensagem, abre o detalhe com botao de voltar.

## 3. Hook: `useSocialMessages.ts`

- Query para buscar mensagens filtradas por `organization_id` e opcionalmente `client_id`
- Mutation para marcar como lida (`is_read = true`)
- Mutation para responder (atualiza `reply_content` e `replied_at`)
- Query para contar nao lidas (usada no badge da aba)

## 4. Edge Function: `social-fetch-messages`

- Chamada via Late.dev API para buscar DMs e comentarios das contas conectadas
- Armazena na tabela `social_messages`
- Evita duplicatas via `external_id`
- Chamada pelo botao "Sincronizar" e tambem manualmente no Inbox

## 5. Edge Function: `social-reply-message`

- Recebe `message_id` e `reply_content`
- Envia a resposta via Late.dev API para a plataforma correspondente
- Atualiza a tabela `social_messages` com `reply_content` e `replied_at`

## 6. Seguidores em Tempo Real nos Relatorios

Na `MetricsDashboard.tsx`, a contagem de seguidores ja existe mas vem do banco local. Para "tempo real":
- Adicionar botao "Atualizar metricas" que chama `syncAccounts` para buscar dados frescos da API
- Na tabela por plataforma, ja mostra seguidores - manter e destacar visualmente
- O card de "Seguidores" ja existe na primeira linha de stats - sera mantido

## 7. Badge de Nao Lidas na Aba Inbox

Mostrar badge com contagem de mensagens nao lidas no botao da aba Inbox, similar a notificacoes.

---

## Secao Tecnica

### Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `src/components/social-media/SocialInbox.tsx` | Componente principal do Inbox com lista + detalhe |
| `src/components/social-media/InboxMessageItem.tsx` | Item individual na lista de mensagens |
| `src/components/social-media/InboxConversation.tsx` | Painel de detalhe/resposta da conversa |
| `src/hooks/useSocialMessages.ts` | Hook para CRUD de mensagens sociais |
| `supabase/functions/social-fetch-messages/index.ts` | Edge function para buscar mensagens via Late.dev |
| `supabase/functions/social-reply-message/index.ts` | Edge function para responder mensagens via Late.dev |

### Arquivos a Editar

| Arquivo | Alteracoes |
|---|---|
| `src/pages/SocialMedia.tsx` | Adicionar tab 'inbox' com icone MessageCircle, renderizar SocialInbox, badge de nao lidas |
| `src/components/social-media/MetricsDashboard.tsx` | Adicionar botao "Atualizar metricas" que chama syncAccounts para dados frescos de seguidores |
| `supabase/config.toml` | Registrar novas edge functions `social-fetch-messages` e `social-reply-message` |

### Migracao SQL

- Criar tabela `social_messages` com as colunas descritas
- Adicionar RLS policies para membros da organizacao
- Criar indice em `(organization_id, is_read)` para queries de contagem eficientes

### Fluxo de Dados

```text
Sincronizar -> social-fetch-messages -> Late.dev API -> social_messages (DB)
                                                              |
                                                    SocialInbox (leitura)
                                                              |
                                            Responder -> social-reply-message -> Late.dev API
                                                              |
                                                    Atualiza reply_content no DB
```

