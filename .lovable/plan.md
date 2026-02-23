

# Plano: Redesign do Social Media como SaaS Profissional

## Resumo

Reestruturar a pagina de Social Media para que o filtro de cliente e a sincronizacao sejam globais (no header), que o botao de criar post dependa de um cliente selecionado, e aplicar regras de negocio (sem editar/deletar posts publicados, sem agendar em datas passadas, clone, impulsionar).

---

## Mudancas Detalhadas

### 1. Header Global - `SocialMedia.tsx`

- Mover `ClientFilterSelect` para o header, ao lado do botao "Agendar Post"
- Mover o botao "Sincronizar" (de `SocialDashboard`) para o header tambem
- Botao "Agendar Post" fica **desabilitado** enquanto `selectedClient === 'all'` (sem cliente selecionado)
- Renomear "Agendar Post" para "Novo Post" (evita confusao com "criar" do Studio AI)
- O `selectedClient` vira estado global da pagina, passado como prop para todos os tabs

### 2. Filtro por Cliente em Todos os Tabs

- **Dashboard**: ja recebe `selectedClient` - manter
- **Calendario**: filtrar `posts` por `client_id === selectedClient` antes de passar ao componente
- **Posts**: filtrar por `client_id === selectedClient`, **remover** o `ClientFilterSelect` duplicado desta aba
- **Relatorios**: filtrar posts pelo cliente selecionado

### 3. Regras de Negocio no PostCard - `PostCard.tsx`

- **Editar**: so mostrar botao se `post.status !== 'published'`
- **Deletar**: so mostrar botao se `post.status !== 'published'`
- **Clonar**: novo botao (icone `Copy`) que chama `onClone(post)` - cria um novo post com os mesmos dados mas status `draft`
- **Impulsionar**: novo botao (icone `Rocket` ou `TrendingUp`) que chama `onBoost(post)` - placeholder para futura integracao de ads

### 4. Validacao de Datas no PostModal - `PostModal.tsx`

- No input `type="date"`, definir `min={format(new Date(), 'yyyy-MM-dd')}` para impedir selecao de datas passadas
- Na funcao `handleSchedule`, validar que nenhum slot tem data/hora no passado antes de salvar
- Mostrar erro via `toast.error` se tentar agendar no passado

### 5. Calendario - `SocialCalendar.tsx`

- Receber prop `selectedClient` e filtrar posts internamente
- No botao "Novo post neste dia" do Sheet, desabilitar se a data ja passou (`isBefore(day, startOfToday())`)

### 6. Clone de Post - `SocialMedia.tsx`

- Adicionar handler `handleClonePost` que chama `createPost.mutate` com os dados do post original, status `draft`, sem `id`
- Passar como prop `onClone` para `PostCard`

### 7. Sincronizar no Header

- Importar `useSocialAccounts` no `SocialMedia.tsx` para ter acesso ao `syncAccounts`
- Renderizar o botao `RefreshCw` + "Sincronizar" ao lado do `ClientFilterSelect` no header
- Remover botao duplicado do `SocialDashboard.tsx`

### 8. UX e Layout Profissional

- Header com layout flex: `[ClientFilterSelect] [Sincronizar] [spacer] [Novo Post]`
- Mensagem de orientacao quando nenhum cliente esta selecionado (em qualquer tab)
- Tabs ficam abaixo do header com o mesmo estilo atual

---

## Secao Tecnica

### Arquivos a Editar

| Arquivo | Alteracoes |
|---|---|
| `src/pages/SocialMedia.tsx` | Header global com ClientFilter + Sync + botao condicional; filtro global; handler clone; passar selectedClient a todos os tabs |
| `src/components/social-media/PostCard.tsx` | Condicionar Edit/Delete a status !== published; adicionar Clone e Impulsionar |
| `src/components/social-media/PostModal.tsx` | `min` date no input; validacao de data passada no handleSchedule |
| `src/components/social-media/SocialCalendar.tsx` | Receber e aplicar filtro de selectedClient; desabilitar criar post em datas passadas |
| `src/components/social-media/SocialDashboard.tsx` | Remover botao Sincronizar e ClientFilterSelect do componente (movidos para o header) |
| `src/components/social-media/MetricsDashboard.tsx` | Receber e filtrar por selectedClient |

### Novos Props/Interfaces

- `PostCard`: adicionar `onClone?: (post) => void`, `onBoost?: (post) => void`
- `SocialCalendar`: adicionar `selectedClient?: string`
- `MetricsDashboard`: adicionar `selectedClient?: string`
- `SocialDashboard`: receber `selectedClient` como prop em vez de estado interno

