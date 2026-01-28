
# Plano de Integração: Studio Creator no Qualify

## Visão Geral

O **Studio Creator** (também chamado "FlyerAI") é uma aplicação para geração de flyers/materiais gráficos usando IA (Gemini). Será integrado como um novo módulo dentro do Qualify, acessível em `/app/studio`.

---

## Análise do Studio Creator

### Funcionalidades Identificadas

1. **Gestão de Clientes de Design** - Clientes com branding (cores, logos, fontes, instruções AI)
2. **Geração de Flyers com AI** - Usando Gemini API para criar imagens
3. **Sistema de Aprendizagem AI** - Memória de preferências por cliente
4. **Avaliação de Flyers** - Sistema de rating 1-5 estrelas
5. **Upload de Imagens de Referência** - Logos e imagens de inspiração
6. **Múltiplos Modos de Geração** - Original, Cópia, Inspiração, Template

### Estrutura de Base de Dados (Studio Creator)

```text
+---------------------+       +---------------------+
|      clients        |       |   generated_flyers  |
+---------------------+       +---------------------+
| id (uuid)           |<----->| id (uuid)           |
| user_id             |       | client_id           |
| name                |       | user_id             |
| description         |       | prompt              |
| niche               |       | image_url           |
| primary_color       |       | size                |
| secondary_color     |       | style               |
| font_family         |       | niche               |
| ai_instructions     |       | created_at          |
| ai_restrictions     |       +---------------------+
| logo_images[]       |              |
| reference_images[]  |              v
| template_image      |       +---------------------+
| created_at          |       |   flyer_ratings     |
+---------------------+       +---------------------+
        |                     | id (uuid)           |
        v                     | flyer_id            |
+---------------------+       | user_id             |
| ai_learning_history |       | rating (1-5)        |
+---------------------+       | feedback            |
| id (uuid)           |       | created_at          |
| client_id           |       +---------------------+
| user_id             |
| learning_type       |
| content             |
| context             |
| created_at          |
+---------------------+
```

### Componentes Customizados

- **ColorPickerInput** - Seletor de cores com preview
- **ImageUploader** - Upload múltiplo de imagens para Supabase Storage
- **StarRating** - Componente de avaliação 5 estrelas
- **ImagePreviewModal** - Modal para visualizar imagens em tamanho grande

### Edge Function

- **generate-flyer** - Função complexa (~960 linhas) que:
  - Integra com Gemini API (Flash e Pro)
  - Suporta múltiplos modos de geração
  - Processa imagens de referência
  - Gera prompts otimizados para flyers brasileiros

---

## Estratégia de Integração

### Abordagem: Módulo Isolado com Multi-Tenancy

O Studio será integrado como módulo dentro do Qualify, mas os dados serão isolados por **organização** (não por usuário individual).

### Estrutura de Rotas Proposta

```text
/app/studio                    -> Dashboard principal (lista de projetos/clientes de design)
/app/studio/new               -> Criar novo projeto de design
/app/studio/:projectId        -> Editor de geração de flyers
/app/studio/:projectId/edit   -> Editar configurações do projeto
```

---

## Fase 1: Preparação da Base de Dados

### Novas Tabelas (com multi-tenancy)

```sql
-- Projetos de design (equivalente a "clients" do Studio Creator)
CREATE TABLE studio_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    niche TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    font_family TEXT DEFAULT 'Inter',
    ai_instructions TEXT,
    ai_restrictions TEXT,
    logo_images TEXT[],
    reference_images TEXT[],
    template_image TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Flyers gerados
CREATE TABLE studio_flyers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    size TEXT DEFAULT '1080x1080',
    style TEXT DEFAULT 'vivid',
    niche TEXT,
    model TEXT DEFAULT 'gemini-flash',
    generation_mode TEXT DEFAULT 'original',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Avaliações de flyers
CREATE TABLE studio_flyer_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flyer_id UUID NOT NULL REFERENCES studio_flyers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(flyer_id, user_id)
);

-- Histórico de aprendizagem AI
CREATE TABLE studio_ai_learnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES studio_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    learning_type TEXT NOT NULL CHECK (learning_type IN ('preference', 'correction', 'style', 'feedback')),
    content TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Políticas RLS

```sql
-- studio_projects
ALTER TABLE studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization projects"
    ON studio_projects FOR SELECT
    USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create organization projects"
    ON studio_projects FOR INSERT
    WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update organization projects"
    ON studio_projects FOR UPDATE
    USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete organization projects"
    ON studio_projects FOR DELETE
    USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- (Políticas similares para as outras tabelas)
```

### Storage Bucket

```sql
-- Criar bucket para assets do studio
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-assets', 'studio-assets', true);

-- Políticas de acesso
CREATE POLICY "Users can upload studio assets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'studio-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view studio assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'studio-assets');
```

---

## Fase 2: Edge Function

### Criar generate-studio-flyer

Adaptar a edge function existente para:
- Usar os nomes das novas tabelas
- Incluir organization_id nos inserts
- Manter toda a lógica de geração Gemini

**Secrets necessários:**
- `GEMINI_API_KEY` - Chave da API Gemini (precisa ser adicionada)

---

## Fase 3: Componentes React

### Estrutura de Ficheiros

```text
src/
├── components/
│   └── studio/
│       ├── ColorPickerInput.tsx      (copiar)
│       ├── ImageUploader.tsx         (adaptar bucket)
│       ├── StarRating.tsx            (copiar)
│       ├── ImagePreviewModal.tsx     (copiar)
│       ├── ProjectCard.tsx           (novo)
│       ├── FlyerGallery.tsx          (novo)
│       ├── GenerationPanel.tsx       (novo - extrair do Dashboard)
│       ├── ProjectForm.tsx           (novo)
│       └── AIMemoryPanel.tsx         (novo)
├── pages/
│   └── studio/
│       ├── StudioDashboard.tsx       (lista de projetos)
│       ├── StudioEditor.tsx          (gerador de flyers)
│       └── NewStudioProject.tsx      (criar projeto)
└── hooks/
    └── useStudioProject.ts           (hook para operações CRUD)
```

### Componentes a Copiar (com ajustes)

1. **ColorPickerInput** - Copiar diretamente
2. **StarRating** - Copiar diretamente  
3. **ImageUploader** - Adaptar para usar bucket `studio-assets`
4. **ImagePreviewModal** - Copiar diretamente

### Componentes a Criar

1. **StudioDashboard** - Grid de projetos com cards
2. **StudioEditor** - Interface de geração (refatorar Dashboard original)
3. **ProjectForm** - Formulário de criação/edição de projeto

---

## Fase 4: Rotas e Navegação

### Adicionar ao App.tsx

```tsx
// Importar páginas
import StudioDashboard from "./pages/studio/StudioDashboard";
import StudioEditor from "./pages/studio/StudioEditor";
import NewStudioProject from "./pages/studio/NewStudioProject";

// Adicionar rotas dentro de /app
<Route path="studio" element={<StudioDashboard />} />
<Route path="studio/new" element={<NewStudioProject />} />
<Route path="studio/:projectId" element={<StudioEditor />} />
<Route path="studio/:projectId/edit" element={<NewStudioProject />} />
```

### Adicionar ao Sidebar

```tsx
// Em Sidebar.tsx, adicionar item de menu
{
  icon: Sparkles,
  label: "Studio AI",
  href: "/app/studio",
}
```

---

## Fase 5: Limites por Plano

### Adicionar à tabela plan_limits

```sql
ALTER TABLE plan_limits ADD COLUMN max_studio_generations INTEGER DEFAULT NULL;

-- Definir limites
UPDATE plan_limits SET max_studio_generations = 10 WHERE plan_type = 'free';
UPDATE plan_limits SET max_studio_generations = 50 WHERE plan_type = 'bussola';
UPDATE plan_limits SET max_studio_generations = 200 WHERE plan_type = 'arco';
UPDATE plan_limits SET max_studio_generations = NULL WHERE plan_type = 'catapulta'; -- Ilimitado
```

### Tracking de Uso

Usar a tabela `usage_tracking` existente com `feature_type = 'studio_generations'`.

---

## Resumo de Ficheiros

### Novos Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `src/pages/studio/StudioDashboard.tsx` | Dashboard com lista de projetos |
| `src/pages/studio/StudioEditor.tsx` | Interface principal de geração |
| `src/pages/studio/NewStudioProject.tsx` | Formulário de novo projeto |
| `src/components/studio/ColorPickerInput.tsx` | Seletor de cores |
| `src/components/studio/ImageUploader.tsx` | Upload de imagens |
| `src/components/studio/StarRating.tsx` | Avaliação 5 estrelas |
| `src/components/studio/ImagePreviewModal.tsx` | Modal de preview |
| `src/components/studio/ProjectCard.tsx` | Card de projeto |
| `src/components/studio/FlyerGallery.tsx` | Galeria de flyers gerados |
| `src/components/studio/GenerationPanel.tsx` | Painel de geração |
| `src/components/studio/AIMemoryPanel.tsx` | Gestão de memória AI |
| `src/hooks/useStudioProject.ts` | Hook CRUD para projetos |
| `supabase/functions/generate-studio-flyer/index.ts` | Edge function |

### Ficheiros a Modificar

| Ficheiro | Modificação |
|----------|-------------|
| `src/App.tsx` | Adicionar rotas do studio |
| `src/components/layout/Sidebar.tsx` | Adicionar menu Studio AI |
| `src/components/layout/MobileNav.tsx` | Adicionar item móvel |

---

## Considerações Importantes

### Integração com Clientes Existentes

Uma opção futura seria permitir associar um `studio_project` a um `client` existente do CRM, para reutilizar dados de branding. Isso não está incluído neste plano inicial.

### API Key do Gemini

Será necessário adicionar o secret `GEMINI_API_KEY` nas configurações do Supabase para que a edge function funcione.

### Custos da API

A geração de imagens com Gemini tem custos. Considerar:
- Mostrar contador de gerações restantes
- Alertar quando próximo do limite
- Bloquear gerações quando limite atingido

---

## Resultado Esperado

Após implementação, os usuários do Qualify poderão:

1. Aceder ao **Studio AI** através do menu lateral
2. Criar **projetos de design** com configurações de marca
3. Gerar **flyers profissionais** usando IA (Gemini)
4. Avaliar flyers e a IA aprender preferências
5. Fazer download dos flyers gerados
6. Ter limites de geração de acordo com o plano de subscrição
