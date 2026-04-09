// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Configuração de Modelos Gemini (Architecture: Agentic Workflow)
// ORCHESTRATOR/COPYWRITER/REVIEWER = gemini-3.1-pro-preview (texto, thinking, agentic)
// DESIGNER = Nano Banana 2 = gemini-3.1-flash-image-preview (geração nativa de imagem)
const MODELS = {
    ORCHESTRATOR: "gemini-3.1-pro-preview",
    COPYWRITER:   "gemini-3.1-pro-preview",
    DESIGNER:     "gemini-3.1-flash-image-preview",
    REVIEWER:     "gemini-3.1-pro-preview",
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const buffer = await resp.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
        return btoa(binary);
    } catch (e) {
        console.error("Error fetching image:", e);
        return null;
    }
}

async function fetchUrlContent(url: string): Promise<string> {
    try {
        console.log("[Fetcher] Buscando conteúdo de:", url);
        const resp = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        });
        if (!resp.ok) return "Não foi possível acessar o link (Status: " + resp.status + ")";
        
        const text = await resp.text();
        
        // Limpeza básica de HTML
        const cleaned = text
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
            
        return cleaned.substring(0, 15000); // Limite de 15k caracteres para segurança de tokens
    } catch (e) {
        console.error("[Fetcher] Erro:", e);
        return "Erro ao processar o link: " + e.message;
    }
}

async function callGemini(parts: any[], model: string, generateImage = false, targetRatio?: string) {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiKey}`;

    const body: any = {
        contents: [{ role: "user", parts }],
        generationConfig: {
            responseModalities: generateImage ? ["IMAGE", "TEXT"] : ["TEXT"],
        }
    };

    if (model.includes("pro-preview")) {
        body.generationConfig.thinkingConfig = {
            thinkingBudget: 8000
        };
    }

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const err = await resp.text();
        console.error("Gemini API error response:", err);
        throw new Error(`Gemini Error (${resp.status}): ${err.substring(0, 500)}`);
    }

    const rawText = await resp.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        console.warn("Gemini non-JSON response encountered. Simulating valid structure for text:", rawText.substring(0, 200));
        data = {
            candidates: [{
                content: { parts: [{ text: rawText }] },
                role: "model"
            }],
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 }
        };
    }
    
    if (!data.candidates || !data.candidates[0]) {
        console.error("Invalid Gemini response:", JSON.stringify(data).substring(0, 500));
        throw new Error("Resposta inválida da API: sem candidatos");
    }
    
    if (!data.candidates[0].content || !data.candidates[0].content.parts) {
        console.error("Invalid Gemini response structure:", JSON.stringify(data).substring(0, 500));
        throw new Error("Resposta inválida da API: estrutura unexpected");
    }

    return data;
}

function normalizeUsage(data: any) {
    const usage = data.usageMetadata || data.usage_metadata || {};
    return {
        promptTokenCount: usage.promptTokenCount || usage.prompt_token_count || usage.promptTokens || 0,
        candidatesTokenCount: usage.candidatesTokenCount || usage.candidates_token_count || usage.candidatesTokens || 0,
        totalTokenCount: usage.totalTokenCount || usage.total_token_count || ( (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0) ) || 0
    };
}

function extractJsonFromResponse(content: string, fallback: any = {}): any {
    const cleanedVariants = [
        content,
        content.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim(),
    ];

    for (const variant of cleanedVariants) {
        try {
            const parsed = JSON.parse(variant);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch { /* continue */ }

        const jsonMatch = variant.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            let candidate = jsonMatch[0];
            candidate = candidate
                .replace(/[\x00-\x1F\x7F]/g, ' ')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');

            try {
                const parsed = JSON.parse(candidate);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch {
                let repaired = candidate;
                let inString = false;
                let lastQuotePos = -1;
                for (let i = 0; i < repaired.length; i++) {
                    if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
                        inString = !inString;
                        lastQuotePos = i;
                    }
                }
                if (inString) repaired += '"';

                let braces = 0, brackets = 0;
                for (const char of repaired) {
                    if (char === '{') braces++;
                    if (char === '}') braces--;
                    if (char === '[') brackets++;
                    if (char === ']') brackets--;
                }
                while (brackets > 0) { repaired += ']'; brackets--; }
                while (braces > 0) { repaired += '}'; braces--; }

                try {
                    const parsed = JSON.parse(repaired);
                    if (parsed && typeof parsed === 'object') return parsed;
                } catch { /* continue */ }
            }
        }
    }

    console.warn('Could not parse AI response, returning fallback. Raw:', content.substring(0, 200));
    return fallback;
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const payload = await req.json();
        const { agent, productImage, productImages, referenceImage, approvedTemplateImage, briefing, allowImageManipulation, context = {}, organizationId } = payload;
        const numSlides = payload.numSlides === undefined ? 3 : payload.numSlides;

        if (!agent) throw new Error("Missing agent parameter");

        let processedBriefing = briefing;
        const projectLearnings = context.project?.projectLearnings ? `\n${context.project.projectLearnings}\n` : '';

        if (context.project?.scrapedContent) {
            console.log("[Orchestrator] Conteúdo previamente extraído (scrapedContent) recebido do frontend.");
            processedBriefing = `
🚨 LEI MÁXIMA DE CONTEÚDO 🚨
O usuário enviou um ARTIGO/LINK. O ÚNICO TEMA deste carrossel é RESUMIR de forma brilhante o conteúdo abaixo.
Não fale sobre os serviços da agência (isso fica para o call to action, se apropriado). Foque 100% no valor do artigo.

${context.project.scrapedContent}

---
DIRETRIZES EXTRAS DO USUÁRIO:
${briefing || 'Sem diretrizes extras. Apenas resuma o principal do texto.'}
            `.trim();
        } else if (briefing) {
            const urlMatch = briefing.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                console.log("[Orchestrator] URL detectada no briefing, buscando conteúdo...");
                const siteContent = await fetchUrlContent(urlMatch[0]);
                processedBriefing = `
🚨 LEI MÁXIMA DE CONTEÚDO 🚨
O usuário enviou um ARTIGO/LINK. O ÚNICO TEMA deste carrossel é RESUMIR de forma brilhante o conteúdo abaixo.
Não fale sobre os serviços da agência. Foque 100% no valor do artigo.

CONTEÚDO DO SITE (${urlMatch[0]}):
${siteContent}

---
DIRETRIZES EXTRAS DO USUÁRIO:
${briefing}
                `.trim();
            }
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        let result = {};

        const toBase64 = async (img: string) => img.startsWith('data:') ? img.split(',')[1] : await fetchImageAsBase64(img);
        const addImage = async (parts: any[], url: string, mime = "image/png", label?: string) => {
            if (!url) return;
            const b64 = await toBase64(url);
            if (b64) {
                const detectedMime = url.includes('.jpg') || url.includes('.jpeg') ? 'image/jpeg' : mime;
                if (label) parts.push({ text: `\n=== ${label} ===\n` });
                parts.push({ inlineData: { mimeType: detectedMime, data: b64 } });
            }
        };

        const primaryFont        = context.project?.primaryFont;
        const fontInstruction    = primaryFont 
            ? `Fonte OBRIGATÓRIA: "${primaryFont}" (Use apenas esta fonte do Google Fonts em todo o projeto).` 
            : `Fonte: Escolha uma tipografia profissional e premium que combine com o design de luxo para o nicho de ${context.project?.niche || 'negócios'}.`;
        const captionInstructions = context.project?.captionInstructions || "Tom profissional e engajador. Use emojis moderadamente.";
        const ratio              = context.project?.ratio              || "1:1";
        const dimensions         = context.project?.dimensions         || "1080x1080";

        let orientationNote = "Quadrado (1:1)";
        let orientationInstruction = "QUADRADO (1:1)";
        if (ratio === "9:16") {
            orientationNote = "VERTICAL Story/Reels (9:16) — canvas muito mais ALTO que largo";
            orientationInstruction = "VERTICAL (9:16)";
        } else if (ratio === "16:9") {
            orientationNote = "HORIZONTAL Banner (16:9) — canvas muito mais LARGO que alto";
            orientationInstruction = "HORIZONTAL (16:9)";
        } else if (ratio === "3:4" || ratio === "4:5") {
            orientationNote = "RETRATO (4:5) — canvas mais alto que largo";
            orientationInstruction = "RETRATO (4:5)";
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 1: ORCHESTRATOR
        // ──────────────────────────────────────────────────────────────
        if (agent === 'orchestrator') {
            const parts = [];
            if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO");
            if (referenceImage) await addImage(parts, referenceImage, "image/png", "IMAGEM DE REFERÊNCIA");
            if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");

            const allProductImages = productImages || (productImage ? [productImage] : []);
            for (let i = 0; i < allProductImages.length; i++) {
                await addImage(parts, allProductImages[i], "image/png", `PRODUTO / TELA ${i + 1}`);
            }

            const isAuto = numSlides === 0;
            const orchestratorSlidesNum = isAuto ? "vários" : numSlides;
            const refSlideLengthText = isAuto ? "MÚLTIPLOS slides (você determina a quantidade ideal entre 3 a 8 para focar este conteúdo)" : `${numSlides} slides`;
            const orchestratorBgMode = context.project?.backgroundMode || 'single';
            const bgModeInstruction = orchestratorBgMode === 'dynamic'
                ? "🎨 MODO DE FUNDO: DINÂMICO. O campo 'background_theme' deve descrever a LINGUAGEM VISUAL GERAL (paleta, mood, estilo atmosférico), mas o Designer irá criar um cenário de fundo ÚNICO e DIFERENTE em cada slide para ilustrar o conteúdo daquele slide específico. NÃO defina um fundo fixo — defina um sistema de fundos coerente."
                : "🎨 MODO DE FUNDO: ÚNICO/CONTÍNUO. O campo 'background_theme' deve descrever UM fundo ESPECÍFICO e IDÊNTICO que será usado em ABSOLUTAMENTE TODOS os slides. Seja muito preciso: cor exata, textura, posição de elementos decorativos, opacidades. O Designer vai replicar este fundo pixel a pixel em cada slide.";
            
            let refModeInstruction = '';
            if (referenceImage) {
                if (context.project?.referenceMode === 'similar') {
                    refModeInstruction = `🚨 MODO DE OPERAÇÃO: SIMILAR. Analise a FILOSOFIA de design da IMAGEM DE REFERÊNCIA (espaçamento, hierarquia tipográfica, paleta, proporção dos elementos, estilo atmosférico) e aplique-a como base para os ${orchestratorSlidesNum} slides. NÃO clone graficamente os elementos específicos — adapte a identidade visual para o cliente.`;
                } else if (context.project?.referenceMode === 'inspired') {
                    refModeInstruction = `🚨 MODO DE OPERAÇÃO: INSPIRADO. Releitura criativa inspirada na IMAGEM DE REFERÊNCIA, aplicada coesamente em ${orchestratorSlidesNum} slides.`;
                } else if (context.project?.referenceMode === 'new') {
                    refModeInstruction = `🚨 MODO DE OPERAÇÃO: NOVO. Crie um Master Plan totalmente original para um carrossel de ${orchestratorSlidesNum} slides.`;
                }
            }

            parts.push({ text: `
Você é o Diretor Criativo Sênior de uma agência de design premium mundial. Você está a conceber um SISTEMA DE DESIGN completo para um Carrossel de redes sociais.

O seu trabalho é criar um MASTER LAYOUT que seja rigoroso, consistente e de altíssimo nível profissional. Pense como um designer sênior de identidade visual: cada slide é uma instância refinada do mesmo template — apenas o conteúdo textual muda.

${refModeInstruction ? refModeInstruction + '\n\n⚠️ ATENÇÃO AO MODO "SIMILAR": Isto significa ANALISAR e APLICAR a mesma filosofia de design (espaçamento, hierarquia tipográfica, paleta, proporção dos elementos, estilo fotográfico) — NÃO clonar graficamente os elementos específicos da referência. Adapte para a identidade do cliente.' : ''}

IDENTIDADE DO CLIENTE:
- Nome: "${context.project?.clientName}"
- Nicho: "${context.project?.niche}"
- Descrição: "${context.project?.description || 'Não fornecida'}"
- Cor Primária: ${context.project?.primaryColor}
- Cor Secundária: ${context.project?.secondaryColor}
- ${fontInstruction}
- Instruções de Marca: "${context.project?.instructions || 'Nenhuma'}"
- Restrições: "${context.project?.restrictions || 'Nenhuma'}"

OBJETIVO DO CARROSSEL: "${context.project?.objective}"
TOM: "${context.project?.tone}"
FORMATO: ${ratio} — ${orientationNote}
BRIEFING: "${processedBriefing}"
${projectLearnings}

🌍 IDIOMA DO CONTEÚDO: O idioma do briefing é o idioma de TODA a comunicação visual. Identifique-o e use-o no campo "content_language".

${bgModeInstruction}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "analysis": {
    "carousel_narrative_arc": "Como a história progride da capa até ao CTA final",
    "color_palette": ["#HexPrimario", "#HexSecundario", "#HexAcento"],
    "mood": "Descrição do mood visual (ex: dark premium, minimal clean, vibrant bold)",
    "background_theme": "${orchestratorBgMode === 'dynamic' ? 'MODO DINÂMICO: Descreva a LINGUAGEM VISUAL geral (paleta, mood, estilo), mas NÃO um fundo fixo. Ex: Estilo cinematográfico dark onde cada slide tem uma cena 3D diferente sempre usando tons de #1A1A2E e acentos dourados' : 'MODO ÚNICO: Descreva o fundo UMA VEZ de forma MUITO PRECISA e DETALHADA — este fundo será IDENTICO em todos os slides. Ex: Fundo branco #FFFFFF com grid de linhas cinza-claro (#E8E8E8) de 80px, tipografia ghosted translúcida 15% opacity no background'}"
  },
  "layout_strategy": {
    "scaling_rule": "LUXURY SIZING: Todos os elementos (fontes, ícones, cápsulas) devem parecer deliberadamente PEQUENOS dentro do canvas — cria sensação de grandeza e sofisticação.",
    "element_proportion": "REGRA DE OURO: Área total ocupada por texto + elementos decorativos NUNCA excede 40% do canvas. Os 60%+ restantes são espaço negativo INTENCIONAL.",
    "margins": "Safe Zone de 15% em todas as bordas. ABSOLUTAMENTE NADA pode tocar ou cruzar esta zona.",
    "pagination_style": "Ultra-discreta no canto superior direito — numeração monoespaçada, tamanho mínimo, sem caixa ou fundo.",
    "logo_position": "Canto inferior esquerdo fixo em TODOS os slides — tamanho reduzido, altura máxima de 40px em canvas 1080px."
  },
  "layout_variants": {
    "cover": {
      "style": "ABSOLUTAMENTE MINIMALISTA (Hook). Headline grande e impactante centrada ou com break tipográfico artístico. O texto existe diretamente sobre o fundo. Um subtítulo de apoio muito menor é permitido.",
      "visual_weight": "100% foco no texto de hook. Máximo espaço vazio em volta."
    },
    "body": {
      "style": "ESTRUTURADO E ELEGANTE. Título e corpo de texto harmoniosos. O texto do corpo deve ser posicionado com alinhamento perfeito, preferencialmente usando o espaço negativo do fundo para respirar. Não é obrigatório usar caixas ou formas de fundo para o texto, permita que o texto se integre organicamente ao design. Máximo de 3 linhas de texto.",
      "visual_weight": "Clareza máxima. Elementos pequenos e requintados. Muito espaço negativo."
    }
  },
  "creative_direction": "Descreva em linguagem técnica de designer o estilo visual global. INCLUA obrigatoriamente: (1) Cor e textura exata do fundo, (2) Hierarquia de tamanhos de fonte com valores relativos, (3) Posicionamento preciso de cada elemento recorrente, (4) Limitações explícitas de escala, (5) Referências visuais de estilo (ex: 'estética editorial da Vogue, minimalismo Suíço, luxury tech da Apple')",
  "copy_direction": {
    "content_language": "IDIOMA DETECTADO NO BRIEFING — Todo texto visível nos slides DEVE estar neste idioma. Nenhum caracter de outro alfabeto ou idioma é permitido.",
    "instructions_for_copywriter": "Regras para o copywriter: Slide 1 é a CAPA (Hook curta e magnética), slides seguintes são conteúdo estruturado, último slide é CTA obrigatório. ${isAuto ? 'Escolha entre 3 e 8 slides para desenvolver este tema com profundidade.' : `Crie exatamente ${numSlides} slides.`}"
  }
}
            `});
            const data = await callGemini(parts, MODELS.ORCHESTRATOR, false);
            
            const content = data.candidates[0].content;
            const partsArray = content?.parts || [];
            const textPart = partsArray.find((p: any) => p.text && !p.thought);
            
            result = extractJsonFromResponse(textPart?.text || '{}', { analysis: {}, creative_direction: "", copy_direction: {}, layout_strategy: {} });
            return new Response(JSON.stringify({ success: true, agent, result, usageMetadata: normalizeUsage(data) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 2: COPYWRITER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'copywriter') {
            const parts = [];
            const allProductImages = productImages || (productImage ? [productImage] : []);
            for (let i = 0; i < allProductImages.length; i++) {
                await addImage(parts, allProductImages[i], "image/png", `PRODUTO / TELA ${i + 1}`);
            }

            const isAuto = numSlides === 0;

            parts.push({ text: `
              Você é o "Head of Copy". Sua missão é escrever copy cirúrgico para um CARROSSEL da empresa.
              
              BRIEFING: "${processedBriefing}"
              ARCO NARRATIVO: "${context.orchestrator?.analysis?.carousel_narrative_arc || 'Crie um arco coerente.'}"
              IDIOMA OBRIGATÓRIO: "${context.orchestrator?.copy_direction?.content_language || 'Português do Brasil'}" — TODO o texto deve estar neste idioma.
              ESTRUTURA EXTRA: "${context.orchestrator?.copy_direction?.instructions_for_copywriter || 'Nenhuma'}"
              ${projectLearnings}
              
              🚨 LEIS DE COPY PARA CARROSSEL (ESTRUTURA OBRIGATÓRIA):
              ${isAuto 
                ? `- Tem de retornar um JSON contendo uma propriedade "slides" que é um array com exatamente a QUANTIDADE DE SLIDES QUE CONSIDERAR IDEAL para desenvolver este assunto (escolha o número total entre 3 a 8).` 
                : `- Tem de retornar um JSON contendo uma propriedade "slides" que é um array com RIGOROSAMENTE ${numSlides} objetos.`}
              - ESTRUTURA FIXA:
                1. SLIDE 1 (CAPA/COVER): Título extremamente magnético e visual limpo (Hook). CURTO — máximo 6 palavras.
                2. SLIDES INTERMÉDIOS: Desenvolvimento do conteúdo/valor. Headline: máx 8 palavras. Body: máx 2-3 frases concisas.
                3. ${isAuto ? 'ÚLTIMO SLIDE' : `SLIDE ${numSlides}`} (CTA E ENGAJAMENTO): ESTE SLIDE É OBRIGATÓRIO e dedicado 100% à CALL TO ACTION. Você DEVE pedir interações sociais de forma direta e atrativa (ex: "Salve este post para não esquecer", "Compartilhe com um amigo que precisa ler isso", "Deixe um comentário se concorda", "Clique no link da nossa bio"). Não coloque matéria instrucional neste último slide.
              - Cada slide deve ser extremamente conciso. Menos palavras, mais impacto.

              Retorne APENAS o JSON no seguinte formato:
              {
                "social_caption": "O texto para ir acompanhando o post no Instagram (NÃO VAI NA IMAGEM).",
                "slides": [
                  {
                    "slide_number": 1,
                    "headline": "...",
                    "body": "..."
                  },
                  {
                    "slide_number": 2,
                    "headline": "Uma frase de impacto",
                    "body": "No máximo duas ou três frases curtas focando num conceito de cada vez"
                  }
                ]
              }
              
              GARANTA ${isAuto ? "QUE O TAMANHO DO ARRAY SEJA ADEQUADO AO TEMA!" : `RIGOROSAMENTE A EXISTÊNCIA DE ${numSlides} ELEMENTOS NO ARRAY!`} A sua carreira depende da precisão estrutural do JSON.
            `});
            const data = await callGemini(parts, MODELS.COPYWRITER, false);
            
            const content = data.candidates[0].content;
            const partsArray = content?.parts || [];
            const textPart = partsArray.find((p: any) => p.text && !p.thought);
            
            const parsed = extractJsonFromResponse(textPart?.text || '{}', { social_caption: "", slides: [] });
            
            // Safety check: ensure we have exactly numSlides or within bounds if Auto
            if (!parsed.slides || !Array.isArray(parsed.slides)) parsed.slides = [];
            
            if (isAuto) {
                // Auto limits: min 3, max 8
                while(parsed.slides.length < 3) {
                   if (parsed.slides.length === 0) break;
                   parsed.slides.push({ slide_number: parsed.slides.length + 1, headline: "", body: "" });
                }
                if (parsed.slides.length === 0) {
                    parsed.slides = [
                      { slide_number: 1, headline: "Oops!", body: "Não conseguimos gerar o copy." },
                      { slide_number: 2, headline: "Tentando novamente...", body: "" }
                    ];
                }
                if (parsed.slides.length > 8) {
                   parsed.slides = parsed.slides.slice(0, 8);
                }
            } else {
                while(parsed.slides.length < numSlides) {
                    parsed.slides.push({ slide_number: parsed.slides.length + 1, headline: "", body: "" });
                }
                parsed.slides = parsed.slides.slice(0, numSlides);
            }

            result = parsed;
            return new Response(JSON.stringify({ success: true, agent, result, usageMetadata: normalizeUsage(data) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 3: DESIGNER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'designer') {
            const body = context; 
            const slideIndexRaw = body.slideIndex; 
            const slideIndex = slideIndexRaw !== undefined ? Number(slideIndexRaw) : undefined;
            const slideCopy  = body.slideCopy;
            const forcedNumSlides = body.numSlides || numSlides || (body.copywriter?.slides?.length) || (body.designer?.imageUrls ? body.designer.imageUrls.length : 1);

            console.log(`[Designer] Iniciando geração do slide ${slideIndex !== undefined ? slideIndex + 1 : 'N'}/${forcedNumSlides}`);
            const allProductImages = productImages || (productImage ? [productImage] : []);

            if (slideIndex !== undefined && slideCopy) {
                // Single slide generation (Pipeline mode)
                const parts = [];
                if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");
                
                const productToUse = allProductImages[slideIndex % (allProductImages.length || 1)]; 
                if (productToUse) await addImage(parts, productToUse, "image/png", "TELA / PRODUTO PRINCIPAL DO SLIDE");
                if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO PARA REFERÊNCIA GLOBAL");
                
                const previousSlideUrl = context.previousSlideUrl;
                if (previousSlideUrl) {
                    await addImage(parts, previousSlideUrl, "image/png", "SLIDE ANTERIOR (REFERÊNCIA DE LAYOUT ESTRITA)");
                }

                const layoutStrategy = context.orchestrator?.layout_strategy || {};
                const layoutVariants = context.orchestrator?.layout_variants || {};
                const paletteColors = context.orchestrator?.analysis?.color_palette || [context.project?.primaryColor, context.project?.secondaryColor];
                
                const isCover = slideIndex === 0;
                const currentVariant = isCover ? layoutVariants.cover : layoutVariants.body;

                const strictConsistencyWarning = previousSlideUrl && !isCover
                    ? `\n🚨 REFERÊNCIA DE LAYOUT OBRIGATÓRIA: Em anexo está o "SLIDE ANTERIOR". Espelhe rigorosamente as posições, tamanhos das fontes e alinhamentos exatos usados nele.`
                    : '';

                if (referenceImage) {
                    await addImage(parts, referenceImage, "image/png", "IMAGEM DE REFERÊNCIA VISUAL");
                }

                let refModeInstruction = '';
                if (referenceImage) {
                    if (context.project?.referenceMode === 'similar') {
                        refModeInstruction = `SIMILAR — Aplique a mesma FILOSOFIA visual da referência (espaçamento, proporções, hierarquia tipográfica, estilo atmosférico). NÃO copie literalmente as caixas ou elementos gráficos específicos.`;
                    } else if (context.project?.referenceMode === 'inspired') {
                        refModeInstruction = `INSPIRADO — Faça uma releitura criativa inspirada na IMAGEM DE REFERÊNCIA.`;
                    } else if (context.project?.referenceMode === 'new') {
                        refModeInstruction = `NOVO — Crie um layout totalmente original (pode usar a referência como inspiração secundária).`;
                    }
                }

                const paginationStyle = context.project?.paginationStyle || 'numbers';
                let paginationInstruction = "";
                if (isCover || slideIndex === forcedNumSlides - 1) {
                    paginationInstruction = "- PAGINAÇÃO: ABSOLUTAMENTE PROIBIDO! Este é o slide de Capa ou CTA. Não desenhe nem escreva NENHUM número de página, fração ou barra de progresso.";
                } else {
                    const totalSlides = Math.max(1, forcedNumSlides);
                    const visualTotalPages = Math.max(1, totalSlides - 2); // Excludes Cover AND CTA from total
                    const visualCurrentPage = Math.max(1, Math.min(visualTotalPages, slideIndex)); // Slide 2 (index 1) shows as page 1
                    
                    const activeStr = String(visualCurrentPage).padStart(2, '0');
                    const totalStr = String(visualTotalPages).padStart(2, '0');

                    switch (paginationStyle) {
                        case 'dots': {
                            paginationInstruction = "- PAGINAÇÃO: MODO 'BOLINHAS' (Progresso). Desenhe EXACTAMENTE " + visualTotalPages + " círculos pequenos e alinhados. O círculo número " + visualCurrentPage + " deve estar destacado e os outros discretamente opacos.";
                            break;
                        }
                        case 'fraction': {
                            paginationInstruction = "- PAGINAÇÃO RIGOROSA: MODO 'FRAÇÃO'. É OBRIGATÓRIO escrever no design O TEXTO MATEMÁTICO EXATO: \"" + activeStr + " / " + totalStr + "\". NENHUM outro número é permitido na segunda parte da fração. O denominador deve ser RIGOROSAMENTE " + totalStr + ".";
                            break;
                        }
                        case 'line': {
                            const progPercent = Math.round(((visualCurrentPage) / visualTotalPages) * 100);
                            paginationInstruction = "- PAGINAÇÃO: MODO 'LINHA DE PROGRESSO'. Desenhe uma fina barra horizontal preenchida a " + progPercent + "%.";
                            break;
                        }
                        case 'none': {
                            paginationInstruction = "- PAGINAÇÃO: NENHUMA. Absolutamente nenhum indicador de página.";
                            break;
                        }
                        case 'numbers':
                        default: {
                            const seqStr = Array.from({length: totalSlides - 2}, (_, i) => String(i + 1).padStart(2, '0')).join(' ');
                            paginationInstruction = "- PAGINAÇÃO: MODO 'NUMÉRICO'. OBRIGATÓRIO escrever a linha: \"" + seqStr + "\". Destaque APENAS o número atual (\"" + activeStr + "\").";
                            break;
                        }
                    }
                }

                let logoInstruction = "- LOGOTIPO (CONSISTÊNCIA ESTRITA): Copie a imagem do logotipo anexada EXATAMENTE COMO ELA É. Não adicione texto ao ícone se ele não tiver, não mude a cor se for colorida. Todos os slides devem ter rigorosamente a mesma imagem de logo! PROIBIDO INVENTAR VARIANTES DO LOGO.";


                // Background instruction respects the backgroundMode setting from the project
                const bgMode = context.project?.backgroundMode || 'single';
                let backgroundInstruction: string;
                if (bgMode === 'dynamic') {
                    backgroundInstruction = "- FUNDO DA PÁGINA (MODO: FUNDOS DINÂMICOS — OBRIGATÓRIO): Cada slide DEVE ter um fundo ÚNICO e DIFERENTE dos outros. O cenário visual de fundo DEVE ser gerado especificamente para ilustrar o assunto / copy deste slide em particular. Use elementos 3D, fotográficos, texturas realistas ou composições visuais que contem a história deste slide. O fundo muda a cada slide para criar uma narrativa visual progressiva. Respeite rigorosamente a PALETA DE CORES global e o MOOD definido, mas o cenário DEVE ser distinto e contextualmente relevante para: \"" + (slideCopy?.headline || '') + "\".";
                } else {
                    backgroundInstruction = "- FUNDO DA PÁGINA (MODO: FUNDO ÚNICO / CONTÍNUO — CRÍTICO): O fundo deste slide DEVE ser ABSOLUTAMENTE IDÊNTICO ao de todos os outros slides do carrossel. Use exatamente a mesma cor, textura, gradiente e composição de fundo definidos na DIREÇÃO CRIATIVA GLOBAL. NÃO adicione elementos visuais extras no fundo que não estejam presentes nos outros slides. A consistência do fundo é INEGOCIÁVEL neste modo.";
                }

                const footerText = context.project?.footerText || '';
                let footerInstruction = "";
                if (footerText) {
                    footerInstruction = `- RODAPÉ (FOOTER): OBRIGATÓRIO adicionar o texto "${footerText}" de forma fixa na base do design (fonte minimalista, tamanho ultra pequeno, super legível mas discreto).`;
                }

                const contentLanguage = context.orchestrator?.copy_direction?.content_language || 'Português do Brasil';

                const fullPrompt = `
Você é um Designer Gráfico Sênior de nível mundial, especialista em criar carroséis premium para redes sociais usados por agências de topo.
O COPYWRITER DECIDIU QUE ESTE CARROSSEL TERÁ EXATAMENTE ${forcedNumSlides} SLIDES NO TOTAL.
Você está a renderizar o SLIDE ${slideIndex !== undefined ? slideIndex + 1 : 1} de ${forcedNumSlides}.
${strictConsistencyWarning}

═══════════════════════════════════════════════════════
📍 DIMENSÕES E ORIENTAÇÃO (CRÍTICO — NUNCA IGNORE):
Canvas: Formato ${ratio} (${orientationInstruction}).
A IMAGEM FINAL deve ter exatamente as proporções ${ratio}. Não gere uma imagem quadrada se o formato é vertical.
═══════════════════════════════════════════════════════

🌍 IDIOMA DO CONTEÚDO (LEI MÁXIMA — TOLERÂNCIA ZERO):
Todo texto visível neste slide DEVE estar EXCLUSIVAMENTE em: "${contentLanguage}".
ABSOLUTAMENTE PROIBIDO qualquer caracter, palavra ou símbolo de outro idioma ou alfabeto.
ISTO INCLUI: Japonês (日本語), Chinês (中文), Coreano (한국어), Árabe (العربية), Hebraico (עברית), ou qualquer outro.
Fundo texturizado com texto ghosted? Esse texto TAMBÉM deve estar no idioma correto.

═══════════════════════════════════════════════════════

🏗️ TIPO DE SLIDE: ${isCover ? "🎯 CAPA / COVER (Slide de Abertura)" : slideIndex === forcedNumSlides - 1 ? "🏁 CTA (Call to Action — Slide Final)" : "📄 CONTEÚDO / BODY (Slide de Desenvolvimento)"}

${refModeInstruction ? `🖼️ MODO DE REFERÊNCIA: ${refModeInstruction}\nATENÇÃO: No modo SIMILAR, analise a FILOSOFIA de design (espaçamento, proporções, hierarquia, paleta, estilo atmosférico) — NÃO clone graficamente as mesmas caixas e elementos. Adapte para a identidade deste cliente.\n` : ''}

📐 REGRAS DE PROPORÇÃO E ESPAÇO (NON-NEGOTIABLE):
• Safe Zone: 15% de margem em TODAS as bordas. Zero elementos nesta área.
• Proporção total: Texto + decorações visuais ≤ 38% da área do canvas.
• Os 62%+ restantes são ESPAÇO NEGATIVO INTENCIONAL — deixe respirar.
• Headline: máximo 2 linhas de texto. Nunca mais.
• Body text: máximo 3 linhas de texto. Nunca mais.
• Fontes: small is premium. Nunca use fontes que pareçam grandes ou dominantes.

🖼️ FUNDO GLOBAL DESTE CARROSSEL (${bgMode === 'dynamic' ? 'MODO DINÂMICO' : 'MODO ÚNICO'}):
"${context.orchestrator?.analysis?.background_theme || 'Fundo com a paleta definida da marca, clean e profissional'}"
${bgMode === 'dynamic' ? '🌀 MODO DINÂMICO ATIVO: NÃO replique o fundo de outros slides. O backgroundInstruction abaixo define o cenário específico para ESTE slide.' : '⚠️ MODO ÚNICO ATIVO: Este fundo deve ser ABSOLUTAMENTE IDÊNTICO em todos os slides. Copie exatamente as cores, texturas e elementos decorativos.'}

🎨 ESTRUTURA DO SLIDE:
${isCover
  ? `CAPA — REGRAS ESTRITAS:\n  • Estilo hook minimalista e magnético\n  • Headline GRANDE e impactante (o maior elemento visual)\n  • Elementos de fundo dinâmicos que destacam o texto de forma limpa`
  : slideIndex === forcedNumSlides - 1
  ? `CTA (Slide Final) — REGRAS ESTRITAS:\n  • Destaque o Call to Action de forma clara\n  • Headline apelativa ao engagement\n  • Botão ou elemento visual sublinhando a chamada à ação\n  • Logotipo mais proeminente que nos outros slides`
  : `BODY — REGRAS ESTRITAS:\n  • Título em destaque com hierarquia forte\n  • Corpo de texto alinhado de forma refinada, tipografia limpa\n  • NÃO obrigue o texto a ficar dentro de caixas opacas ou cápsulas se não fizer sentido na estética atual. O texto preferencialmente deve integrar-se diretamente com o fundo usando contraste premium.\n  • Máximo espaçamento e respiro em toda a volta do texto`
}

${paginationInstruction}
${backgroundInstruction}
${footerInstruction}
${logoInstruction}

📝 CONTEÚDO DESTE SLIDE:
Headline: "${slideCopy.headline}"
Body: "${isCover || slideIndex === forcedNumSlides - 1 ? '(sem body neste tipo de slide)' : slideCopy.body}"

${projectLearnings}

${context.reviewerFeedback ? `🚨 ALERTA DE CORREÇÃO PENDENTE (TENTATIVA ANTERIOR REJEITADA PELO DIRETOR):\nVOCÊ DEVE CORRIGIR IMEDIATAMENTE ESTE ERRO ESPECÍFICO NESTA NOVA GERAÇÃO:\n"${context.reviewerFeedback}"\nAplique a correção solicitada sem arruinar o resto do design.` : ''}

🎨 DIREÇÃO CRIATIVA GLOBAL: "${context.orchestrator?.creative_direction || 'Estilo premium e moderno'}"
🎯 PALETA EXATA: ${paletteColors.join(', ')}
🔤 FONTE OBRIGATÓRIA: "${context.project?.primaryFont || 'Montserrat'}" — Use APENAS esta fonte em toda a composição.

📌 POSICIONAMENTO FIXO (idêntico em TODOS os slides):
• Logotipo: ${layoutStrategy.logo_position || 'Canto inferior esquerdo'} — altura máxima 40px para canvas 1080px.
• Paginação: canto superior direito — tamanho mínimo, discreto.

🚫 REGRAS ABSOLUTAS — VIOLAÇÃO = FALHA CRÍTICA:
1. IDIOMA: Zero caracteres em língua que não seja "${contentLanguage}". Inclui texto em background.
2. TEXTO TÉCNICO: Nunca escreva "Slide 1", "Headline", "Body", "Caption", "Footer" ou qualquer metadado no design.
4. TAMANHO: Nenhum elemento single pode ultrapassar 40% da dimensão do canvas.
5. LOGOTIPO: Posição FIXA. Nunca move entre slides. Mesma escala.
6. FUNDO: A cor/textura base do fundo é FIXA. Não mude entre slides.
                `;

                parts.push({ text: fullPrompt });
                const data = await callGemini(parts, MODELS.DESIGNER, true, ratio);

                let base64Data = null;
                let mimeType = "image/png";
                
                const candidateParts = data.candidates?.[0]?.content?.parts || [];
                console.log(`[Designer] Partes recebidas para slide ${slideIndex + 1}:`, candidateParts.map(p => p.inlineData ? "IMAGE_PART" : "TEXT_PART"));

                for (const part of candidateParts) {
                    if (part.inlineData && !part.thought) {
                        base64Data = part.inlineData.data;
                        mimeType = part.inlineData.mimeType || "image/png";
                        break;
                    }
                }

                if (!base64Data) {
                    const finishReason = data.candidates?.[0]?.finishReason;
                    const errorMsg = "AI não retornou imagem para o slide " + (slideIndex + 1) + (finishReason ? " (Motivo: " + finishReason + ")" : "");
                    throw new Error(errorMsg);
                }

                const ext = 'png';
                const fileName = organizationId + "/carousel-squad/" + Date.now() + "-slide" + (slideIndex + 1) + "." + ext;
                const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                
                console.log("[Designer] Fazendo upload para:", fileName);
                
                const { error: uploadError } = await supabase.storage.from("studio-assets").upload(fileName, imageBuffer, { contentType: "image/png" });
                if (uploadError) {
                    console.error("[Designer] Erro no upload:", uploadError);
                    throw new Error("Erro ao salvar imagem no storage: " + uploadError.message);
                }

                const { data: { publicUrl } } = supabase.storage.from("studio-assets").getPublicUrl(fileName);
                console.log("[Designer] Imagem gerada e disponível em:", publicUrl);
                
                result = { imageUrl: publicUrl, slideIndex };
                return new Response(JSON.stringify({ success: true, agent, result, usageMetadata: normalizeUsage(data) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

            } else {
                // Batch generation (Fallback / Legacy mode)
                const slidesData = context.copywriter?.slides || [];
                const imageUrls = [];
                let totalPromptTokens = 0;
                let totalCandidatesTokens = 0;

                for (let i = 0; i < slidesData.length; i++) {
                    const slideCopyLoop = slidesData[i];
                    const parts = [];
                    if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");
                    if (allProductImages.length > 0) {
                       const productToUse = allProductImages[i % allProductImages.length]; 
                       await addImage(parts, productToUse, "image/png", "TELA / PRODUTO PRINCIPAL DO SLIDE");
                    }
                    if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO PARA REFERÊNCIA GLOBAL");

                    const fullPrompt = `
                        CARROSSEL COMPLETO - GERANDO SLIDE ${i + 1} DE ${slidesData.length}
                        FORMATO: ${orientationInstruction}
                        Direção: "${context.orchestrator?.creative_direction}"
                        S1 Headline: "${slideCopyLoop.headline}"
                    `;
                    parts.push({ text: fullPrompt });
                    const data = await callGemini(parts, MODELS.DESIGNER, true);
                    
                    let base64Data = data.candidates[0].content.parts.find(p => p.inlineData)?.inlineData?.data;
                    if (!base64Data) continue;
                    const fileName = organizationId + "/carousel-squad/" + Date.now() + "-loop-slide" + (i + 1) + ".png";
                    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    await supabase.storage.from("studio-assets").upload(fileName, imageBuffer, { contentType: "image/png" });
                    const publicUrl = supabase.storage.from("studio-assets").getPublicUrl(fileName).data.publicUrl;
                    imageUrls.push(publicUrl);
                    
                    const usage = normalizeUsage(data);
                    totalPromptTokens += usage.promptTokenCount;
                    totalCandidatesTokens += usage.candidatesTokenCount;
                }
                result = { imageUrls };
                return new Response(JSON.stringify({ success: true, agent, result, usageMetadata: { promptTokenCount: totalPromptTokens, candidatesTokenCount: totalCandidatesTokens } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 4: REVIEWER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'reviewer') {
            const body = context;
            const slideIndex = body.slideIndex;
            const imageUrl   = body.imageUrl; 

            const parts = [];
            
            if (slideIndex !== undefined && imageUrl) {
                // Single slide review
                if (referenceEnabled && referenceImage) {
                    await addImage(parts, referenceImage, "image/png", "IMAGEM DE REFERÊNCIA (O DESIGNER FOI INSTRUÍDO A SEGUIR A FILOSOFIA DE DESIGN DESTA IMAGEM)");
                }
                await addImage(parts, imageUrl, "image/png", `SLIDE ${slideIndex + 1} GERADO (AVALIE ESTA IMAGEM)`);

                const layoutStrategy = context.orchestrator?.layout_strategy || {};
                const creativeDirection = context.orchestrator?.creative_direction || '';

                parts.push({ text: `
Você é o Diretor de Arte Sênior mais rigoroso da agência.
Sua missão é atuar como "gatekeeper" da qualidade (Quality Assurance).

Você está analisando o SLIDE ${slideIndex + 1} de um carrossel de ${numSlides}.
Tipo de Slide: ${slideIndex === 0 ? "CAPA (Hook)" : slideIndex === numSlides - 1 ? "CTA FINAL" : "BODY (Conteúdo)"}.

O slide continha originalmente a seguinte instrução textual (O texto na imagem DEVE TER SIDO escrito NO NOSSO IDIOMA - ${context.orchestrator?.copy_direction?.content_language || 'Português do Brasil'}):
${body.slideCopy ? `Headline: "${body.slideCopy.headline}"\nBody: "${body.slideCopy.body || '(sem body)'}"` : "(Não informado)"}

🎨 INSTRUÇÕES QUE O DESIGNER RECEBEU DA DIREÇÃO DE ARTE:
- Direção Criativa: "${creativeDirection}"
- Regras de Escala: "${layoutStrategy.scaling_rule || 'Não definido'}"
- Proporção de Elementos: "${layoutStrategy.element_proportion || 'Não definido'}"
${projectLearnings}

Critérios de avaliação INEGOCIÁVEIS (LEIA PALAVRA POR PALAVRA DO DESIGN):
1. ✅ FIDELIDADE AO TEXTO E IDIOMA: O texto que a IA colocou no slide CORRESPONDE RIGOROSAMENTE à Headline e Body pedidas? Há palavras inventadas (gibberish)? Faltam letras? Há algum caractere asiático ou língua diferente inserido aleatoriamente no fundo? Existe texto metadado visível (ex: "Slide 1, Headline, Body, Footer")? Se houver UM ÚNICO erro ortográfico ou palavra inventada = REJECT.
2. ✅ LIMPEZA E AUSÊNCIA DE ARTEFATOS: Tem pedaços bizarros de UI (ex: contador de likes falso, ícones distorcidos, rabiscos aleatórios que não parecem texto humano)? Se tiver = REJECT.
3. ✅ REGRAS DA PAGINAÇÃO E LOGOTIPO: A paginação ou logotipo foi alterada ou escrita com valores errados/inventados? = REJECT.
4. ✅ MEMÓRIA DO PROJETO (SUPER CRÍTICO): Leia com rigor as diretrizes em "O QUE O CLIENTE REJEITOU" ou "INSTRUCOES FIXAS" que você recebeu acima. Se o designer cometeu O MESMO ERRO que o cliente proibiu, REJEITE IMEDIATAMENTE e exija de forma ríspida corrigí-lo.
5. ✅ ESPAÇO E ESTÉTICA EXECUTIVA: O layout respeita a direção do Orchestrator? O negative space está visível ou o texto está esmagado/cortado nas extremidades? Se não estiver premium = REJECT.

Retorne APENAS um JSON no formato EXATO:
{
  "status": "approved" ou "rejected",
  "feedback": "Opcional se approved. Se rejected, DESTRUA a imagem com UMA FRASE muito clara listando os erros EXATOS (ex: 'O texto está em gibberish e inventou palavras na segunda linha', ou 'Você usou fundo escuro e o cliente tinha proibido isso strictamente'). Seja implacável."
}

VOCÊ É O DETETOR DE HALLUCINATIONS! NÃO SEJA LAÇO. Se vir erros, REJEITE IMEDIATAMENTE. O design MANDA no cliente. Se aprovar algo com texto alienígena, a agência perde o contrato.
                `});
            } else {
                // Batch review
                const imageUrls = context.designer?.imageUrls || [];
                for (let i = 0; i < imageUrls.length; i++) {
                     await addImage(parts, imageUrls[i], "image/png", `SLIDE ${i + 1} GERADO`);
                }
                parts.push({ text: `Analise todos os ${numSlides} slides. Retorne approved/rejected.` });
            }
            
            const data = await callGemini(parts, MODELS.REVIEWER, false);
            const content = data.candidates[0].content;
            const textPart = content?.parts?.find((p: any) => p.text && !p.thought);
            result = extractJsonFromResponse(textPart?.text || '{}', { status: 'approved', feedback: '' });
            
            return new Response(JSON.stringify({ success: true, agent, result, usageMetadata: normalizeUsage(data) }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 5: PUBLISHER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'publisher') {
            result = {
                message: "Carrossel entregue com sucesso!",
                finalUrls: context.designer?.imageUrls || context.finalImageUrls || []
            };
        }

        return new Response(JSON.stringify({ success: true, agent, result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Carousel Squad Error:", error);
        return new Response(JSON.stringify({ success: false, error: error.message || error.toString() }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
