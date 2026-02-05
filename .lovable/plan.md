

# Plano: Melhorar Layout do TransactionCard

## Análise das Imagens de Referência

### Layout Atual (Imagem 1 - Problemático)
- Informações dispersas e difíceis de ler
- Layout em grid que fragmenta a informação
- Categoria no topo mas sem contexto claro
- Descrição truncada demais

### Layout Desejado (Imagem 2 - Referência)
- Layout em lista horizontal limpo
- **Linha 1**: Descrição completa como título principal
- **Linha 2**: Data • Nome do Cliente (cor verde) • Método de Pagamento
- **Direita**: Valor com cor (verde para receita, vermelho para despesa)
- **Ações**: Ícones de editar/excluir visíveis diretamente

---

## Mudanças Propostas

### Nova Estrutura do TransactionCard

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Ícone]  Concepção + Treinamento (Bar Code) & Configuração...    +5750,00 Mt  [✎] [🗑]  │
│           02/02/2026 • OJ Comercial • Emola              [Consultoria]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Estrutura Visual:
- **Ícone**: Seta verde (receita) ou vermelha (despesa) à esquerda
- **Linha 1**: Descrição (título principal, sem truncar excessivo)
- **Linha 2**: Data • **Nome do Cliente** (cor primária/verde) • Método de Pagamento
- **Direita**: Valor grande com cor apropriada
- **Badge de Categoria**: Posicionado ao lado do método de pagamento ou no canto
- **Ações**: Botões de editar e excluir visíveis (sem dropdown em desktop)

---

## Implementação Detalhada

### Arquivo: `src/components/finance/TransactionCard.tsx`

```tsx
return (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-start gap-4">
        {/* Ícone */}
        <div className={cn(
          'p-2 rounded-full shrink-0 mt-1',
          isIncome ? 'bg-emerald-500/10' : 'bg-destructive/10'
        )}>
          {isIncome ? (
            <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
          ) : (
            <ArrowUpRight className="h-5 w-5 text-destructive" />
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 min-w-0">
          {/* Linha 1: Descrição */}
          <p className="font-medium text-foreground line-clamp-2">
            {transaction.description}
          </p>
          
          {/* Linha 2: Data + Cliente (destaque) + Método + Categoria */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-sm">
            <span className="text-muted-foreground">
              {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
            
            {transaction.clientName && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="font-medium text-primary">
                  {transaction.clientName}
                </span>
              </>
            )}
            
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
            </span>
            
            {transaction.categoryName && (
              <Badge 
                variant="outline" 
                className="ml-auto"
                style={{ 
                  borderColor: transaction.categoryColor,
                  color: transaction.categoryColor 
                }}
              >
                {transaction.categoryName}
              </Badge>
            )}
          </div>
        </div>

        {/* Valor */}
        <div className="text-right shrink-0">
          <p className={cn(
            'text-lg font-semibold whitespace-nowrap',
            isIncome ? 'text-emerald-500' : 'text-destructive'
          )}>
            {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {currencySymbol}
          </p>
        </div>

        {/* Ações - Visíveis diretamente */}
        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onEdit(transaction)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(transaction.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);
```

---

## Pontos-Chave do Design

| Elemento | Estilo |
|----------|--------|
| Descrição | `font-medium text-foreground line-clamp-2` |
| Nome do Cliente | `font-medium text-primary` (cor verde/primária em destaque) |
| Data e Método | `text-muted-foreground text-sm` |
| Categoria | Badge com cor personalizada, posicionado com `ml-auto` |
| Valor | `text-lg font-semibold` com cor verde (receita) ou vermelho (despesa) |
| Ações | Botões visíveis diretamente, sem dropdown |

---

## Benefícios

1. **Hierarquia Visual Clara**: Descrição em destaque, metadados secundários abaixo
2. **Nome do Cliente Destacado**: Cor primária (verde) para fácil identificação
3. **Categoria Bem Posicionada**: No canto direito da linha de metadados
4. **Ações Visíveis**: Editar e excluir sem precisar de clique extra
5. **Layout Responsivo**: `flex-wrap` permite quebra de linha em mobile

---

## Arquivo a Modificar

- `src/components/finance/TransactionCard.tsx`

---

## Resultado Esperado

- Layout similar à imagem 2 de referência
- Nome do cliente em cor destacada (verde/primária)
- Descrição legível sem truncamento excessivo
- Duas colunas no grid de cards conforme já existe
- Ações de editar/excluir visíveis diretamente
