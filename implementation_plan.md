# Plano de Implementação: Funcionalidade Carousel (Studio Criativo)

Este plano detalha a criação da nova funcionalidade **Carousel** no *Studio Criativo*, replicando a experiência de equipa de especialistas em IA (Squad) já existente no *Flyer*, mas adaptada para gerar *N* imagens formando uma publicação em carrossel.

## User Review Required

> [!IMPORTANT]
> A funcionalidade atual do Flyer utiliza uma **Supabase Edge Function** (`flyer-squad-orchestrator`) que comunica com a API Gemini para orquestrar os agentes e gerar **1 imagem**. 
> Para gerar **N imagens** (Carousel), a API de imagem (Imagen 3 / Fal.ai / etc.) terá de ser invocada várias vezes (uma por slide) pelo "Designer Agent", o que aumentará o custo e tempo de geração de cada pedido. 
> Tens preferência sobre qual modelo gerar as N imagens ou prefere estender o código atualmente usado no Edge Function dos Flyers?

> [!NOTE]
> O carrossel terá um slider/seletor onde o utilizador escolhe a **quantidade de slides** (ex: 3 a 10 slides)?

---

## Proposed Changes

### 1. Base de Dados (Supabase Migration)

#### [NEW] Migration: `create_studio_carousels_table.sql`
- Criação da tabela `studio_carousels` baseada em `studio_flyers`.
- Alteração principal: substituição de `image_url` (text) por `image_urls` (text[]) para armazenar a lista sequencial de imagens geradas.
- Manter o link direto com `project_id` (tabela `studio_projects`).
- Adicionar RLS policies padrão (leitura/escrita apemas pelo `created_by` ou org admin).

---

### 2. Definições e Tipos

#### [MODIFY] `src/types/studio.ts`
- Adicionar a nova ferramenta na listagem `STUDIO_TOOLS` com o id `'carousel'`, categoria `'squad'`, etc.
- Adicionar a interface `StudioCarousel` equivalente à tabela na database (`image_urls: string[]`).

---

### 3. Componentes da Interface (UI) no Studio

#### [MODIFY] `src/pages/studio/StudioTool.tsx`
- Adicionar o bloco condicional para suportar `tool.id === 'carousel'`.
- Chamar novos componentes como `CarouselProjectHub`, `CarouselProjectOnboarding` e `CarouselSquadView`.

#### [NEW] `src/components/studio/CarouselProjectHub.tsx`
- Réplica ajustada estruturalmente do `FlyerProjectHub`, mas focada em projetos de Carrosséis.
- Irá consumir a mesma tabela unificadora `studio_projects`.

#### [NEW] `src/components/studio/CarouselProjectOnboarding.tsx`
- Réplica do onboarding atual do Flyer, capturando a identidade inicial. 

#### [NEW] `src/components/studio/CarouselSquadView.tsx`
- O coração da nova configuração. Terá o painel lateral de configurações padrão, acrescido de uma métrica para estabelecer o **Número de Slides (N)**.
- Quando o squad terminar (designer agent), a UI implementará um slider/galeria embutido para fazer *swipe* entre o _Slide 1, 2, ..., N_ antes de fazer o download ou aprovação.
- Fará o `download` num arquivo .ZIP contendo todas as imagens numeradas.

---

### 4. Lógica de IA e Orquestrador (Edge Function)

#### [NEW] `supabase/functions/carousel-squad-orchestrator/index.ts`
- Criação de uma Edge Function Deno adaptada ao carrossel.
- O agente `Copywriter` passará a retornar um array de *copies*, dividido logicamente pelos N slides (ex: Gancho inicial, Desenvolvimento 1, Desenvolvimento 2, Call To Action).
- O agente `Designer` passará a iterar gerar e retornar múltiplos `imageUrls` que correspondam sequencialmente a cada slide.

---

## Open Questions

1. **Gestão de Projetos:** Como o Flyer já usa a tabela `studio_projects`, sentes que o Carousel deve criar novos projetos completamente distintos, ou o utilizador pode abrir os seus projetos de "Flyer" pré-existentes na aba de "Carousel" (reaproveitando as cores e logos do cliente)?
2. **Exportação:** Para baixar o resultado final (várias imagens), usar um ZIP com todos os PNGs é algo razoável?

## Verification Plan

### Manual Verification
1. Entrar no **Studio Criativo** e clicar em "Carousel".
2. Testar o fluxo de "Novo Projeto de Marca".
3. Solicitar um carrossel definindo N=4 slides sobre um tópico, validando no terminal o progresso multi-agente e orquestração.
4. Validar se o render final da UI é capaz de mostrar de forma organizada (swipe) as 4 imagens retornadas.
5. Garantir que a ação de 'Guardar' e de apagar registros do histórico da aba Carousel funcione de forma estável.
