

# Modulo Social Media (com dados Mock)

## Resumo

Criar um novo modulo "Social Media" no Qualify, inspirado no mLabs, com funcionalidades de agendamento de posts, calendario visual, preview de posts, e metricas -- tudo com dados mock por enquanto (sem integracao real com APIs de redes sociais).

## O que sera construido

### 1. Nova pagina: Social Media Dashboard (`/app/social-media`)

Uma pagina com 3 abas principais:

- **Calendario** -- Visualizacao mensal dos posts agendados (reutilizando o mesmo padrao do calendario da Linha Editorial)
- **Posts** -- Lista de todos os posts com filtros por rede social, status (rascunho, agendado, publicado, falhou)
- **Metricas** -- Dashboard com graficos de desempenho mock (alcance, engajamento, crescimento de seguidores)

### 2. Criacao/Edicao de Posts

Modal completo para criar posts com:
- Campo de texto com contagem de caracteres (limites por rede social)
- Upload de imagem (preview visual)
- Selecao de redes sociais (Instagram, Facebook, LinkedIn, TikTok, Twitter/X)
- Data e hora de agendamento
- Preview do post (como ficara em cada rede)
- Status: Rascunho, Agendado, Publicado

### 3. Dados Mock

Um arquivo `src/lib/social-media-mock.ts` com:
- ~15 posts de exemplo distribuidos ao longo do mes
- Metricas mock por rede social (seguidores, alcance, engajamento)
- Dados de crescimento semanal para graficos

### 4. Navegacao

- Novo item "Social Media" no Sidebar e MobileNav com icone `Share2`
- Rota `/app/social-media` no App.tsx

---

## Detalhes Tecnicos

### Novos arquivos

| Arquivo | Descricao |
|---|---|
| `src/lib/social-media-mock.ts` | Dados mock: posts, metricas, contas conectadas |
| `src/pages/SocialMedia.tsx` | Pagina principal com Tabs (Calendario, Posts, Metricas) |
| `src/components/social-media/PostModal.tsx` | Modal de criacao/edicao de post com preview |
| `src/components/social-media/PostCard.tsx` | Card individual de post na lista |
| `src/components/social-media/PostPreview.tsx` | Preview visual simulando como o post fica na rede |
| `src/components/social-media/MetricsDashboard.tsx` | Dashboard com graficos de metricas mock |
| `src/components/social-media/SocialCalendar.tsx` | Calendario mensal reutilizando padrao da Editorial |

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | Adicionar rota `/app/social-media` |
| `src/components/layout/Sidebar.tsx` | Novo item de navegacao "Social Media" |
| `src/components/layout/MobileNav.tsx` | Novo item no menu "Mais" |

### Estrutura do dado mock (post)

```text
Post {
  id: string
  content: string
  mediaUrl?: string
  platforms: ('instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'twitter')[]
  scheduledAt: string (ISO datetime)
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  clientId?: string
  metrics?: { likes, comments, shares, reach, impressions }
}
```

### Metricas mock

```text
SocialMetrics {
  platform: string
  followers: number
  followersGrowth: number (%)
  postsCount: number
  avgReach: number
  avgEngagement: number (%)
  weeklyData: { date, followers, reach, engagement }[]
}
```

### Componentes de UI reutilizados

- `Card`, `Badge`, `Tabs`, `Dialog`, `Select`, `Button`, `Input`, `Textarea` (existentes)
- `recharts` para graficos de metricas (ja instalado)
- Padrao de calendario identico ao da Linha Editorial (`date-fns`, grid 7 colunas)

### Funcionalidades do calendario

- Navegacao mensal (anterior/proximo)
- Clicar num dia abre um sheet lateral com os posts desse dia
- Indicadores visuais: cores por rede social, status do post
- Botao "Hoje" para voltar ao mes atual

### Preview de post

- Simulacao visual basica do formato Instagram (quadrado com avatar, username, imagem, caption)
- Contagem de caracteres com limites: Instagram (2200), Twitter (280), LinkedIn (3000)
- Badge com icone da rede social selecionada

### Estado

Tudo gerenciado com `useState` local, sem Supabase. Os dados mock sao carregados no state inicial e as operacoes de CRUD atualizam apenas o state local (sem persistencia).

