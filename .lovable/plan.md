

# Correções do Módulo Social Media

## Problemas Identificados

### 1. Erro de Build (CRÍTICO)
Na `SocialDashboard.tsx` linha 169, o tag `</Card>` foi substituído por `</div>` no último diff, quebrando o JSX. O 4º card de stats ("Aguardando aprovação") não fecha corretamente.

### 2. Sincronização não marca conta como conectada
A sincronização após fechar o popup OAuth depende do `syncAccounts` que é chamado no `onSuccess` do `connectPlatform`. O fluxo está correto em lógica, mas há dois problemas:

- **Query invalidation insuficiente**: Quando `syncAccounts` retorna com sucesso e `synced > 0`, ele invalida `['social-accounts']` e `['clients-with-social-status']` corretamente. Porém, o check do popup pode falhar silenciosamente se o sync der erro (o `catch` está vazio).

- **Potencial problema de timing**: O popup pode fechar antes da Late API ter registrado a conta. Não há retry nem delay.

### 3. `useSocialAccounts` não invalida no `connectPlatform.onSuccess`
O `connectPlatform` mutation não invalida queries diretamente — depende inteiramente do `syncAccounts` que é chamado no `onSuccess` callback. Se o sync falhar silenciosamente, a UI nunca atualiza.

---

## Plano de Implementação

### Task 1: Corrigir erro de build no SocialDashboard
- Linha 169: trocar `</div>` por `</Card>`

### Task 2: Melhorar robustez da sincronização pós-conexão
No `useSocialAccounts.ts`, no `connectPlatform.onSuccess`:
- Adicionar um delay de 2 segundos antes de chamar `syncAccounts` (dar tempo à Late API para registrar a conta)
- Adicionar retry: se o sync retornar `synced: 0`, tentar novamente após 3 segundos (máximo 1 retry)
- Remover o `catch` vazio e adicionar log + toast de erro
- Após o sync, forçar invalidação de `['social-accounts']` e `['clients-with-social-status']` independentemente do resultado

### Task 3: Verificar e redeployar Edge Functions
- Redeployar `social-connect` e `social-sync-accounts` para garantir que estão com as últimas alterações de CORS

