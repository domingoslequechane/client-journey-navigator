

# Plano: Migrar QIA para Lovable AI Gateway (Gemini 2.5 Flash)

## Resumo

Trocar ambas as edge functions da QIA (chat e sugestoes) de **OpenAI API direta** (`gpt-4o-mini`) para o **Lovable AI Gateway** usando o modelo **`google/gemini-2.5-flash`**.

---

## O Que Muda

| Aspecto | Antes | Depois |
|---------|-------|--------|
| API | `api.openai.com` | `ai.gateway.lovable.dev` |
| Chave | `OPENAI_API_KEY` | `LOVABLE_API_KEY` (ja configurada) |
| Modelo | `gpt-4o-mini` | `google/gemini-2.5-flash` |
| Funcoes afetadas | 2 edge functions | 2 edge functions |

---

## Arquivos a Modificar

### 1. `supabase/functions/chat/index.ts`

Mudancas:
- Trocar a variavel de ambiente de `OPENAI_API_KEY` para `LOVABLE_API_KEY`
- Trocar o endpoint de `https://api.openai.com/v1/chat/completions` para `https://ai.gateway.lovable.dev/v1/chat/completions`
- Trocar o modelo de `gpt-4o-mini` para `google/gemini-2.5-flash`
- Atualizar o log de `"Calling OpenAI API with gpt-4o-mini"` para `"Calling Lovable AI Gateway with gemini-2.5-flash"`
- Atualizar mensagens de erro para referenciar "Lovable AI" em vez de "OpenAI"

### 2. `supabase/functions/generate-ai-suggestion/index.ts`

Mudancas:
- Trocar `OPENAI_API_KEY` para `LOVABLE_API_KEY`
- Trocar o endpoint de `https://api.openai.com/v1/chat/completions` para `https://ai.gateway.lovable.dev/v1/chat/completions`
- Trocar o modelo de `gpt-4o-mini` para `google/gemini-2.5-flash`
- Atualizar logs e mensagens de erro

---

## Detalhes Tecnicos

### Edge Function: `chat/index.ts`

Linhas afetadas (aproximadamente):
- **Linha 141**: `OPENAI_API_KEY` passa a `LOVABLE_API_KEY`
- **Linha 144**: Verificacao da chave atualizada
- **Linha 283**: Log atualizado
- **Linhas 285-301**: Endpoint, header de Authorization e modelo atualizados
- **Linhas 304-322**: Mensagens de erro referenciando "Lovable AI" em vez de "OpenAI"

```typescript
// ANTES
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  body: JSON.stringify({ model: "gpt-4o-mini", ... }),
});

// DEPOIS
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: "google/gemini-2.5-flash", ... }),
});
```

### Edge Function: `generate-ai-suggestion/index.ts`

Linhas afetadas:
- **Linha 6**: Variavel `openAIApiKey` renomeada para `lovableApiKey`
- **Linha 43-45**: Verificacao da chave atualizada
- **Linhas 112-128**: Endpoint, Authorization header e modelo atualizados
- **Linhas 131-134**: Mensagens de erro atualizadas

---

## Nenhuma Mudanca no Frontend

A pagina `AIAssistant.tsx` e o hook `useAISuggestion.ts` ja chamam as edge functions via `supabase.functions.invoke` ou `fetch` ao endpoint da edge function. Nenhuma alteracao e necessaria no lado do cliente.

---

## Vantagens

1. **Sem necessidade de chave OpenAI** - `LOVABLE_API_KEY` ja esta configurada automaticamente
2. **Custo-beneficio** - Gemini 2.5 Flash oferece bom equilibrio entre velocidade e qualidade
3. **Streaming mantido** - O Lovable AI Gateway suporta streaming SSE da mesma forma
4. **Compatibilidade** - API compativel com OpenAI, mesma estrutura de request/response

