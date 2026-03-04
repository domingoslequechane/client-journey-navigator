# Correções do Social Media — Contagem e Indicadores

## Problema Atual

1. **Contagem de "Contas Conectadas" (`usePlanLimits`)**: A contagem atual (linha 197) usa `uniqueSocialClientsCount` — conta o número de **clientes únicos** com pelo menos 1 conta social conectada. Isso está correto para o conceito de "marcas ativas". O indicador no header mostra `X / Y` onde X = clientes com contas e Y = limite do plano.
2. **Indicador verde/cinza no `ClientFilterSelect**`: Já existe e funciona corretamente — busca `social_accounts` com `is_connected = true` e marca os `client_id`s no Set. O bullet verde aparece para clientes com pelo menos 1 conta conectada.
3. **Problema principal**: Quando uma conta é conectada via OAuth + sync, a query `['clients-with-social-status']` precisa ser invalidada para que o bullet atualize. Isso já está no código do `syncAccounts.onSuccess`, mas a query key inclui `user?.id` como segundo elemento, e a invalidação usa apenas `{ queryKey: ['clients-with-social-status'] }` — isso deve funcionar com partial matching do React Query.

## O que precisa ser verificado/corrigido

### Task 1: Garantir que a invalidação funciona após conexão

- No `useSocialAccounts.ts`, o `connectPlatform.onSuccess` já invalida `['clients-with-social-status']` após o sync. Isto parece correto.
- O `syncAccounts.onSuccess` também invalida. Parece correto.

### Task 2: Verificar se o card de conta conectada no Dashboard atualiza

- O `SocialDashboard` usa `useSocialAccounts(clientId)` que tem queryKey `['social-accounts', user?.id, clientId]`.
- Quando `syncAccounts` é chamado, ele invalida `['social-accounts']` no `onSuccess`. Isto atinge todas as queries com esse prefixo — correto.

### Task 3: Possível problema — `useSocialPosts` chamada sem clientId

Na `SocialMedia.tsx` linha 52, `useSocialPosts()` é chamado SEM parâmetros, mas o `SocialDashboard` na linha 24 chama `useSocialPosts({ clientId })`. Preciso verificar se `useSocialPosts` aceita esses parâmetros corretamente.

Vou verificar o `useSocialPosts` hook para confirmar.

Após análise, o fluxo parece estar logicamente correto. Os problemas que podem impedir o funcionamento são:

1. **Edge Function `social-sync-accounts` pode estar a falhar silenciosamente** — preciso verificar os logs para confirmar que está a retornar contas corretamente.
2. **A Edge Function `social-connect` pode não estar a criar o perfil Late.dev corretamente** — preciso verificar.

## Plano de Implementação

### 1. Verificar e corrigir Edge Functions (`social-connect` e `social-sync-accounts`)

- Ler as Edge Functions para garantir que estão a funcionar corretamente com o novo CORS
- Verificar se o `social-sync-accounts` está a criar registros em `social_accounts` com `is_connected = true`

### 2. Forçar refetch no `ClientFilterSelect` após mudanças

- A query `['clients-with-social-status']` precisa ser invalidada após qualquer mudança em contas sociais. Isto já está implementado nos mutations. Confirmar que funciona.

### 3. Adicionar `staleTime: 0` na query do `ClientFilterSelect`

- Garantir que a query não fica em cache quando o utilizador muda de aba ou volta ao dashboard.

### 4. Verificar se os logs das Edge Functions mostram erros

- Testar chamando as Edge Functions diretamente para verificar se respondem corretamente.

Perbi tambem que uma conta esta activa no late.dev, mas não é apresentada a conecção na aplicação.  
  
Vou primeiro verificar as Edge Functions e testar antes de propor mudanças concretas no código.