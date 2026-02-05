
# Plano: Corrigir Preenchimento de Campos ao Editar

## Problema Identificado

Os modais de edição (TransactionModal, ProjectModal, GoalModal) não preenchem os campos com os dados existentes porque:

1. O hook `useForm` define `defaultValues` apenas na **inicialização**
2. Quando a prop `transaction`/`project`/`goal` muda (ao clicar editar), o formulário **não é atualizado**
3. O modal reutiliza a mesma instância do hook, mantendo os valores antigos

## Causa Técnica

```typescript
// PROBLEMA: defaultValues só é lido UMA VEZ
const form = useForm({
  defaultValues: {
    name: project?.name || '',  // Não atualiza quando project muda
    // ...
  },
});
```

## Solução

Adicionar um `useEffect` que chama `form.reset()` com os novos valores sempre que o modal abre ou o item de edição muda:

```typescript
useEffect(() => {
  if (open) {
    form.reset({
      name: project?.name || '',
      description: project?.description || '',
      // ... todos os campos
    });
  }
}, [open, project, form]);
```

Isso garante que:
- Ao abrir para **criar**: campos limpos com valores padrão
- Ao abrir para **editar**: campos preenchidos com dados existentes

---

## Arquivos a Modificar

### 1. TransactionModal.tsx

Adicionar `useEffect` para resetar o formulário:

```typescript
useEffect(() => {
  if (open) {
    form.reset({
      type: transaction?.type || 'income',
      amount: transaction?.amount || 0,
      description: transaction?.description || '',
      date: transaction?.date || format(new Date(), 'yyyy-MM-dd'),
      categoryId: transaction?.categoryId || undefined,
      clientId: transaction?.clientId || undefined,
      paymentMethod: transaction?.paymentMethod || 'transfer',
      notes: transaction?.notes || '',
    });
  }
}, [open, transaction, form]);
```

Remover o `useEffect` que limpa `categoryId` quando type muda (linha 115-117), pois isso estava apagando a categoria durante edição.

### 2. ProjectModal.tsx

Adicionar `useEffect` para resetar o formulário:

```typescript
useEffect(() => {
  if (open) {
    form.reset({
      name: project?.name || '',
      description: project?.description || '',
      clientId: project?.clientId || '',
      budget: project?.budget || 0,
      status: project?.status || 'planning',
      startDate: project?.startDate || format(new Date(), 'yyyy-MM-dd'),
      endDate: project?.endDate || '',
    });
  }
}, [open, project, form]);
```

### 3. GoalModal.tsx

Adicionar `useEffect` para resetar o formulário:

```typescript
useEffect(() => {
  if (open) {
    form.reset({
      name: goal?.name || '',
      targetAmount: goal?.targetAmount || 0,
      goalType: goal?.goalType || 'monthly',
      year: goal?.year || currentYear,
      month: goal?.month || new Date().getMonth() + 1,
    });
  }
}, [open, goal, form, currentYear]);
```

---

## Detalhes Tecnicos

### Imports Necessarios

Adicionar `useEffect` aos imports existentes:

```typescript
import { useState, useEffect } from 'react';
```

### Remocao de Codigo Problematico

No TransactionModal, remover o efeito que limpa a categoria:

```typescript
// REMOVER este useEffect - causa apagamento da categoria ao editar
useEffect(() => {
  form.setValue('categoryId', undefined);
}, [transactionType, form]);
```

### Ordem de Implementacao

1. TransactionModal.tsx - Adicionar useEffect + remover limpeza de categoria
2. ProjectModal.tsx - Adicionar useEffect
3. GoalModal.tsx - Adicionar useEffect

---

## Resultado Esperado

Apos a correcao:
- Clicar em "Editar" em qualquer lancamento, projeto ou meta preenchera todos os campos
- Tipo, valor, descricao, data, categoria, cliente, metodo de pagamento e notas serao carregados
- Criar novo item continuara funcionando normalmente com campos limpos
