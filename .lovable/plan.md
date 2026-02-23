

# Modulo Social Media -- Fase 1: Gestao e Aprovacao Funcional (Hibrido)

## Resumo

Tornar o modulo Social Media totalmente funcional com persistencia no Supabase, sistema de aprovacao pelo cliente, e arquitetura preparada para integracao futura com servico de publicacao automatica (ex: Ayrshare). Tudo multi-tenant, por organizacao e por cliente.

---

## Fase 1A: Persistencia e CRUD real (o que sera feito agora)

### 1. Tabelas no Supabase

Duas tabelas novas:

**`social_accounts`** -- Contas de redes sociais conectadas por organizacao/cliente

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | Isolamento multi-tenant |
| client_id | uuid FK (nullable) | Conta vinculada a um cliente especifico (opcional) |
| platform | text | instagram, facebook, linkedin, tiktok, twitter, youtube, pinterest, threads |
| account_name | text | Nome da conta/pagina |
| username | text | @ ou URL |
| avatar_url | text (nullable) | Foto de perfil |
| access_token | text (nullable) | Token de acesso (para fase 2 -- criptografado) |
| is_connected | boolean | Se esta ativa |
| followers_count | integer | Contagem de seguidores (manual ou automatica) |
| created_at / updated_at | timestamps | |

**`social_posts`** -- Posts agendados/publicados

| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK | |
| client_id | uuid FK (nullable) | Post vinculado a cliente |
| created_by | uuid | Quem criou |
| content | text | Texto do post |
| media_urls | jsonb | Array de URLs de midias |
| platforms | text[] | Array de plataformas |
| content_type | text | feed, stories, reels, carousel, video, text |
| hashtags | text[] | |
| scheduled_at | timestamptz | Data/hora de publicacao |
| status | text | draft, pending_approval, approved, scheduled, published, failed, rejected |
| approval_token | uuid (nullable) | Token unico para link de aprovacao publica |
| approved_by | text (nullable) | Nome/email de quem aprovou |
| approved_at | timestamptz (nullable) | |
| rejection_reason | text (nullable) | |
| published_at | timestamptz (nullable) | |
| metrics | jsonb (nullable) | likes, comments, shares, reach, impressions |
| notes | text (nullable) | Notas internas |
| created_at / updated_at | timestamps | |

### 2. RLS Policies

- Todas as tabelas com RLS habilitado
- Acesso baseado em `user_belongs_to_org(auth.uid(), organization_id)`
- Admins podem gerir todas as contas/posts da organizacao
- Membros podem criar e ver posts da sua organizacao

### 3. Storage

- Novo bucket `social-media` (publico) para upload de imagens/videos dos posts

### 4. Codigo Frontend

**Hooks novos:**
- `useSocialAccounts()` -- CRUD de contas conectadas (por organizacao)
- `useSocialPosts()` -- CRUD de posts com filtros (plataforma, status, cliente, data)

**Componentes atualizados:**
- `SocialDashboard.tsx` -- Dados reais do Supabase em vez de mock
- `PostModal.tsx` -- Upload real de imagens para storage, salvar no Supabase
- `SocialCalendar.tsx` -- Posts reais carregados por mes
- `PostCard.tsx` -- Acoes reais (editar, excluir, enviar para aprovacao)
- `MetricsDashboard.tsx` -- Metricas agregadas dos posts reais

**Novas funcionalidades:**
- Filtro por cliente (cada agencia gere multiplos clientes)
- Status "Enviar para aprovacao" que gera um link publico
- Upload de multiplas imagens por post

### 5. Sistema de Aprovacao pelo Cliente

- Ao clicar "Enviar para aprovacao", gera-se um `approval_token` unico
- Uma pagina publica `/approve/:token` mostra o post com preview
- O cliente (sem login) pode: Aprovar, Rejeitar (com motivo), ou Comentar
- O status do post atualiza automaticamente
- Notificacao para a equipa quando o cliente responde

### 6. Pagina publica de aprovacao

Nova rota publica: `/approve/:token`
- Mostra o preview do post (conteudo, midias, plataformas alvo)
- Botoes: "Aprovar" (verde), "Solicitar alteracoes" (amarelo com campo de texto)
- Sem necessidade de login -- o token e a autenticacao
- Design limpo e profissional com logo da agencia

---

## Fase 1B: Preparacao para Publicacao Automatica (arquitetura apenas)

A arquitetura das tabelas ja inclui campos para `access_token` na tabela `social_accounts`, preparando para integracao futura com:

- **Ayrshare** (~$30/mes): API unificada para Instagram, Facebook, LinkedIn, TikTok, X, Pinterest
- Ou **Buffer API**, **Publer API**, **SocialBee API**

A integracao futura sera:
1. Edge function `publish-social-post` que envia post para API do servico escolhido
2. Cron job (ou trigger) que verifica posts com status "scheduled" e `scheduled_at <= now()`
3. Webhook de callback para atualizar status para "published" ou "failed"

Isso NAO sera implementado agora -- apenas a estrutura de dados esta preparada.

---

## Detalhes Tecnicos

### Migracao SQL

```text
-- Tabela social_accounts
CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  client_id uuid,
  platform text NOT NULL,
  account_name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  avatar_url text,
  access_token text,
  is_connected boolean NOT NULL DEFAULT true,
  followers_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela social_posts com todos os campos de aprovacao
CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  client_id uuid,
  created_by uuid,
  content text NOT NULL DEFAULT '',
  media_urls jsonb DEFAULT '[]',
  platforms text[] NOT NULL DEFAULT '{}',
  content_type text NOT NULL DEFAULT 'feed',
  hashtags text[] DEFAULT '{}',
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  approval_token uuid DEFAULT gen_random_uuid(),
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,
  published_at timestamptz,
  metrics jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS + Policies para ambas
-- Storage bucket social-media
```

### Novos arquivos

| Arquivo | Descricao |
|---|---|
| `src/hooks/useSocialAccounts.ts` | Hook para CRUD de contas sociais |
| `src/hooks/useSocialPosts.ts` | Hook para CRUD de posts |
| `src/pages/SocialApproval.tsx` | Pagina publica de aprovacao |

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/SocialMedia.tsx` | Substituir dados mock por hooks reais |
| `src/components/social-media/SocialDashboard.tsx` | Dados reais + filtro por cliente |
| `src/components/social-media/PostModal.tsx` | Upload real + salvar no Supabase |
| `src/components/social-media/PostCard.tsx` | Acoes reais + botao de aprovacao |
| `src/components/social-media/SocialCalendar.tsx` | Carregar posts reais por mes |
| `src/components/social-media/MetricsDashboard.tsx` | Metricas dos posts reais |
| `src/App.tsx` | Nova rota `/approve/:token` |
| `src/lib/social-media-mock.ts` | Manter tipos, remover dados mock hardcoded |

### Fluxo do sistema de aprovacao

```text
Agencia cria post (status: draft)
    |
    v
Agencia clica "Enviar para aprovacao" (status: pending_approval)
    |
    v
Sistema gera link: /approve/{approval_token}
    |
    v
Cliente abre link (sem login)
    |
    +---> Aprova (status: approved -> scheduled)
    |
    +---> Rejeita com motivo (status: rejected)
    |
    v
Notificacao para equipa da agencia
```

### Conectividade simples de contas

Na fase atual, a "conexao" de conta e manual:
1. Admin clica "Conectar" numa plataforma
2. Preenche: nome da conta, username, avatar (opcional)
3. Conta fica registrada e disponivel para selecao ao criar posts

Na fase futura (com Ayrshare ou similar):
1. Admin clica "Conectar"
2. Redireciona para login OAuth da rede social
3. Token armazenado automaticamente na tabela `social_accounts`

