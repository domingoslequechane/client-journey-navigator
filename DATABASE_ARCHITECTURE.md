# 🏗️ Arquitetura Completa do Banco de Dados - OnixCRM

Este documento fornece um mapeamento detalhado da arquitetura do banco de dados Supabase para o projeto **OnixCRM** (ID: `hrarkpjuchrbffnrhzcy`).

---

## 📊 Visão Geral do Sistema
- **Projeto:** OnixCRM
- **Região:** eu-west-1 (Ireland)
- **Status:** ACTIVE
- **Versão do Postgres:** 17.6.1.054
- **Total de Tabelas:** 37
- **Total de Funções Edge:** 37
- **Esquema Principal:** `public`

---

## 🛠️ Extensões Instaladas
As seguintes extensões estão habilitadas no banco de dados para funcionalidades avançadas:

- `pg_graphql` (1.5.11): Suporte a GraphQL nativo.
- `uuid-ossp` (1.1): Geração de UUIDs.
- `pgcrypto` (1.3): Funções criptográficas.
- `pg_stat_statements` (1.11): Rastreamento de estatísticas de execução de SQL.
- `supabase_vault` (0.3.1): Armazenamento seguro de segredos.
- `plpgsql` (1.0): Linguagem procedural padrão.

---

## 📁 Dicionário de Tabelas (public)

### 1. Núcleo (Organizações e Perfis)
#### `organizations`
- **Descrição:** Armazena as organizações/tenants do sistema.
- **RLS:** Ativado.
- **Políticas:**
  - `Owners can view their own organization` (SELECT)
  - `Users can view their organization` (SELECT)
  - `Users can create their own organizations` (INSERT)
  - `Organization owner or admin can update` (UPDATE)
  - `Proprietors can view/update all` (ALL)

#### `profiles`
- **Descrição:** Extensão da tabela de usuários (auth.users).
- **RLS:** Ativado.
- **Campos Chave:** `role` (user_role), `suspended`, `organization_id`.
- **Políticas:**
  - `profiles_select_own_policy` (SELECT)
  - `Users can view members of their organizations` (SELECT)
  - `Authorized users can update team profiles` (UPDATE)
  - `Admins can manage organization members` (ALL)

#### `organization_members`
- **Descrição:** Relaciona usuários a organizações com papéis específicos.
- **RLS:** Ativado.
- **Políticas:**
  - `Users can view own memberships` (SELECT)
  - `Authorized users can view organization members` (SELECT)
  - `Admins can manage organization members` (ALL)

### 2. Gestão de Clientes
#### `clients`
- **Descrição:** Entidade principal para gestão de CRM.
- **RLS:** Ativado.
- **Campos Chave:** `current_stage` (journey_stage), `qualification` (lead_qualification), `organization_id`.
- **Relacionamentos:** 
  - `user_id` -> `auth.users.id`
  - `organization_id` -> `public.organizations.id`
- **Políticas:**
  - `Users can view/insert/update/delete clients in their organization`
  - `Admins can manage organization clients`

#### `activities`
- **Descrição:** Log de interações e mudanças nos clientes.
- **RLS:** Ativado.
- **Tipos de Atividade:** `call`, `email`, `meeting`, `note`, `task`, `milestone`, etc.

### 3. Módulos Operacionais
#### `ai_conversations` & `ai_messages`
- **Descrição:** Armazena o histórico de chats com IA para cada cliente.
- **RLS:** Ativado. Proteção por `organization_id`.

#### `studio_projects` & `studio_flyers`
- **Descrição:** Módulo de criação de artes e flyers.
- **Campos:** `prompt`, `image_url`, `style`, `model`.

#### `social_accounts` & `social_posts`
- **Descrição:** Módulo de gestão de redes sociais.
- **Plataformas suportadas via Tipos:** Configurado como texto nas colunas.

### 4. Financeiro
#### `financial_transactions`, `financial_categories`, `financial_goals`, `financial_projects`
- **Descrição:** Fluxo de caixa, metas e projetos financeiros.
- **Moeda Padrão:** Definida na organização (ex: MZN).

#### `service_invoices` & `invoice_template_settings`
- **Descrição:** Facturação de serviços.

---

## 🔐 Segurança (RLS & Políticas)
O banco de dados utiliza **Multi-tenancy** baseado em `organization_id`.

### Padrão de Segurança:
1. **Isolamento de Dados:** Quase todas as tabelas possuem `organization_id` e políticas que verificam `user_belongs_to_org(auth.uid(), organization_id)`.
2. **Hierarquia de Papéis:**
   - `owner`: Dono da organização, acesso total.
   - `admin`: Permissões administrativas dentro da org.
   - `sales`/`operations`/etc: Acesso restrito a funcionalidades específicas.
   - `proprietor` (App Level): Papel de super-admin do sistema (Onix CRM Admin).

### Exemplo de Política Complexa (`clients` SELECT):
```sql
(auth.uid() = user_id) OR 
((organization_id IS NOT NULL) AND user_belongs_to_org(auth.uid(), organization_id))
```

---

## 🔠 Tipos Customizados (Enums)
- `journey_stage`: `{prospeccao, reuniao, contratacao, producao, trafego, retencao, fidelizacao}`
- `user_role`: `{sales, operations, campaign_management, admin, owner}`
- `app_role`: `{admin, moderator, user, proprietor}`
- `plan_type`: `{free, starter, pro, agency}`
- `financial_payment_method`: `{transfer, mpesa, emola, cash, other, cheque}`

---

## 🚀 Edge Functions (37)
As principais funções incluem:
- `chat`: Interface de chat com IA.
- `invite-user`: Gestão de convites para a organização.
- `generate-studio-flyer`: Motor de geração de imagens/flyers.
- `social-publish`: Publicação em redes sociais.
- `lemonsqueezy-webhook`: Integração de pagamentos.
- `send-otp` / `verify-otp`: Autenticação via Email.

---

## 📈 Histórico de Migrações
O esquema evoluiu recentemente com foco em:
- **Março 2026:** Refinamento de RLS para Multi-tenant, adição de privilégios granulares em `profiles` e `organization_members`.
- **Studio Module:** Adição de configurações e legendas para flyers.
- **IA:** Adição de `completed` para sugestões de estudo e integração de conversas.

---

> [!NOTE]  
> Este mapeamento foi gerado automaticamente via MCP Supabase em 19/03/2026.
