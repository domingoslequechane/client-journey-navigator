

# Definir Portugues como Idioma Padrao

Alteracao simples no ficheiro `src/i18n/index.ts`: garantir que o idioma padrao (fallback) e a ordem de deteccao priorizem `pt-BR`.

## Mudancas

**`src/i18n/index.ts`** — Na configuracao do i18next:
- Manter `fallbackLng: 'pt-BR'` (ja esta correto)
- Alterar a ordem de `detection.order` para priorizar `localStorage` mas definir `lng: 'pt-BR'` explicitamente como idioma inicial, removendo o `navigator` da deteccao para que novos utilizadores vejam sempre portugues
- Adicionar `lng: 'pt-BR'` na configuracao do `init()` para forcar o idioma padrao independentemente do browser

Isto garante que:
1. Novos utilizadores veem a app em portugues
2. Utilizadores que ja escolheram outro idioma mantem a sua escolha (via localStorage)

