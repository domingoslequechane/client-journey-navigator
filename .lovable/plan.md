
# Analise Completa de Custos e Nova Estrutura de Precos da Qualify

## 1. Mapeamento de Todos os Modulos e Seus Custos

### Modulos SEM custo variavel por uso (custo zero de API)
Estes modulos nao consomem nenhuma API externa. O custo e apenas o Supabase (armazenamento + queries).

| Modulo | O que faz | Custo por uso |
|--------|-----------|---------------|
| **Pipeline (Kanban)** | Gestao de funil de vendas + operacional | $0 |
| **Clientes (CRM)** | Cadastro, historico, BANT, qualificacao | $0 |
| **Financas** | Transacoes, metas, projetos, relatorios | $0 |
| **Link23** | Paginas de links tipo Linktree | $0 |
| **Equipe** | Gestao de membros, convites, papeis | $0 |
| **Academia** | Conteudo educativo | $0 |
| **Contratos** | Upload/visualizacao de contratos | $0 |

### Modulos COM custo variavel (consomem APIs pagas)

| Modulo | API Usada | Modelo | Custo estimado por chamada |
|--------|-----------|--------|---------------------------|
| **QIA Chat** | Gemini direto (sua chave) | gemini-2.5-flash | ~$0.0003-0.001 por mensagem |
| **Sugestao IA (Dashboard)** | Gemini direto (sua chave) | gemini-2.5-flash | ~$0.0005 por sugestao |
| **Studio AI (Flyers)** | Gemini direto (sua chave) | gemini-2.5-flash-image / gemini-3-pro-image | ~$0.01-0.04 por imagem |
| **Linha Editorial** | Lovable Gateway | gemini-3-flash | ~$0.001-0.003 por geracao |
| **Social Caption** | Lovable Gateway | gemini-2.5-flash | ~$0.0005 por legenda |
| **Social Best Times** | Lovable Gateway | gemini-2.5-flash | ~$0.0003 por consulta |
| **Social Media (publicar/conectar)** | Late.dev | Late API | Ver tabela abaixo |

### Custos Late.dev (Social Media)

| Plano Late.dev | Preco | Social Sets | Posts/mes |
|----------------|-------|-------------|----------|
| Free | $0 | 10 | 120 |
| Aceleracao | $16 | 10 | 120 |
| Scale | $41 | 50 | Ilimitado |
| Ilimitado | $833 | Ilimitado | Ilimitado |

**1 Social Set = 1 conta de rede social conectada** (ex: 1 Instagram + 1 Facebook = 2 Social Sets)

---

## 2. Custos Fixos Mensais Atuais

| Item | Custo estimado |
|------|---------------|
| Supabase (Pro) | ~$25/mes |
| Dominio | ~$1-2/mes |
| Gemini API (uso leve, 1-5 clientes) | ~$5-15/mes |
| Lovable Gateway | Incluido no plano Lovable |
| Late.dev (Free) | $0 (por agora) |
| LemonSqueezy (comissao 5%) | Variavel |
| **Total fixo** | **~$30-42/mes** |

---

## 3. Custo Variavel por Organizacao (cliente da Qualify)

Supondo uso medio mensal por organizacao:

| Recurso | Uso medio | Custo |
|---------|-----------|-------|
| QIA Chat (100 msgs) | 100 x $0.0005 | $0.05 |
| Studio AI (10 flyers) | 10 x $0.03 | $0.30 |
| Sugestao IA (30x) | 30 x $0.0005 | $0.015 |
| Editorial (2 geracoes) | 2 x $0.002 | $0.004 |
| Social Captions (20x) | 20 x $0.0005 | $0.01 |
| **Subtotal IA** | | **~$0.38/mes** |
| Social Sets (3 contas) | 3 sets do pool | **~$4.80/mes** (proporcional ao Late.dev Scale) |
| **Total por org** | | **~$5.18/mes** |

O custo variavel por organizacao e baixo para IA (~$0.38) mas significativo para Social Media (~$4.80 por 3 contas no Late.dev Scale).

---

## 4. Proposta: Modelo de Precos por Modulos

### Filosofia: Cada plano desbloqueia mais modulos + mais limites

```text
+------------------+----------+----------+----------+------------+
|                  | Bussola  |  Lanca   |   Arco   | Catapulta  |
|                  |  (Free)  |  ($19)   |  ($39)   |   ($79)    |
+------------------+----------+----------+----------+------------+
| CRM + Pipeline   |    Sim   |   Sim    |   Sim    |    Sim     |
| Clientes ativos  |    3     |   15     |   50     | Ilimitado  |
| Contratos/mes    |    3     |   15     |   50     | Ilimitado  |
| Templates contr. |    1     |    3     |   10     | Ilimitado  |
+------------------+----------+----------+----------+------------+
| QIA Chat         |  90 msgs | 500 msgs | 1200 msgs| Ilimitado  |
| Sugestao IA      |    Sim   |   Sim    |   Sim    |    Sim     |
+------------------+----------+----------+----------+------------+
| Financas         |   NAO    |   Sim    |   Sim    |    Sim     |
+------------------+----------+----------+----------+------------+
| Studio AI        |   NAO    | 30 flyers| 100 flyer| Ilimitado  |
+------------------+----------+----------+----------+------------+
| Link23           |   NAO    |  1 pagina| 5 paginas| Ilimitado  |
+------------------+----------+----------+----------+------------+
| Linha Editorial  |   NAO    |   Sim    |   Sim    |    Sim     |
+------------------+----------+----------+----------+------------+
| Social Media     |   NAO    | 3 contas | 7 contas | 15 contas  |
| Posts/mes        |   NAO    |   50     |  200     | Ilimitado  |
| Inbox (DMs)      |   NAO    |   NAO    |   Sim    |    Sim     |
+------------------+----------+----------+----------+------------+
| Academia         |    Sim   |   Sim    |   Sim    |    Sim     |
+------------------+----------+----------+----------+------------+
| Equipe           |  1 user  | 5 users  | 10 users | 20 users   |
| Exportacao dados |   NAO    |   Sim    |   Sim    |    Sim     |
| Suporte priorit. |   NAO    |   NAO    |   Sim    |    Sim     |
| Suporte VIP      |   NAO    |   NAO    |   NAO    |    Sim     |
+------------------+----------+----------+----------+------------+
```

### Justificativa dos precos

**Bussola ($0)** - Modulos inclusos: CRM + Pipeline + QIA (limitado) + Academia
- Custo real para voce: ~$0/mes (sem Social, sem Studio, sem Financas)
- Objetivo: atrair usuarios, converter para pagante

**Lanca ($19/mes)** - Tudo do Bussola + Financas + Studio AI + Link23 + Editorial + Social Media (3 contas)
- Custo real por org: ~$5.50/mes (IA + 3 Social Sets)
- Margem bruta: ~71% ($13.50 de lucro por org)
- vs MLabs: MLabs cobra $12 APENAS para social de 1 marca. Qualify oferece CRM + IA + Financas + Studio + Social por $19

**Arco ($39/mes)** - Tudo do Lanca com limites maiores + Inbox + 7 contas social
- Custo real por org: ~$11/mes (IA + 7 Social Sets)
- Margem bruta: ~72% ($28 de lucro por org)
- Plano mais popular (best value)

**Catapulta ($79/mes)** - Tudo ilimitado + 15 contas social + Suporte VIP
- Custo real por org: ~$20/mes (IA pesada + 15 Social Sets)
- Margem bruta: ~75% ($59 de lucro por org)

---

## 5. Cenario de Break-Even

| Cenario | Receita | Custos fixos | Custos variaveis | Lucro |
|---------|---------|-------------|------------------|-------|
| 2 clientes Lanca | $38 | $35 | $11 | -$8 |
| 3 clientes Lanca | $57 | $35 | $16.50 | +$5.50 |
| 2 Lanca + 1 Arco | $77 | $35 | $22 | +$20 |
| 1 Lanca + 2 Arco | $97 | $35 | $27.50 | +$34.50 |
| 5 clientes mistos | ~$155 | $35 | $40 | +$80 |

**Break-even: 3 clientes pagantes** (mix de Lanca + Arco).

Quando ultrapassar 10 Social Sets totais, voce migra para Late.dev Scale ($41/mes) — isso acontece com ~3-4 clientes ativos no Social Media. A receita ja cobre esse custo nesse ponto.

---

## 6. Implementacao Tecnica

### Etapa 1: Migracao do banco de dados
Adicionar novas colunas na tabela `plan_limits`:
- `max_social_accounts` (integer, nullable) - conexoes sociais por org
- `max_social_posts_per_month` (integer, nullable) - posts sociais/mes
- `has_social_inbox` (boolean, default false) - acesso ao Inbox DMs
- `has_finance_module` (boolean, default false) - acesso ao modulo Financas
- `has_studio_module` (boolean, default false) - acesso ao Studio AI
- `has_linktree_module` (boolean, default false) - acesso ao Link23
- `has_editorial_module` (boolean, default false) - acesso a Linha Editorial
- `has_social_module` (boolean, default false) - acesso ao Social Media
- `max_link_pages` (integer, nullable) - paginas Link23 por org

Atualizar registros:
- free: todos `has_*` = false (exceto CRM/Pipeline/QIA/Academia que sao base)
- starter: todos `has_*` = true, social_accounts=3, social_posts=50, social_inbox=false, link_pages=1
- pro: todos `has_*` = true, social_accounts=7, social_posts=200, social_inbox=true, link_pages=5
- agency: todos `has_*` = true, social_accounts=15, social_posts=NULL, social_inbox=true, link_pages=NULL

### Etapa 2: Atualizar `usePlanLimits.ts`
- Adicionar todos os novos campos booleanos e numericos
- Adicionar permissoes: `canAccessFinance`, `canAccessStudio`, `canAccessLinkTree`, `canAccessEditorial`, `canAccessSocialMedia`, `canAccessSocialInbox`
- Adicionar contadores: `socialAccountsCount`, `socialPostsThisMonth`, `linkPagesCount`
- Adicionar remaining: `remainingSocialAccounts`, `remainingSocialPosts`, `remainingLinkPages`

### Etapa 3: Atualizar precos em todas as paginas
- `src/pages/Pricing.tsx` - Novos precos ($0, $19, $39, $79) + tabela de comparacao por modulo
- `src/pages/Upgrade.tsx` - Novos precos + features por modulo
- `src/pages/SelectPlan.tsx` - Novos precos + features por modulo

### Etapa 4: Implementar guards de modulo
- No Sidebar: mostrar todos os modulos mas com icone de cadeado nos bloqueados
- Ao clicar num modulo bloqueado: mostrar modal de upgrade (tipo `SubscriptionRequired`)
- No Social Media: limitar conexoes e posts
- No Studio: limitar geracoes de flyers
- No Link23: limitar paginas
- No Financas: bloquear acesso completo no free

### Etapa 5: Atualizar LemonSqueezy
- Ajustar produtos/precos manualmente no dashboard ($19, $39, $79)

### Arquivos afetados

| Arquivo | Alteracao |
|---------|----------|
| Nova migracao SQL | Adicionar colunas + atualizar dados |
| `src/hooks/usePlanLimits.ts` | Novos campos, contadores, permissoes de modulo |
| `src/pages/Pricing.tsx` | Novos precos + comparacao por modulo |
| `src/pages/Upgrade.tsx` | Novos precos + features por modulo |
| `src/pages/SelectPlan.tsx` | Novos precos + features por modulo |
| `src/components/layout/Sidebar.tsx` | Icones de cadeado em modulos bloqueados |
| `src/components/subscription/SubscriptionRequired.tsx` | Guard para modulos bloqueados |
| Componentes Social Media | Guards de limite de contas e posts |
| Componentes Studio | Guard de limite de geracoes |
| Componentes Link23 | Guard de limite de paginas |
| Componentes Financas | Guard de acesso |
