
# Plano: Ajustes e Melhorias no Módulo Financeiro

## Resumo das Mudanças

O módulo financeiro será integrado de forma mais orgânica com o resto da aplicação, com melhorias de UX e novas funcionalidades.

---

## 1. Remover Dashboard Financeiro Separado

**Problema:** O módulo tem um dashboard próprio redundante.

**Solução:**
- Remover a página `FinanceDashboard.tsx` 
- Redirecionar `/app/finance` diretamente para `/app/finance/transactions` (Lançamentos)
- Adicionar resumos financeiros (Receita, Despesas, Saldo) ao Dashboard principal

**Arquivos afetados:**
- `src/App.tsx` - Alterar rota `/app/finance` para apontar para `FinanceTransactions`
- `src/pages/Dashboard.tsx` - Adicionar cards de resumo financeiro
- `src/components/finance/FinanceSidebar.tsx` - Remover link "Dashboard"
- `src/pages/finance/index.ts` - Remover export do `FinanceDashboard`
- Deletar `src/pages/finance/FinanceDashboard.tsx`

---

## 2. Corrigir Layout (Espaçamento/Bordas)

**Problema:** As páginas financeiras não têm o padding consistente com o resto da app.

**Solução:**
- Adicionar `p-4 md:p-8` às páginas financeiras (igual ao Dashboard principal)
- Aplicar em todas as páginas: Transactions, Projects, Goals, Reports

**Arquivos afetados:**
- `src/pages/finance/FinanceTransactions.tsx`
- `src/pages/finance/FinanceProjects.tsx`
- `src/pages/finance/FinanceGoals.tsx`
- `src/pages/finance/FinanceReports.tsx`

---

## 3. Criar Categorias Padrão via Migração

**Problema:** Dropdown de categoria está vazio porque não existem categorias no banco.

**Solução:**
Criar migração SQL para inserir categorias padrão para cada organização:

**Categorias de Receita (income):**
- Serviços
- Consultoria
- Venda de Produto
- Comissões
- Outras Receitas

**Categorias de Despesa (expense):**
- Salários
- Marketing
- Tecnologia
- Aluguel
- Transporte
- Alimentação
- Material de Escritório
- Impostos
- Outras Despesas

**Implementação:** Criar trigger que popula categorias quando uma organização é criada, e executar INSERT para organizações existentes.

---

## 4. Adicionar Método de Pagamento "Cheque"

**Problema:** Cheque não está disponível como opção de pagamento.

**Solução:**
- Adicionar `cheque` ao enum `financial_payment_method` no banco
- Atualizar tipo `PaymentMethod` em `src/types/finance.ts`
- Atualizar `PAYMENT_METHOD_LABELS` com tradução
- Atualizar tipos Supabase gerados

---

## 5. Opção para Criar Cliente no Dropdown

**Problema:** Se o cliente não existe, não há como criá-lo diretamente do modal.

**Solução:**
- Adicionar botão "+ Novo Cliente" no final do dropdown de clientes
- Ao clicar, abrir modal simplificado de criação rápida de cliente
- Após criar, selecionar automaticamente o novo cliente
- Criar componente `QuickClientModal.tsx`

---

## 6. Indicador de Campos Obrigatórios (*)

**Problema:** Não está claro quais campos são obrigatórios.

**Solução:**
- Adicionar `*` vermelho após labels de campos obrigatórios
- Aplicar em `TransactionModal`, `ProjectModal`, `GoalModal`
- Campos obrigatórios: Tipo, Valor, Descrição, Data, Método de Pagamento

---

## 7. Layout de 2 Transações por Linha

**Problema:** Transações ocupam 1 por linha, desperdício de espaço.

**Solução:**
- Alterar grid de transações para `grid-cols-1 md:grid-cols-2`
- Ajustar `TransactionCard` para layout mais compacto
- Manter responsividade (1 coluna em mobile, 2 em desktop)

---

## 8. Integrar Resumo Financeiro no Dashboard Principal

**Problema:** Dados financeiros isolados do dashboard principal.

**Solução:**
Adicionar seção ao Dashboard principal:
- Card: Receita do Mês (verde)
- Card: Despesas do Mês (vermelho)  
- Card: Saldo Líquido
- Link "Ver detalhes" para `/app/finance/transactions`

Criar hook `useQuickFinanceStats` para buscar resumo rápido.

---

## Ordem de Implementação

1. Migração SQL: Categorias padrão + Cheque como pagamento
2. Corrigir layout das páginas (padding)
3. Remover FinanceDashboard e ajustar rotas
4. Atualizar FinanceSidebar (remover Dashboard)
5. Adicionar indicadores `*` nos campos obrigatórios
6. Alterar grid de transações para 2 colunas
7. Criar QuickClientModal para criação rápida
8. Integrar resumos financeiros no Dashboard principal
9. Atualizar tipos e traduções

---

## Detalhes Técnicos

### Migração SQL para Categorias Padrão

```sql
-- Adicionar cheque ao enum
ALTER TYPE financial_payment_method ADD VALUE 'cheque';

-- Função para criar categorias padrão
CREATE OR REPLACE FUNCTION create_default_finance_categories()
RETURNS trigger AS $$
BEGIN
  -- Categorias de Receita
  INSERT INTO financial_categories (organization_id, name, type, color) VALUES
    (NEW.id, 'Serviços', 'income', '#22c55e'),
    (NEW.id, 'Consultoria', 'income', '#3b82f6'),
    (NEW.id, 'Venda de Produto', 'income', '#14b8a6'),
    (NEW.id, 'Comissões', 'income', '#f59e0b'),
    (NEW.id, 'Outras Receitas', 'income', '#8b5cf6');
  
  -- Categorias de Despesa
  INSERT INTO financial_categories (organization_id, name, type, color) VALUES
    (NEW.id, 'Salários', 'expense', '#ef4444'),
    (NEW.id, 'Marketing', 'expense', '#ec4899'),
    (NEW.id, 'Tecnologia', 'expense', '#3b82f6'),
    (NEW.id, 'Aluguel', 'expense', '#f97316'),
    (NEW.id, 'Transporte', 'expense', '#84cc16'),
    (NEW.id, 'Alimentação', 'expense', '#f59e0b'),
    (NEW.id, 'Material de Escritório', 'expense', '#6366f1'),
    (NEW.id, 'Impostos', 'expense', '#64748b'),
    (NEW.id, 'Outras Despesas', 'expense', '#78716c');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novas organizações
CREATE TRIGGER on_organization_created_finance_categories
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_finance_categories();

-- Criar categorias para organizações existentes
INSERT INTO financial_categories (organization_id, name, type, color)
SELECT o.id, c.name, c.type::financial_transaction_type, c.color
FROM organizations o
CROSS JOIN (VALUES
  ('Serviços', 'income', '#22c55e'),
  ('Consultoria', 'income', '#3b82f6'),
  ('Outras Receitas', 'income', '#8b5cf6'),
  ('Salários', 'expense', '#ef4444'),
  ('Marketing', 'expense', '#ec4899'),
  ('Tecnologia', 'expense', '#3b82f6'),
  ('Outras Despesas', 'expense', '#78716c')
) AS c(name, type, color)
WHERE NOT EXISTS (
  SELECT 1 FROM financial_categories fc 
  WHERE fc.organization_id = o.id
);
```

### Atualização de Tipos

```typescript
// src/types/finance.ts
export type PaymentMethod = 'transfer' | 'mpesa' | 'emola' | 'cash' | 'cheque' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  cash: 'Dinheiro',
  cheque: 'Cheque',
  other: 'Outro',
};
```

### QuickClientModal (Simplificado)

Campos mínimos para criação rápida:
- Nome da Empresa (obrigatório)
- Nome do Contacto
- Telefone
- Email

### Layout TransactionModal com Labels Obrigatórios

```tsx
<FormLabel>Tipo <span className="text-destructive">*</span></FormLabel>
<FormLabel>Valor <span className="text-destructive">*</span></FormLabel>
<FormLabel>Descrição <span className="text-destructive">*</span></FormLabel>
```

---

## Arquivos a Criar

1. `src/components/finance/QuickClientModal.tsx` - Modal criação rápida de cliente

## Arquivos a Modificar

1. `src/App.tsx` - Rota `/app/finance` → `FinanceTransactions`
2. `src/pages/Dashboard.tsx` - Adicionar resumos financeiros
3. `src/pages/finance/FinanceTransactions.tsx` - Layout, grid 2 colunas
4. `src/pages/finance/FinanceProjects.tsx` - Padding
5. `src/pages/finance/FinanceGoals.tsx` - Padding
6. `src/pages/finance/FinanceReports.tsx` - Padding
7. `src/components/finance/FinanceSidebar.tsx` - Remover Dashboard
8. `src/components/finance/TransactionModal.tsx` - Campos obrigatórios, QuickClient
9. `src/components/finance/TransactionCard.tsx` - Layout compacto
10. `src/types/finance.ts` - Adicionar `cheque`
11. `src/i18n/locales/*/finance.json` - Tradução cheque

## Arquivos a Deletar

1. `src/pages/finance/FinanceDashboard.tsx`
