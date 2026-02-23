

# Social Media Automatico com Late.dev API

## Resumo

Integrar o modulo Social Media com a **Late.dev API** (getlate.dev) -- API unificada para 13 plataformas sociais. Conexao OAuth em poucos cliques (headless mode), publicacao automatica por agendamento, e SDK oficial em Node.js.

## Custo

- **Free**: $0/mes -- 2 social sets, 20 posts/mes (para testar)
- **Build**: $16/mes -- 10 social sets, 120 posts/mes
- **Accelerate**: $41/mes -- social sets ilimitados, 1000 posts/mes (recomendado para agencias)

Cada "social set" = um grupo de contas sociais (1 por plataforma). Ideal: 1 social set por cliente da agencia.

## Plataformas Suportadas

Instagram, Facebook, LinkedIn, TikTok, X (Twitter), YouTube, Pinterest, Threads, Reddit, Bluesky, Google Business, Telegram, Snapchat

---

## Como vai funcionar para o usuario

### Conectar conta (2-3 cliques)

1. No Dashboard Social Media, clica "Conectar Instagram" (ou outra rede)
2. Abre popup com a pagina OAuth da rede social (via Late.dev headless mode)
3. Usuario faz login e autoriza
4. Popup fecha, card muda para "Conectado" com dados reais

### Agendar e publicar automaticamente

1. Cria post: texto + imagem/video + seleciona redes + data/hora
2. Clica "Agendar"
3. Post salvo com status `scheduled`
4. Late.dev publica automaticamente no horario marcado (agendamento nativo da API)
5. Status atualiza para `published` ou `failed`

**Vantagem**: Late.dev tem agendamento nativo -- nao precisamos de cron job. A API aceita `scheduledDate` e publica automaticamente.

---

## Arquitetura Tecnica

### Edge Functions novas

**1. `social-connect/index.ts`**
- Recebe: `organization_id`, `platform`
- Verifica se organizacao ja tem um `late_profile_id` (social set)
- Se nao: cria perfil via `POST https://getlate.dev/api/v1/social-sets` 
- Gera URL de conexao OAuth: `GET https://getlate.dev/api/v1/connect/{platform}?profileId={id}&headless=true`
- Retorna URL para o frontend abrir em popup

**2. `social-sync-accounts/index.ts`**
- Chamado apos o usuario fechar popup de conexao
- Consulta `GET https://getlate.dev/api/v1/social-sets/{id}` para obter contas conectadas
- Sincroniza tabela `social_accounts` no Supabase (plataforma, username, avatar, status)

**3. `social-publish/index.ts`**
- Recebe: `post_id`
- Busca dados do post no Supabase
- Chama `POST https://getlate.dev/api/v1/posts` com:
  - `text`: conteudo
  - `platforms`: array de plataformas
  - `mediaUrls`: array de URLs de midia
  - `scheduledDate`: data/hora ISO (se agendado)
  - `profileId`: social set da organizacao
- Atualiza `social_posts` com `late_post_id` e status

**4. `social-webhook/index.ts`** (opcional, para receber callbacks)
- Recebe notificacoes de status de publicacao (sucesso/falha)
- Atualiza status do post no Supabase

### Alteracoes no banco de dados

Migracao SQL:

```text
-- Adicionar coluna para mapear organizacao ao Late.dev social set
ALTER TABLE organizations ADD COLUMN late_profile_id TEXT;

-- Adicionar coluna para rastrear post no Late.dev
ALTER TABLE social_posts ADD COLUMN late_post_id TEXT;

-- Adicionar coluna para client-level social sets
ALTER TABLE social_accounts ADD COLUMN late_profile_id TEXT;
```

### Secret necessario

- `LATE_API_KEY` -- API Key da conta Late.dev (obtida em https://getlate.dev/dashboard)

---

## Alteracoes no Frontend

### `SocialDashboard.tsx`
- Botao "Conectar" chama edge function `social-connect`
- Abre URL retornada em popup (`window.open`)
- Listener `window.addEventListener('focus')` detecta retorno do popup
- Chama `social-sync-accounts` para sincronizar contas conectadas
- Remove formulario manual de nome/username
- Mostra avatar e username reais

### `PostModal.tsx`
- Remove selector manual de status (draft/published/etc)
- Dois botoes claros:
  - "Salvar Rascunho" (status: `draft`)
  - "Publicar Agora" (chama `social-publish` imediatamente)
  - "Agendar" (chama `social-publish` com `scheduledDate`)
- Upload de imagens continua no Supabase Storage
- As URLs publicas sao passadas para a Late API

### `PostCard.tsx`
- Status `failed`: mostra botao "Tentar novamente" (re-chama `social-publish`)
- Status `published`: indicador visual de sucesso
- Status `scheduled`: mostra data/hora agendada com countdown

### `useSocialAccounts.ts`
- Novo metodo `connectPlatform(platform)` que chama edge function `social-connect`
- Novo metodo `syncAccounts()` que chama `social-sync-accounts`
- Novo metodo `disconnectPlatform(accountId)` que remove conexao

### `useSocialPosts.ts`
- Novo metodo `publishPost(postId)` que chama `social-publish`
- Novo metodo `schedulePost(postId, scheduledAt)` que chama `social-publish` com data
- Novo metodo `retryPost(postId)` para tentar novamente posts falhados
- Remover opcao de status manual `published`

---

## Fluxos

### Conectar conta social

```text
1. Usuario clica "Conectar Instagram"
2. Frontend -> Edge Function social-connect
3. Edge Function -> Late API: criar social set (se nao existe) + gerar URL OAuth
4. Frontend abre URL em popup
5. Usuario faz login OAuth no Instagram
6. Popup fecha/redireciona
7. Frontend detecta foco -> chama social-sync-accounts
8. Edge Function -> Late API: GET social set para obter contas
9. Supabase social_accounts atualizado
10. UI atualiza: card "Instagram Conectado" com avatar real
```

### Publicar post agendado

```text
1. Usuario cria post com texto, imagem, plataformas e data/hora
2. Clica "Agendar"
3. Frontend salva post no Supabase (status: scheduled)
4. Frontend chama social-publish com scheduledDate
5. Edge Function -> Late API: POST /posts com scheduledDate
6. Late API agenda internamente (sem cron job nosso)
7. No horario marcado, Late publica automaticamente
8. (Opcional) Webhook atualiza status para published
```

### Publicar imediatamente

```text
1. Usuario cria post e clica "Publicar Agora"
2. Frontend salva post no Supabase (status: publishing)
3. Frontend chama social-publish sem scheduledDate
4. Edge Function -> Late API: POST /posts (publica imediatamente)
5. Resposta atualiza status para published ou failed
```

---

## Arquivos a criar/modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `supabase/functions/social-connect/index.ts` | Criar | Cria social set + gera URL OAuth |
| `supabase/functions/social-sync-accounts/index.ts` | Criar | Sincroniza contas conectadas |
| `supabase/functions/social-publish/index.ts` | Criar | Publica ou agenda post via Late API |
| `supabase/functions/social-webhook/index.ts` | Criar | Recebe callbacks de status (opcional) |
| Migracao SQL | Criar | Adicionar colunas `late_profile_id` e `late_post_id` |
| `src/hooks/useSocialAccounts.ts` | Modificar | Metodos de conexao OAuth real |
| `src/hooks/useSocialPosts.ts` | Modificar | Metodos de publicacao/agendamento |
| `src/components/social-media/SocialDashboard.tsx` | Modificar | Conexao via OAuth popup |
| `src/components/social-media/PostModal.tsx` | Modificar | Simplificar para Rascunho/Agendar/Publicar |
| `src/components/social-media/PostCard.tsx` | Modificar | Status automatico + retry |

---

## Prerequisito

Antes de implementar:

1. Criar conta gratuita em https://getlate.dev
2. Gerar API Key no dashboard
3. Fornecer a API Key para configurar como secret `LATE_API_KEY` no Supabase

Pode comecar com o plano **Free** ($0) para testar, depois fazer upgrade conforme necessidade.
