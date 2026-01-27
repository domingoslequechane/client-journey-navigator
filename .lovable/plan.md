
# Plano: Implementar Envio de Emails para Formulário de Contato (Link23)

## Resumo do Problema
O formulário de contato nas páginas públicas do Link23 não envia emails - apenas simula o envio. Precisamos implementar:
1. Envio de email para o destinatário (dono da página)
2. Email de confirmação para quem enviou a mensagem

---

## Arquitetura da Solução

```text
+-------------------+     +------------------------+     +------------------+
| Página Pública    | --> | Edge Function          | --> | Resend API       |
| (Formulário)      |     | send-contact-form      |     | (Email Delivery) |
+-------------------+     +------------------------+     +------------------+
                                    |
                                    v
                          +------------------+
                          | 2 Emails:        |
                          | 1. Destinatário  |
                          | 2. Confirmação   |
                          +------------------+
```

---

## Etapa 1: Criar Edge Function para Envio de Emails

**Arquivo:** `supabase/functions/send-contact-form/index.ts`

Esta função irá:
- Receber dados do formulário (nome, email, telefone, mensagem)
- Receber email do destinatário e nome da página
- Enviar email para o destinatário usando Resend
- Enviar email de confirmação para o remetente

**Dados esperados:**
```typescript
interface ContactFormRequest {
  recipientEmail: string;     // Email do dono da página
  pageName: string;           // Nome da página Link23
  senderName?: string;        // Nome de quem enviou
  senderEmail: string;        // Email de quem enviou
  senderPhone?: string;       // Telefone (opcional)
  message?: string;           // Mensagem
}
```

**Emails enviados:**
1. **Para o destinatário:** Email formatado com todos os dados do formulário
2. **Para o remetente:** Email de confirmação agradecendo o contato

---

## Etapa 2: Atualizar Componente de Formulário Público

**Arquivo:** `src/components/linktree/blocks/ContactFormBlockPreview.tsx`

Modificações:
- Adicionar nova prop `linkPageName` para identificar a página
- Substituir a simulação por chamada real à edge function
- Tratar erros de envio adequadamente
- Manter feedback visual de sucesso/erro

**Fluxo:**
1. Usuário preenche formulário
2. Ao clicar "Enviar", chama a edge function
3. Se sucesso: mostra mensagem de sucesso configurada
4. Se erro: mostra mensagem de erro

---

## Etapa 3: Atualizar Página Pública

**Arquivo:** `src/pages/LinkTreePublic.tsx`

Passar props adicionais para o `ContactFormBlockPreview`:
- Nome da página (`linkPage.name`)
- Email do destinatário (do `formConfig.recipientEmail`)

---

## Etapa 4: Configurar Edge Function

**Arquivo:** `supabase/config.toml`

Adicionar configuração:
```toml
[functions.send-contact-form]
verify_jwt = false
```

A função não requer autenticação pois é chamada de páginas públicas.

---

## Detalhes Técnicos

### Template do Email para Destinatário
- Título: "Nova mensagem de contato - {Nome da Página}"
- Corpo: Dados formatados do remetente
- Cores e estilo consistentes com a marca Qualify

### Template do Email de Confirmação
- Título: "Confirmação - Sua mensagem foi enviada"
- Corpo: Agradecimento + resumo da mensagem enviada
- Inclui que entrará em contato em breve

### Validações
- Email do remetente é obrigatório
- Email do destinatário deve estar configurado no bloco
- Se não houver email de destinatário configurado, exibir erro

### Segurança
- Rate limiting básico via Resend
- Validação de email no backend
- CORS configurado para todas as origens

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/send-contact-form/index.ts` | **Criar** - Nova edge function |
| `supabase/config.toml` | **Editar** - Adicionar config da função |
| `src/components/linktree/blocks/ContactFormBlockPreview.tsx` | **Editar** - Integrar com edge function |
| `src/pages/LinkTreePublic.tsx` | **Editar** - Passar props necessárias |

---

## Resultado Esperado

Após implementação:
1. Usuário preenche formulário na página pública
2. Ao enviar, o dono da página recebe email com os dados
3. Quem enviou recebe email de confirmação
4. Interface mostra feedback de sucesso/erro apropriado
