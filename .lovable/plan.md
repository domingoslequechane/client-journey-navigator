
# Remover Plano Gratuito e Adicionar 14 Dias Gratis

## Resumo
Remover o plano Bussola (gratuito) de todas as paginas e fluxos, mantendo apenas os 3 planos pagos (Lanca $19, Arco $39, Catapulta $79) com um periodo de teste gratuito de 14 dias para todos.

## Mudancas Necessarias

### 1. Pagina de Selecao de Plano (`src/pages/SelectPlan.tsx`)
- Remover o plano "free/Bussola" do array `plans`
- Remover toda a logica de ativacao direta do plano gratuito (linhas 172-199)
- Alterar o grid para 3 colunas (`lg:grid-cols-3`)
- Adicionar texto "14 dias gratis" abaixo do preco de cada plano
- Atualizar texto informativo para mencionar o trial

### 2. Pagina de Upgrade (`src/pages/Upgrade.tsx`)
- Remover o plano `free` do objeto `plans` e dos arrays `allPlans` e `PLAN_ORDER`
- Remover a logica especial para `planKey === 'free'` nos botoes e no preco ("Gratis para sempre")
- Remover `planColors.free`, `planImages.free`, `planNames.free`
- Remover a coluna Bussola da tabela de comparacao
- Remover logica de "Mudar para Gratis" no botao
- Alterar grid para 3 colunas
- Adicionar badge "14 dias gratis" em cada card

### 3. Pagina de Precos Publica (`src/pages/Pricing.tsx`)
- Remover o plano Bussola do array `plans`
- Remover a coluna "free" de todos os items em `comparisonFeatures`
- Alterar grid para 3 colunas (`lg:grid-cols-3`)
- Adicionar informacao de "14 dias gratis" nos cards
- Atualizar a tabela de comparacao para 3 colunas

### 4. Hook de Limites (`src/hooks/usePlanLimits.ts`)
- Alterar o default `planType` de `'free'` para `'starter'` (fallback para quando nao ha plano definido)
- Manter o tipo `PlanType` com `'free'` por compatibilidade com dados existentes no banco, mas o default passa a ser `'starter'`

### 5. Hook de Assinatura (`src/hooks/useSubscription.ts`)
- Manter o tipo `PlanType` com `'free'` (dados legados podem existir)
- Ajustar `isPaidPlan` para considerar que todos os planos ativos sao pagos

### 6. Banner do Plano Gratuito (`src/components/subscription/FreePlanBanner.tsx`)
- Atualizar texto para "Seu periodo de teste esta ativo" ou "Assine para continuar"

### 7. Edge Function `create-checkout` (`supabase/functions/create-checkout/index.ts`)
- Remover `"free"` do schema de validacao (aceitar apenas `starter`, `pro`, `agency`)
- Remover o mapeamento de variante para `free`
- Adicionar `trial_period_days: 14` nos atributos do checkout do LemonSqueezy

### 8. Webhook LemonSqueezy (`supabase/functions/lemonsqueezy-webhook/index.ts`)
- Quando uma assinatura e cancelada ou expira, em vez de fazer downgrade para `'free'`, marcar como `'expired'` ou manter o `plan_type` mas desativar o acesso via status da subscription

### 9. Cores e Temas (`src/lib/plan-colors.ts`)
- Manter `free` para compatibilidade com dados legados, mas nao sera mais exibido ativamente

### 10. Componentes de Assinatura
- `PlanBadge.tsx`: Manter referencia a `free` para dados legados
- `LimitReachedCard.tsx`: Manter referencia a `free` para dados legados

## Detalhes Tecnicos

### Checkout com Trial (LemonSqueezy)
Na edge function `create-checkout`, adicionar o campo `trial_period_days` ao payload:
```text
attributes: {
  test_mode: testMode,
  trial_period_days: 14,    // <-- novo
  checkout_data: checkoutDataPayload,
  ...
}
```

### Organizacao Placeholder
Em `SelectPlan.tsx`, ao criar organizacao placeholder, mudar `plan_type` de `'free'` para `'starter'` (ou deixar sem plano ate o checkout ser concluido).

### Dados Legados
Usuarios existentes no plano `free` continuarao funcionando. O tipo `'free'` nao sera removido do banco de dados nem do enum `plan_type`, apenas nao sera mais oferecido como opcao em nenhuma interface.
