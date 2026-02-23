

# Reestruturação de Preços da Qualify - Social Media + Novos Valores

## Contexto e Analise de Custos

### Custos Operacionais Atuais (Late.dev)
- **Plano Free Late.dev**: 10 Conjuntos Sociais (Social Sets), posts limitados
- **Custo atual para voce**: $0/mes (Free)
- **Proximo nivel Late.dev**: ~$19/mes para mais Social Sets

### Referencia MLabs
- Beginner: $19.90/mes por marca (10 conjuntos sociais, 300 posts/mes)
- Intermediate: $24.90/mes (2000 posts/mes)
- Full: $29.90/mes (ilimitado)

### Sua Estrategia
Cobrar por conexao social inclusa no plano, de forma que os usuarios cubram o custo do Late.dev proporcionalmente. Quando a demanda crescer, voce migra para o plano pago do Late.dev ja com receita cobrindo o custo.

---

## Proposta de Novos Precos

| Plano | Preco Atual | Novo Preco | Social Sets | Posts/mes | Inbox (DMs) |
|-------|-------------|------------|-------------|----------|-------------|
| Bussola (Free) | $0 | $0 | 0 (sem acesso) | 0 | Nao |
| Lanca (Starter) | $10 | $19 | 3 conexoes | 100 | Nao |
| Arco (Pro) | $24 | $39 | 7 conexoes | 500 | Sim |
| Catapulta (Agency) | $60 | $79 | 15 conexoes | Ilimitado | Sim |

### Justificativa dos Precos

**Bussola (Free)**: Sem Social Media. O modulo fica visivel mas bloqueado com prompt de upgrade. Isso evita gastar Social Sets do Late.dev com usuarios que nao pagam.

**Lanca ($19/mes)**: Aumento de $10 para $19.
- 3 conexoes sociais cobrem o custo proporcional (~$5.70 do Late.dev por 3 sets do pool de 10)
- Valor competitivo vs MLabs ($19.90 por 1 marca)
- Diferencial: inclui CRM + IA + Contratos (MLabs so tem social)

**Arco ($39/mes)**: Aumento de $24 para $39.
- 7 conexoes sociais + Inbox de DMs
- Custo proporcional Late.dev: ~$13.30 por 7 sets
- Margem saudavel + todos os outros modulos inclusos
- Plano mais popular (best value)

**Catapulta ($79/mes)**: Aumento de $60 para $79.
- 15 conexoes (requer Late.dev Starter a $19/mes quando ultrapassar 10)
- Posts ilimitados + Inbox + Suporte VIP
- Para agencias que gerenciam muitas marcas

---

## Distribuicao dos 10 Social Sets (Late.dev Free)

Com o pool de 10 Social Sets gratuitos:
- Bussola: 0 sets (nao consome)
- Lanca: 3 sets por organizacao
- Arco: 7 sets por organizacao
- Catapulta: ate 10 (precisa upgrade Late.dev quando tiver muitos clientes Catapulta)

O sistema vai controlar o total de Social Sets consumidos globalmente e alertar voce (admin/proprietor) quando estiver proximo do limite do Late.dev.

---

## Implementacao Tecnica

### 1. Migrar tabela `plan_limits` (SQL)
Adicionar colunas:
- `max_social_accounts` (integer, nullable) -- conexoes sociais por organizacao
- `max_social_posts_per_month` (integer, nullable) -- posts agendados/mes
- `has_social_inbox` (boolean, default false) -- acesso ao Inbox DMs

### 2. Atualizar registros da tabela `plan_limits`

```text
free:    max_social_accounts=0, max_social_posts=0, has_social_inbox=false
starter: max_social_accounts=3, max_social_posts=100, has_social_inbox=false
pro:     max_social_accounts=7, max_social_posts=500, has_social_inbox=true
agency:  max_social_accounts=15, max_social_posts=NULL, has_social_inbox=true
```

### 3. Atualizar `usePlanLimits.ts`
- Adicionar campos `maxSocialAccounts`, `maxSocialPostsPerMonth`, `hasSocialInbox`
- Adicionar contadores `socialAccountsCount`, `socialPostsThisMonth`
- Adicionar permissoes `canConnectSocialAccount`, `canPublishSocialPost`, `canAccessSocialInbox`

### 4. Atualizar precos em todas as paginas
Arquivos afetados:
- `src/pages/Pricing.tsx` -- tabela de comparacao publica
- `src/pages/Upgrade.tsx` -- pagina de upgrade interna
- `src/pages/SelectPlan.tsx` -- selecao de plano pos-registro
- Adicionar linha "Social Media" na tabela de comparacao com conexoes e posts

### 5. Adicionar controle no modulo Social Media
- Bloquear conexao de novas contas quando `canConnectSocialAccount === false`
- Bloquear criacao de posts quando `canPublishSocialPost === false`
- Esconder/bloquear aba Inbox quando `canAccessSocialInbox === false`
- Mostrar badge de uso (ex: "3/7 conexoes") no header do modulo

### 6. Tracking de uso social
Usar a tabela `usage_tracking` existente com novos `feature_type`:
- `social_posts` -- contabilizar posts publicados/agendados por mes
- Contar `social_accounts` diretamente da tabela existente (nao precisa de tracking mensal)

### 7. Atualizar LemonSqueezy
- Ajustar os produtos/precos no dashboard do LemonSqueezy para refletir os novos valores ($19, $39, $79)

---

## Resumo das Alteracoes

| Item | Arquivos/Tabelas |
|------|-----------------|
| Migracao SQL | Nova migracao para `plan_limits` |
| Hook de limites | `src/hooks/usePlanLimits.ts` |
| Pagina de precos | `src/pages/Pricing.tsx` |
| Pagina de upgrade | `src/pages/Upgrade.tsx` |
| Selecao de plano | `src/pages/SelectPlan.tsx` |
| Modulo Social | Componentes em `src/components/social-media/` |
| Types | `src/integrations/supabase/types.ts` |

