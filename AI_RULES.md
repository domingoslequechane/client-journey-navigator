# Diretrizes de Desenvolvimento (AI Rules)

Este documento descreve a stack tecnológica e as regras de utilização de bibliotecas para garantir a consistência, manutenibilidade e qualidade do código.

## 1. Stack Tecnológica

*   **Framework:** React (com Vite e TypeScript).
*   **Linguagem:** TypeScript (uso obrigatório para tipagem).
*   **Estilização:** Tailwind CSS (uso exclusivo para todos os estilos).
*   **Componentes UI:** shadcn/ui (baseado em Radix UI).
*   **Roteamento:** React Router DOM.
*   **Gerenciamento de Estado/Dados:** React Query (`@tanstack/react-query`) para dados assíncronos.
*   **Backend/Autenticação:** Supabase (`@supabase/supabase-js`).
*   **Formulários:** React Hook Form para gestão de formulários e Zod para validação de schemas.
*   **Ícones:** Lucide React.
*   **Notificações:** Sistema de Toast padrão (via `useToast` hook).

## 2. Regras de Utilização de Bibliotecas

| Funcionalidade | Biblioteca Preferida | Regra de Uso |
| :--- | :--- | :--- |
| **UI/Componentes** | shadcn/ui | Priorizar componentes existentes. Se necessário, criar novos componentes em `src/components/ui/` ou `src/components/` usando Tailwind. |
| **Estilização** | Tailwind CSS | Usar classes utilitárias do Tailwind. Evitar estilos inline ou CSS puro. |
| **Roteamento** | React Router DOM | Gerenciar todas as rotas em `src/App.tsx`. Usar `Link` e `useNavigate` para navegação. |
| **Dados Assíncronos** | React Query | Usar para todas as operações de fetch, cache e mutação de dados do Supabase. |
| **Formulários** | React Hook Form + Zod | Usar React Hook Form para controle de inputs e Zod para validação de schemas. |
| **Ícones** | Lucide React | Usar exclusivamente para todos os ícones. |
| **Notificações** | `useToast` (shadcn/ui) | Usar o hook `useToast` (definido em `src/hooks/use-toast.ts`) para notificações temporárias. |
| **Backend/DB** | Supabase Client | Usar o cliente Supabase (`@/integrations/supabase/client`) para interagir com o banco de dados e autenticação. |