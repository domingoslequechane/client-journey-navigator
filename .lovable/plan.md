

# Plano: Melhorias de Layout, Menu e Responsividade

## Resumo das Mudancas

1. Mover "Resumo Financeiro do Mes" para o topo do Dashboard
2. Mover "Clientes" para depois de "Academia" no menu lateral
3. Adicionar "Financas" visivel na navegacao mobile (sem precisar clicar em "Mais")
4. Auto-recolher sidebar em tablets mostrando apenas icones
5. Tornar todo o modulo de Financas responsivo mobile-first

---

## 1. Reordenar Dashboard - Financeiro no Topo

### Problema Atual
O "Resumo Financeiro do Mes" esta no final do Dashboard (linhas 224-259).

### Solucao
Mover a secao financeira para ser a primeira linha apos o header, antes dos Stats Cards de clientes.

### Nova Ordem do Dashboard
```text
1. Header (Titulo + Subtitulo)
2. Resumo Financeiro do Mes (Receitas, Despesas, Saldo) <- MOVE PARA CIMA
3. Stats Cards (Total Clientes, Receita Esperada, Hot Leads, Conversao)
4. Charts Section (Revenue, Funnel)
5. Insights Section (Source, Highlight, AI)
```

### Arquivo Afetado
- `src/pages/Dashboard.tsx`

---

## 2. Reordenar Menu Lateral - Clientes apos Academia

### Problema Atual
Ordem atual do menu:
1. Dashboard
2. Pipeline
3. Clientes
4. Financas
5. Link23
6. Studio AI
7. QIA
8. Academia
9. Equipa

### Nova Ordem
1. Dashboard
2. Pipeline
3. Financas
4. Link23
5. Studio AI
6. QIA
7. Academia
8. **Clientes** <- Move para depois de Academia
9. Equipa

### Arquivo Afetado
- `src/components/layout/Sidebar.tsx` - Reordenar array `navigation`

---

## 3. Financas Visivel na Navegacao Mobile

### Problema Atual
Na MobileNav, apenas 4 itens sao visiveis: Home, Pipeline, QIA, Mais.
Financas esta dentro do menu "Mais", exigindo clique extra.

### Solucao
Adicionar "Financas" como item direto na barra de navegacao mobile (5 itens visiveis):
- Home
- Pipeline
- Financas <- NOVO
- QIA
- Mais

### Arquivo Afetado
- `src/components/layout/MobileNav.tsx` - Adicionar Financas ao array `navigation`

---

## 4. Auto-Recolher Sidebar em Tablets

### Problema Atual
A sidebar usa o mesmo comportamento em desktop e tablet.
O breakpoint mobile e 1024px, mas tablets (768px-1024px) mostram sidebar completa.

### Solucao
Detectar quando o dispositivo e tablet (768px - 1024px) e auto-recolher a sidebar mostrando apenas icones.

### Implementacao
1. Criar hook ou logica para detectar tablet
2. No Sidebar, usar `collapsed = true` automaticamente em tablets
3. Manter controle manual do usuario respeitado em desktop

### Logica de Deteccao
```typescript
// Tablet: 768px <= width < 1024px
const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

// Auto-collapse em tablet, mas permitir toggle manual
const [manualCollapsed, setManualCollapsed] = useState(savedState);
const effectiveCollapsed = isTablet || manualCollapsed;
```

### Arquivo Afetado
- `src/components/layout/Sidebar.tsx` - Adicionar deteccao de tablet e auto-collapse

---

## 5. Financas Responsivo Mobile-First

### Problema Atual
O modulo de financas tem layout desktop-first com ajustes para mobile.

### Melhorias Necessarias

#### A) FinanceSidebar (Navegacao de sub-paginas)
- Garantir scroll horizontal suave em mobile
- Botoes com padding adequado para touch

#### B) FinanceTransactions
- Grid ja e `grid-cols-1 md:grid-cols-2` (OK)
- Ajustar filtros para empilhar melhor em mobile
- Stats cards ja sao responsivos (OK)

#### C) FinanceProjects
- Grid ja e `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (OK)
- Ajustar filtros para mobile

#### D) FinanceGoals
- Grid ja e responsivo (OK)
- Year selector bem posicionado

#### E) FinanceReports
- Charts responsivos (OK)
- Ajustar header em mobile (botoes empilhados)

#### F) Modais (TransactionModal, ProjectModal, GoalModal)
- Campos agrupados ja foram otimizados
- Garantir scroll em mobile para modais longos
- Ajustar grid para single column em mobile

### Arquivos Afetados
- `src/components/finance/FinanceSidebar.tsx` - Touch-friendly
- `src/pages/finance/FinanceReports.tsx` - Header responsivo
- `src/components/finance/TransactionModal.tsx` - Campos 1-col em mobile
- `src/components/finance/ProjectModal.tsx` - Campos 1-col em mobile
- `src/components/finance/GoalModal.tsx` - Campos 1-col em mobile

---

## Detalhes Tecnicos

### Dashboard - Mover Financeiro para Cima

```tsx
// src/pages/Dashboard.tsx
// Mover bloco das linhas 224-259 para logo apos o header (apos linha 159)

{/* Finance Summary Section - PRIMEIRO */}
{canManageFinance && (
  <AnimatedContainer animation="fade-up" delay={0.05}>
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{t('financeOverview.title')}</h2>
      <Link to="/app/finance">
        <Button variant="ghost" size="sm">
          {t('financeOverview.viewDetails')} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </Link>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
      {/* Cards de Receitas, Despesas, Saldo */}
    </div>
  </AnimatedContainer>
)}

{/* Stats Cards - DEPOIS */}
<div className="grid grid-cols-2 ...">
```

### Sidebar - Reordenar Menu

```tsx
// src/components/layout/Sidebar.tsx
const navigation = useMemo(() => {
  const allItems = [
    { name: 'Dashboard', href: '/app', ... },
    { name: 'Pipeline', href: '/app/pipeline', ... },
    { name: 'Financas', href: '/app/finance', ... },
    { name: 'Link23', href: '/app/link-trees', ... },
    { name: 'Studio AI', href: '/app/studio', ... },
    { name: 'QIA', href: '/app/ai-assistant', ... },
    { name: 'Academia', href: '/app/academia', ... },
    { name: 'Clientes', href: '/app/clients', ... },  // <- Movido para depois de Academia
    { name: 'Equipa', href: '/app/team', ... },
  ];
  return allItems.filter(item => item.show);
}, [...]);
```

### MobileNav - Adicionar Financas

```tsx
// src/components/layout/MobileNav.tsx
import { Wallet } from 'lucide-react';

const navigation = useMemo(() => {
  const items = [
    { name: t('navigation.home'), href: '/app', icon: LayoutDashboard, show: true },
  ];

  if (canSeeSalesFunnel || canSeeOperationalFlow) {
    items.push({ name: t('navigation.pipeline'), href: '/app/pipeline', icon: Kanban, show: true });
  }

  // Adicionar Financas na navegacao principal
  if (canSeeFinance) {
    items.push({ name: 'Financas', href: '/app/finance', icon: Wallet, show: true });
  }

  items.push({ name: t('navigation.qia'), href: '/app/ai-assistant', icon: Sparkles, show: true });

  return items;
}, [canSeeSalesFunnel, canSeeOperationalFlow, canSeeFinance, t]);
```

### Sidebar - Auto-Collapse em Tablet

```tsx
// src/components/layout/Sidebar.tsx

// Constantes de breakpoint
const TABLET_MIN = 768;
const TABLET_MAX = 1024;

// Detectar tablet
const [isTablet, setIsTablet] = useState(false);

useEffect(() => {
  const checkTablet = () => {
    const width = window.innerWidth;
    setIsTablet(width >= TABLET_MIN && width < TABLET_MAX);
  };
  
  checkTablet();
  window.addEventListener('resize', checkTablet);
  return () => window.removeEventListener('resize', checkTablet);
}, []);

// Collapsed efetivo: auto em tablet OU manual do usuario
const effectiveCollapsed = isTablet || collapsed;

// Usar effectiveCollapsed em vez de collapsed para renderizacao
```

### Modais Responsivos Mobile-First

```tsx
// Padrao para campos agrupados nos modais:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FormField ... />
  <FormField ... />
</div>

// Isso garante:
// - Mobile (< 640px): 1 coluna
// - Desktop (>= 640px): 2 colunas
```

---

## Arquivos a Modificar

1. `src/pages/Dashboard.tsx` - Mover resumo financeiro para o topo
2. `src/components/layout/Sidebar.tsx` - Reordenar menu + auto-collapse tablet
3. `src/components/layout/MobileNav.tsx` - Adicionar Financas + importar Wallet + usar canSeeFinance
4. `src/pages/finance/FinanceReports.tsx` - Header responsivo
5. `src/components/finance/TransactionModal.tsx` - Grid mobile-first
6. `src/components/finance/ProjectModal.tsx` - Grid mobile-first
7. `src/components/finance/GoalModal.tsx` - Grid mobile-first
8. `src/components/finance/FinanceSidebar.tsx` - Touch-friendly

---

## Ordem de Implementacao

1. Reordenar menu (Sidebar) - Clientes apos Academia
2. Adicionar Financas na MobileNav
3. Implementar auto-collapse em tablet (Sidebar)
4. Mover resumo financeiro para topo do Dashboard
5. Tornar modais mobile-first (TransactionModal, ProjectModal, GoalModal)
6. Ajustar FinanceReports header para mobile
7. Melhorar FinanceSidebar para touch

