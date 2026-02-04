
# Plano de Integração: Módulo de Controle Financeiro

## Visão Geral

Integrar um módulo completo de controle financeiro ao Qualify, permitindo que cada agência gerencie seu fluxo de caixa de forma individual com base na sua carteira de clientes.

---

## 1. Estrutura do Módulo

### Novas Páginas (5)
```text
src/pages/finance/
  FinanceDashboard.tsx    -> /app/finance
  FinanceTransactions.tsx -> /app/finance/transactions
  FinanceProjects.tsx     -> /app/finance/projects
  FinanceGoals.tsx        -> /app/finance/goals
  FinanceReports.tsx      -> /app/finance/reports
```

### Novos Componentes
```text
src/components/finance/
  TransactionModal.tsx      -> Modal criar/editar lançamento
  TransactionCard.tsx       -> Card de transação na lista
  ProjectModal.tsx          -> Modal criar/editar projeto
  ProjectCard.tsx           -> Card de projeto
  GoalModal.tsx             -> Modal criar/editar meta
  GoalCard.tsx              -> Card de meta com progresso
  FinanceStatsCard.tsx      -> Cards de resumo (receita, despesa, saldo)
  MonthlyEvolutionChart.tsx -> Gráfico evolução mensal (área)
  ExpensesPieChart.tsx      -> Gráfico despesas por categoria
  MonthlyComparisonChart.tsx-> Gráfico comparativo mensal (barras)
  ClientRevenueCard.tsx     -> Card cliente com receita total
  FinanceSidebar.tsx        -> Sub-navegação do módulo
```

---

## 2. Base de Dados (Novas Tabelas)

### Tabela: financial_transactions
```text
- id (uuid, PK)
- organization_id (uuid, FK -> organizations)
- type (enum: 'income' | 'expense')
- amount (decimal)
- description (text)
- date (date)
- category_id (uuid, FK -> financial_categories, opcional)
- client_id (uuid, FK -> clients, opcional)
- payment_method (text: 'transfer' | 'mpesa' | 'emola' | 'cash' | 'other')
- notes (text, opcional)
- created_by (uuid)
- created_at (timestamp)
- updated_at (timestamp)
```

### Tabela: financial_categories
```text
- id (uuid, PK)
- organization_id (uuid, FK)
- name (text)
- type (enum: 'income' | 'expense')
- color (text, opcional)
- created_at (timestamp)
```

### Tabela: financial_projects
```text
- id (uuid, PK)
- organization_id (uuid, FK)
- name (text)
- description (text, opcional)
- client_id (uuid, FK -> clients, opcional)
- budget (decimal)
- status (enum: 'planning' | 'in_progress' | 'completed' | 'cancelled')
- start_date (date)
- end_date (date, opcional)
- created_by (uuid)
- created_at (timestamp)
- updated_at (timestamp)
```

### Tabela: financial_goals
```text
- id (uuid, PK)
- organization_id (uuid, FK)
- name (text)
- target_amount (decimal)
- current_amount (decimal, default 0)
- goal_type (enum: 'monthly' | 'quarterly' | 'yearly')
- year (integer)
- month (integer, opcional para quarterly/yearly)
- created_at (timestamp)
- updated_at (timestamp)
```

### Políticas RLS
- Todas as tabelas terão RLS habilitado
- Acesso restrito a organization_id do usuário autenticado
- Operações INSERT/UPDATE/DELETE apenas para admin e roles permitidos

---

## 3. Hooks Personalizados

```text
src/hooks/finance/
  useFinanceStats.ts       -> Estatísticas (receita, despesa, saldo)
  useTransactions.ts       -> CRUD de lançamentos + filtros
  useFinanceProjects.ts    -> CRUD de projetos
  useFinanceGoals.ts       -> CRUD de metas + cálculo progresso
  useFinanceReports.ts     -> Dados agregados para relatórios
  useFinanceCategories.ts  -> CRUD de categorias
```

---

## 4. Tipos TypeScript

```text
src/types/finance.ts

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'transfer' | 'mpesa' | 'emola' | 'cash' | 'other';
export type ProjectStatus = 'planning' | 'in_progress' | 'completed' | 'cancelled';
export type GoalType = 'monthly' | 'quarterly' | 'yearly';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId?: string;
  categoryName?: string;
  clientId?: string;
  clientName?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface FinanceProject { ... }
export interface FinanceGoal { ... }
export interface FinanceCategory { ... }
export interface FinanceStats { ... }
```

---

## 5. Navegação e Rotas

### Sidebar Principal
Adicionar novo item no sidebar:
```text
{ 
  name: 'Finanças', 
  href: '/app/finance', 
  icon: Wallet,
  show: canSeeFinance // admin + sales
}
```

### Sub-navegação Financeira
Dentro das páginas de finanças, usar tabs ou sidebar interno:
```text
- Dashboard (visão geral)
- Lançamentos (receitas/despesas)
- Projetos (orçamentos)
- Metas (OKRs)
- Relatórios (análises)
```

### App.tsx - Novas Rotas
```text
<Route path="finance" element={<FinanceDashboard />} />
<Route path="finance/transactions" element={<FinanceTransactions />} />
<Route path="finance/projects" element={<FinanceProjects />} />
<Route path="finance/goals" element={<FinanceGoals />} />
<Route path="finance/reports" element={<FinanceReports />} />
```

---

## 6. Funcionalidades por Página

### 6.1 Dashboard Financeiro (/app/finance)
- Cards: Receita Total, Crescimento, Despesas, Saldo Líquido
- Gráfico de Receitas (evolução anual)
- Gráfico de Despesas (donut por categoria)
- Comparativo Mensal (barras receita vs despesa)
- Metas Activas (resumo)
- Últimos Lançamentos (5 mais recentes)
- Contadores: Total Clientes, Total Projetos

### 6.2 Lançamentos (/app/finance/transactions)
- Cards resumo: Receitas, Despesas, Saldo
- Pesquisa por descrição/cliente
- Filtro: Todos | Receitas | Despesas
- Lista de lançamentos com:
  - Ícone (seta verde/vermelha)
  - Descrição + data
  - Cliente associado (se houver)
  - Método de pagamento
  - Valor (verde/vermelho)
  - Botões editar/excluir
- Modal "Novo Lançamento":
  - Tipo (Receita/Despesa)
  - Valor
  - Descrição
  - Data
  - Categoria
  - Cliente (opcional, pesquisável)
  - Método de Pagamento
  - Notas (opcional)

### 6.3 Projetos (/app/finance/projects)
- Cards: Total Projetos, Activos, Orçamento Total
- Pesquisa
- Filtro por status
- Grid de cards de projetos com:
  - Badge de status
  - Nome + descrição
  - Cliente associado
  - Data início
  - Valor do orçamento
  - Botões editar/excluir
- Modal "Novo Projeto":
  - Nome
  - Descrição
  - Status
  - Orçamento
  - Data Início/Fim
  - Cliente (pesquisável)

### 6.4 Metas & OKRs (/app/finance/goals)
- Cards: Total Metas, Metas Atingidas
- Lista de metas com:
  - Nome
  - Tipo + período
  - Barra de progresso
  - Actual vs Meta
  - Botões editar/excluir
- Modal "Nova Meta":
  - Nome
  - Valor alvo
  - Tipo (Mensal/Trimestral/Anual)
  - Ano/Mês

### 6.5 Relatórios (/app/finance/reports)
- Seletor de ano
- Cards: Receitas do Ano, Despesas do Ano, Lucro Líquido
- Gráfico Evolução Mensal (área com receitas + despesas)
- Gráfico Lucro Mensal (barras)
- Gráfico Por Categoria (donut)
- Botão Exportar CSV

---

## 7. Integração com Sistema Existente

### Clientes
- Reutilizar tabela `clients` existente
- Lançamentos podem ter `client_id` opcional
- Projetos podem ter `client_id` opcional
- Na página de clientes, mostrar total de receita por cliente

### Moeda
- Usar hook `useOrganizationCurrency` existente
- Formatação consistente com resto do sistema

### Permissões
- Estender `useUserRole` para incluir `canSeeFinance`
- Admin e Sales têm acesso completo
- Operations tem acesso somente leitura

---

## 8. Traduções (i18n)

Criar ficheiros:
```text
src/i18n/locales/pt-BR/finance.json
src/i18n/locales/en-US/finance.json
```

Chaves principais:
```text
{
  "title": "Finanças",
  "dashboard": "Dashboard",
  "transactions": "Lançamentos",
  "projects": "Projetos",
  "goals": "Metas",
  "reports": "Relatórios",
  "income": "Receita",
  "expense": "Despesa",
  "balance": "Saldo",
  ...
}
```

---

## 9. Ordem de Implementação

### Fase 1 - Fundação
1. Criar tipos TypeScript (`src/types/finance.ts`)
2. Criar migração das tabelas no Supabase
3. Configurar RLS policies
4. Atualizar `types.ts` do Supabase

### Fase 2 - Lançamentos (Core)
5. Criar hook `useTransactions`
6. Criar componentes `TransactionModal` e `TransactionCard`
7. Criar página `FinanceTransactions`
8. Adicionar rota no App.tsx

### Fase 3 - Dashboard
9. Criar hook `useFinanceStats`
10. Criar componentes de gráficos
11. Criar página `FinanceDashboard`
12. Adicionar item no Sidebar

### Fase 4 - Projetos
13. Criar hook `useFinanceProjects`
14. Criar componentes de projetos
15. Criar página `FinanceProjects`

### Fase 5 - Metas
16. Criar hook `useFinanceGoals`
17. Criar componentes de metas
18. Criar página `FinanceGoals`

### Fase 6 - Relatórios
19. Criar hook `useFinanceReports`
20. Criar página `FinanceReports` com exportação CSV

### Fase 7 - Finalização
21. Adicionar traduções i18n
22. Testes e ajustes de UI
23. Documentação

---

## 10. Detalhes Técnicos

### Componentes Reutilizáveis
- `StatsCard` existente (dashboard)
- `Card`, `Button`, `Input`, `Select`, `Dialog` (shadcn/ui)
- `ChartContainer`, `AreaChart`, `BarChart`, `PieChart` (recharts)
- `Table` para listas (opcional)

### Padrões a Seguir
- Usar `AnimatedContainer` para animações
- Usar `toast` para feedback
- Usar `Skeleton` para loading states
- Usar `useOrganizationCurrency` para moeda
- Seguir estrutura de hooks existentes

### Migração SQL Exemplo
```sql
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE payment_method AS ENUM ('transfer', 'mpesa', 'emola', 'cash', 'other');
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'completed', 'cancelled');
CREATE TYPE goal_type AS ENUM ('monthly', 'quarterly', 'yearly');

CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES financial_categories(id),
  client_id UUID REFERENCES clients(id),
  payment_method payment_method NOT NULL DEFAULT 'transfer',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Similar para outras tabelas...

-- RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org transactions"
ON financial_transactions FOR SELECT
USING (organization_id = (
  SELECT COALESCE(current_organization_id, organization_id)
  FROM profiles WHERE id = auth.uid()
));

-- Policies para INSERT, UPDATE, DELETE...
```

---

## Resumo

Este módulo financeiro será integrado de forma nativa ao Qualify, reutilizando:
- Sistema de clientes existente
- Arquitectura multi-tenant
- Componentes UI padronizados
- Sistema de moedas e permissões

Resultado: Cada agência terá controle total sobre seu fluxo de caixa, vinculado à sua carteira de clientes.
