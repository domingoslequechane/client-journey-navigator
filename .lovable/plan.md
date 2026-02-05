
# Plano: Destacar Nome do Cliente e Expandir Filtro de Busca

## Resumo das Mudanças

1. Destacar o nome do cliente no card de transação (atualmente está como texto secundário)
2. Expandir o filtro de busca para pesquisar por: descrição, tipo, nome do cliente e categoria

---

## 1. Destacar Nome do Cliente no TransactionCard

### Problema Atual
O nome do cliente está misturado com informações secundárias (data, método de pagamento) na linha inferior, com estilo `text-muted-foreground`:

```tsx
<div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
  <span>{format(...)}</span>
  {transaction.clientName && (
    <>
      <span>•</span>
      <span className="truncate">{transaction.clientName}</span>  // Pouco visível
    </>
  )}
  ...
</div>
```

### Solução
Mover o nome do cliente para a linha principal, junto com a descrição, com destaque visual:

```text
Antes:
+50 Créditos Lovable [Tecnologia]
04 fev 2026 • OJ Comercial • Transferência

Depois:
+50 Créditos Lovable [Tecnologia]
OJ Comercial                         <- Nome do cliente em destaque
04 fev 2026 • Transferência
```

### Implementação
No TransactionCard, reorganizar:
- Linha 1: Descrição + Badge de categoria
- Linha 2: Nome do cliente com `font-medium text-foreground` (visível e destacado)
- Linha 3: Data + Método de pagamento (muted)

### Arquivo Afetado
- `src/components/finance/TransactionCard.tsx`

---

## 2. Expandir Filtro de Busca

### Problema Atual
O hook `useTransactions` filtra apenas pela descrição:

```typescript
if (filters?.search) {
  query = query.ilike('description', `%${filters.search}%`);
}
```

### Solução
Realizar a filtragem no frontend após buscar todos os dados, permitindo pesquisar por múltiplos campos:
- Descrição
- Tipo de lançamento (Receita/Despesa)
- Nome da empresa (cliente)
- Categoria

### Implementação

#### A) No hook useTransactions
Remover o filtro de search do query do Supabase (server-side) e fazer a filtragem no frontend:

```typescript
// Buscar todos os dados e filtrar localmente
const filteredTransactions = useMemo(() => {
  if (!filters?.search) return transactions;
  
  const searchLower = filters.search.toLowerCase();
  return transactions.filter(t => 
    t.description.toLowerCase().includes(searchLower) ||
    t.clientName?.toLowerCase().includes(searchLower) ||
    t.categoryName?.toLowerCase().includes(searchLower) ||
    (t.type === 'income' && 'receita'.includes(searchLower)) ||
    (t.type === 'expense' && 'despesa'.includes(searchLower))
  );
}, [transactions, filters?.search]);
```

#### B) Atualizar placeholder do input de busca
Indicar ao usuário os campos pesquisáveis:

```tsx
<Input
  placeholder="Pesquisar por descrição, cliente, categoria..."
  ...
/>
```

### Arquivos Afetados
- `src/hooks/finance/useTransactions.ts` - Filtro local multi-campo
- `src/pages/finance/FinanceTransactions.tsx` - Atualizar placeholder

---

## Detalhes Técnicos

### TransactionCard - Nova Estrutura

```tsx
{/* Content */}
<div className="flex-1 min-w-0">
  {/* Linha 1: Descrição + Categoria */}
  <div className="flex items-center gap-2">
    <p className="font-medium truncate">{transaction.description}</p>
    {transaction.categoryName && (
      <Badge variant="outline" ...>
        {transaction.categoryName}
      </Badge>
    )}
  </div>
  
  {/* Linha 2: Nome do Cliente (Destacado) */}
  {transaction.clientName && (
    <p className="text-sm font-medium text-foreground mt-1 truncate">
      {transaction.clientName}
    </p>
  )}
  
  {/* Linha 3: Data + Método de Pagamento */}
  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
    <span>{format(...)}</span>
    <span>•</span>
    <span>{PAYMENT_METHOD_LABELS[transaction.paymentMethod]}</span>
  </div>
</div>
```

### useTransactions - Filtro Multi-Campo

```typescript
export function useTransactions(filters?: TransactionFilters) {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  
  // Fetch sem filtro de search
  const fetchTransactions = useCallback(async () => {
    // ... query sem ilike('description', ...)
  }, [organizationId, filters?.type, filters?.categoryId, filters?.clientId, filters?.startDate, filters?.endDate]);
  
  // Filtro local para busca multi-campo
  const transactions = useMemo(() => {
    if (!filters?.search) return allTransactions;
    
    const searchLower = filters.search.toLowerCase();
    return allTransactions.filter(t => {
      // Descrição
      if (t.description.toLowerCase().includes(searchLower)) return true;
      // Nome do cliente
      if (t.clientName?.toLowerCase().includes(searchLower)) return true;
      // Categoria
      if (t.categoryName?.toLowerCase().includes(searchLower)) return true;
      // Tipo
      if (t.type === 'income' && 'receita'.includes(searchLower)) return true;
      if (t.type === 'expense' && 'despesa'.includes(searchLower)) return true;
      return false;
    });
  }, [allTransactions, filters?.search]);
  
  // Recalcular totais baseado nos filtrados
  const totals = transactions.reduce(...);
  
  return { transactions, ... };
}
```

---

## Arquivos a Modificar

1. `src/components/finance/TransactionCard.tsx` - Destacar nome do cliente
2. `src/hooks/finance/useTransactions.ts` - Filtro multi-campo local
3. `src/pages/finance/FinanceTransactions.tsx` - Atualizar placeholder da busca

---

## Ordem de Implementação

1. TransactionCard.tsx - Reorganizar layout para destacar cliente
2. useTransactions.ts - Implementar filtro local multi-campo
3. FinanceTransactions.tsx - Atualizar placeholder do input

---

## Resultado Esperado

Após a correção:
- O nome do cliente aparece em destaque abaixo da descrição
- A busca filtra por descrição, nome do cliente, categoria e tipo
- O placeholder indica os campos pesquisáveis
- Os totais são recalculados baseados nos resultados filtrados
