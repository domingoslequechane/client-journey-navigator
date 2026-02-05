
# Plano: Unificar Pipeline e Melhorar UX

## Resumo das Mudanças

1. Unificar "Funil de Vendas" e "Fluxo Operacional" em uma unica pagina "Pipeline" com abas
2. Otimizar layout dos modais (ProjectModal, GoalModal) agrupando campos
3. Corrigir indicador ativo no menu para subpaginas

---

## 1. Unificar Funil de Vendas e Fluxo Operacional

### Problema Atual
- Duas paginas separadas (`SalesFunnel.tsx` e `OperationalFlow.tsx`)
- Duplicacao de codigo e navegacao fragmentada
- Regras de visibilidade aplicadas em rotas separadas

### Solucao
Criar uma unica pagina `Pipeline.tsx` com:
- Tabs para alternar entre "Funil de Vendas" e "Fluxo Operacional"
- Manter regras de visibilidade existentes (baseadas em role)
- Usuarios que so tem acesso a um fluxo verao apenas esse
- Admin ve ambos com tabs para alternar

### Logica de Visibilidade (mantida)
```text
+------------------+------------------+--------------------+
| Role             | Funil de Vendas  | Fluxo Operacional  |
+------------------+------------------+--------------------+
| Admin            | Sim              | Sim                |
| Sales            | Sim              | Nao                |
| Operations       | Nao              | Sim                |
| Campaign Mgmt    | Nao              | Sim                |
+------------------+------------------+--------------------+
```

### Arquivos Afetados
- **Criar**: `src/pages/Pipeline.tsx` - Nova pagina unificada
- **Editar**: `src/App.tsx` - Substituir rotas separadas por rota unica `/app/pipeline`
- **Editar**: `src/components/layout/Sidebar.tsx` - Item unico "Pipeline" no menu
- **Editar**: `src/components/layout/MobileNav.tsx` - Atualizar navegacao mobile
- **Deletar**: `src/pages/SalesFunnel.tsx` e `src/pages/OperationalFlow.tsx`

---

## 2. Corrigir Indicador Ativo no Menu para Subpaginas

### Problema Atual
Na Sidebar (linha 210), a verificacao de rota ativa e:
```typescript
const isActive = location.pathname === item.href;
```
Isso faz com que `/app/finance` nao fique marcado quando o usuario esta em `/app/finance/projects`.

### Solucao
Alterar a logica para usar `startsWith`:
```typescript
const isActive = item.href === '/app' 
  ? location.pathname === '/app'
  : location.pathname.startsWith(item.href);
```

Esta logica:
- Dashboard (`/app`) so fica ativo quando exatamente em `/app`
- Outros itens ficam ativos quando a rota comeca com o href (ex: `/app/finance/*`)

### Arquivos Afetados
- `src/components/layout/Sidebar.tsx` - Ajustar logica `isActive` no NavItem

---

## 3. Otimizar Layout dos Modais

### Problema Atual
- `ProjectModal` e `GoalModal` tem campos em linhas separadas
- Espaco nao e aproveitado eficientemente

### Solucao ProjectModal
Agrupar campos relacionados:
```text
Antes:                    Depois:
[Nome        ]            [Nome                    ]
[Descricao   ]            [Descricao               ]
[Orcamento   ]            [Orcamento    ] [Status  ]
[Status      ]            [Data Inicio ] [Data Fim ]
[Data Inicio ]            [Cliente (opcional)      ]
[Data Fim    ]
[Cliente     ]
```

Adicionar `*` nos campos obrigatorios:
- Nome*
- Orcamento*
- Status*
- Data Inicio*

### Solucao GoalModal
Agrupar campos:
```text
Antes:                    Depois:
[Nome        ]            [Nome*                   ]
[Valor Alvo  ]            [Valor Alvo* ] [Tipo*    ]
[Tipo        ]            [Ano*        ] [Mes      ]
[Ano         ]
[Mes         ]
```

### Arquivos Afetados
- `src/components/finance/ProjectModal.tsx`
- `src/components/finance/GoalModal.tsx`

---

## Implementacao Detalhada

### Nova Pagina Pipeline.tsx

A pagina tera:
1. Header com titulo dinamico baseado na aba ativa
2. Tabs (visivel apenas para Admin que tem acesso a ambos)
3. Conteudo do Kanban board baseado na aba selecionada
4. Botao "Novo Cliente" apenas no Funil de Vendas

Estrutura:
```text
+-----------------------------------------------+
| Pipeline                          [+ Cliente] |
| Gerencie seus leads e operacoes               |
+-----------------------------------------------+
| [Funil de Vendas] [Fluxo Operacional]         |  <- Tabs (apenas se ambos visiveis)
+-----------------------------------------------+
| [Prospeccao] [Reuniao] [Contratacao]          |  <- Stages do fluxo ativo
|    Card        Card       Card                |
|    Card        Card                           |
+-----------------------------------------------+
```

### Atualizacao de Rotas

```text
Antes:
  /app/sales-funnel -> SalesFunnel
  /app/operational-flow -> OperationalFlow

Depois:
  /app/pipeline -> Pipeline (com tabs)
  /app/pipeline/sales -> Pipeline (aba vendas)
  /app/pipeline/operations -> Pipeline (aba operacoes)
```

Redirects para compatibilidade:
- `/app/sales-funnel` -> `/app/pipeline/sales`
- `/app/operational-flow` -> `/app/pipeline/operations`

---

## Detalhes Tecnicos

### Logica de Acesso no Pipeline

```typescript
// Determinar abas visiveis
const tabs = useMemo(() => {
  const result = [];
  if (canSeeSalesFunnel) {
    result.push({ id: 'sales', label: 'Funil de Vendas' });
  }
  if (canSeeOperationalFlow) {
    result.push({ id: 'operations', label: 'Fluxo Operacional' });
  }
  return result;
}, [canSeeSalesFunnel, canSeeOperationalFlow]);

// Tab padrao baseado no role
const defaultTab = canSeeSalesFunnel ? 'sales' : 'operations';
```

### Atualizacao Sidebar NavItem

```typescript
const NavItem = ({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
  // ...
};

// Na renderizacao:
{navigation.map((item) => {
  const isActive = item.href === '/app' 
    ? location.pathname === '/app'
    : location.pathname.startsWith(item.href);
  return <NavItem key={item.name} item={item} isActive={isActive} />;
})}
```

### Labels com Asterisco (Campos Obrigatorios)

```tsx
<FormLabel>
  Nome <span className="text-destructive">*</span>
</FormLabel>
```

---

## Arquivos a Criar

1. `src/pages/Pipeline.tsx` - Pagina unificada de pipeline

## Arquivos a Editar

1. `src/App.tsx` - Novas rotas para pipeline, redirects
2. `src/components/layout/Sidebar.tsx` - Menu unificado + correcao isActive
3. `src/components/layout/MobileNav.tsx` - Navegacao mobile atualizada
4. `src/components/finance/ProjectModal.tsx` - Layout otimizado + campos obrigatorios
5. `src/components/finance/GoalModal.tsx` - Layout otimizado + campos obrigatorios
6. `src/i18n/locales/pt-BR/common.json` - Adicionar traducao "Pipeline"
7. `src/i18n/locales/en-US/common.json` - Adicionar traducao "Pipeline"

## Arquivos a Deletar

1. `src/pages/SalesFunnel.tsx`
2. `src/pages/OperationalFlow.tsx`

---

## Ordem de Implementacao

1. Criar `Pipeline.tsx` com logica de tabs e visibilidade
2. Atualizar rotas em `App.tsx`
3. Atualizar `Sidebar.tsx` (menu + correcao isActive)
4. Atualizar `MobileNav.tsx`
5. Otimizar `ProjectModal.tsx`
6. Otimizar `GoalModal.tsx`
7. Atualizar traducoes
8. Deletar paginas antigas

