

# Tornar Social Media e Editor de Posts Responsivos + Corrigir Build Errors

## Build Errors a corrigir primeiro

### 1. Duplicate `privileges` em `types.ts` (linhas 1253-1284)
Remover as linhas duplicadas de `privileges` nas secoes Row, Insert e Update de `organization_members`.

### 2. Outros build errors pre-existentes
Os restantes erros (`BeautifyToolView.tsx`, `ImagePreviewModal.tsx`, `useStudioImages.ts`, `useStudioProjects.ts`, `RoleProtectedRoute.tsx`, `invite-user`, `Academia.tsx`) sao pre-existentes e nao relacionados com esta tarefa. Serao corrigidos apenas os que bloqueiam o build:
- `types.ts` duplicate privileges — corrigir
- `invite-user/index.ts` — adicionar optional chaining: `u.email?.toLowerCase()`

## Responsividade — SocialPostEditor.tsx

O editor de posts (pagina inteira) tem layout desktop fixo com sidebar de 264px + editor + preview de 450px. No mobile (< 1024px):

**Header (linhas 817-849)**:
- Esconder botoes "Cancelar", "Guardar Rascunho", "Atualizar Agendamento" no mobile
- Mostrar apenas o botao principal ("Publicar/Agendar") e um menu dropdown para as outras acoes
- Alternativa mais simples: empilhar botoes — mostrar apenas icones sem texto no mobile, usando `hidden lg:inline` nos labels

**Sidebar de paginas (linhas 853-910)**:
- Esconder no mobile (`hidden lg:flex`)
- Adicionar barra horizontal de thumbnails no topo do editor para mobile (`flex lg:hidden`)

**Preview lateral (linhas 1192-1267)**:
- Esconder no mobile (`hidden lg:flex`)
- Adicionar botao "Ver Preview" flutuante no mobile que abre o preview em fullscreen modal

**Editor central (linhas 912-1189)**:
- Ja usa classes responsivas (`sm:grid-cols-2`, etc.) — esta OK
- Ajustar padding de `p-6 md:p-10` para `p-4 md:p-10`

### Mudancas especificas:

| Zona | Desktop (lg+) | Mobile (<lg) |
|---|---|---|
| Header | Todos os botoes visiveis | Botao principal + dropdown |
| Sidebar paginas | Sidebar lateral 264px | Barra horizontal com scroll no topo |
| Editor | max-w-3xl centralizado | Full width, padding reduzido |
| Preview | Aside fixa 450px | Botao flutuante → Dialog fullscreen |

## Responsividade — PostModal.tsx

O modal ja tem `grid-cols-1 lg:grid-cols-[1fr,400px]` e o preview e `hidden lg:flex`. Esta razoavelmente responsivo. Melhorias:
- Footer de acoes (linhas 459-473): ja responsivo com `flex-col sm:flex-row`
- Nenhuma mudanca significativa necessaria

## Responsividade — SocialMedia.tsx (pagina principal)

Ja usa classes responsivas (`flex-col sm:flex-row`, `overflow-x-auto` nos tabs). Melhorias menores:
- PostCard no mobile: a secao de accoes (botoes de edicao/delete) deve usar layout horizontal em vez de coluna vertical no mobile

## Ficheiros a editar

1. **`src/integrations/supabase/types.ts`** — remover duplicatas `privileges`
2. **`supabase/functions/invite-user/index.ts`** — optional chaining no email
3. **`src/pages/SocialPostEditor.tsx`** — responsividade completa (header, sidebar, preview)
4. **`src/components/social-media/PostCard.tsx`** — ajuste menor de layout mobile

