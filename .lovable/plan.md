

# Auditoria de Produção - Relatório Completo

Após análise detalhada do código, segurança, Edge Functions e configurações, identifiquei os seguintes problemas organizados por criticidade.

---

## CRÍTICO - Segurança

### 1. `delete-user` com `verify_jwt = false`
A Edge Function que elimina utilizadores do sistema está **sem verificação JWT**. Qualquer pessoa pode chamar esta função sem autenticação. Embora a função faça verificação manual do token, desativar o JWT no gateway remove a primeira camada de proteção.

**Correção:** Alterar `verify_jwt = true` no `config.toml`.

### 2. Edge Functions de Social Media sem JWT
As seguintes funções estão com `verify_jwt = false` e manipulam dados sensíveis:
- `social-connect`, `social-sync-accounts`, `social-publish`, `social-fetch-messages`, `social-reply-message`
- `generate-social-caption`, `suggest-best-times`
- `generate-studio-flyer`

**Correção:** Ativar JWT para todas as funções que requerem autenticação. Manter `verify_jwt = false` apenas para: `send-otp`, `verify-otp`, `lemonsqueezy-webhook`, `check-trial-expiry`, `send-partner-inquiry`, `send-contact-form`, `generate-landing-image`.

### 3. CORS permissivo (`Access-Control-Allow-Origin: *`)
Todas as 30 Edge Functions usam `*` como origin. Em produção, deve ser restrito ao domínio `https://qualify.onixagence.com`.

**Correção:** Criar uma constante com os domínios permitidos e validar o `Origin` header.

### 4. `dangerouslySetInnerHTML` sem sanitização na LandingPage
O ficheiro `LandingPage.tsx` usa `dangerouslySetInnerHTML` com conteúdo i18n sem sanitizar (linha 758). O `MessageItem.tsx` já usa DOMPurify corretamente, mas a LandingPage não.

**Correção:** Aplicar `DOMPurify.sanitize()` ao conteúdo da FAQ.

### 5. Dados de negócio expostos publicamente (scan de segurança)
- **`link_pages`**: Páginas publicadas expõem `client_id` e `organization_id` — informação interna desnecessária para visualização pública.
- **`social_posts`**: A política "Anyone can view posts by approval token" expõe conteúdo de posts, estratégias e notas internas.
- **`link_blocks`**: Blocos de páginas publicadas expõem configurações internas completas.

**Correção:** Restringir campos visíveis publicamente via funções `SECURITY DEFINER` que retornam apenas dados necessários para renderização.

---

## ALTO - Funcionalidade e Robustez

### 6. `delete-user` verifica cargo na tabela `profiles` em vez de `user_roles`
A função verifica `profile.role === "admin"` mas o sistema RBAC usa a tabela `user_roles` com `has_role()`. Além disso, apenas o `proprietor` deveria ter esta capacidade, não qualquer `admin`.

**Correção:** Verificar `has_role(userId, 'proprietor')` via query à tabela `user_roles`.

### 7. `generate-studio-flyer` usa `@ts-nocheck`
Um ficheiro com 1698 linhas suprime todos os erros TypeScript. Isto pode esconder bugs graves.

**Correção:** Remover `@ts-nocheck` e resolver os erros de tipo.

### 8. Leaked Password Protection desativada
O Supabase Auth não está a verificar passwords em listas de passwords comprometidas.

**Correção:** Ativar em Supabase Dashboard > Authentication > Settings > Password Protection.

---

## MÉDIO - Melhorias para Produção

### 9. `plan_limits` acessível sem autenticação
Embora a memória diga que foi corrigido para `authenticated`, o scan ainda detecta acesso público. Verificar se a política foi efetivamente aplicada.

### 10. Sem rate limiting nas Edge Functions públicas
Funções como `send-otp`, `send-contact-form`, `send-partner-inquiry` não têm proteção contra abuso.

**Correção:** Implementar rate limiting baseado em IP ou fingerprint.

---

## Plano de Implementação

1. **Atualizar `config.toml`** — Ativar JWT em todas as funções que requerem autenticação (social-*, generate-studio-flyer, delete-user, generate-social-caption, suggest-best-times)
2. **Restringir CORS** — Substituir `*` pelo domínio de produção em todas as Edge Functions
3. **Corrigir `delete-user`** — Usar `user_roles` e restringir ao `proprietor`
4. **Sanitizar FAQ** — Adicionar DOMPurify na LandingPage
5. **Corrigir políticas RLS** — Limitar campos expostos em `link_pages` e `social_posts` públicos
6. **Ativar Leaked Password Protection** — Configuração manual no dashboard Supabase
7. **Remover `@ts-nocheck`** do studio-flyer (fase posterior)

Estas são as correções prioritárias para ir para produção com segurança. Posso implementar todas numa sequência?

