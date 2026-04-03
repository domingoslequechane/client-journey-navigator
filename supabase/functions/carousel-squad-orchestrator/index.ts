// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Configuração de Modelos Gemini (Architecture: Agentic Workflow)
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
        body.generationConfig.thinking_config = {
            thinking_level: "HIGH"
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
            const refSlideLengthText = isAuto ? "MÚLTIPLOS slides (você determina a quantidade ideal entre 2 a 10 para focar este conteúdo)" : `${numSlides} slides`;
            
            let refModeInstruction = '';
            if (referenceImage) {
                if (context.project?.referenceMode === 'similar') {
                    refModeInstruction = `🚨 MODO DE OPERAÇÃO: SIMILAR. Clone o layout da IMAGEM DE REFERÊNCIA para ser aplicado nos ${orchestratorSlidesNum} slides.`;
                } else if (context.project?.referenceMode === 'inspired') {
                    refModeInstruction = `🚨 MODO DE OPERAÇÃO: INSPIRADO. Releitura criativa da referência aplicada coesamente em ${orchestratorSlidesNum} slides.`;
                } else if (context.project?.referenceMode === 'new') {
                    refModeInstruction = `🚨 MODO DE OPERAÇÃO: NOVO. Crie um Master Plan totalmente original para um carrossel de ${orchestratorSlidesNum} slides.`;
                }
            }

            parts.push({ text: `
Você é o Diretor Criativo Sênior de uma agência de design premium. Você está a conceber um SISTEMA DE DESIGN para um Carrossel.

O seu trabalho é criar um MASTER LAYOUT que seja rígido, consistente e profissional. Pense como um designer de identidade visual: cada slide é uma instância do mesmo template — apenas o texto muda.

${refModeInstruction}

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
BRIEFING: "${briefing}"

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "analysis": {
    "carousel_narrative_arc": "Como a história progride da capa até o CTA final",
    "color_palette": ["#HexPrimario", "#HexSecundario", "#HexAcento"],
    "mood": "Descrição do mood visual (ex: dark premium, minimal clean, vibrant bold)"
  },
  "layout_strategy": {
    "scaling_rule": "REDUZA TUDO: Fontes, ícones e cápsulas devem ser pequenos. Espaço negativo (vazio) deve ocupar 60% da tela.",
    "margins": "Luxury Padding de 15% em todas as bordas (Safe Zone).",
    "pagination_style": "Barras horizontais discretas no topo (estilo Stories) + numeração elegante '01 / 0X' (fonte mono, 12pt).",
    "logo_position": "Canto superior direito ou esquerdo (mantenha fixo em todos os slides)."
  },
  "layout_variants": {
    "cover": {
      "style": "MINIMALISTA (Hook). Headline centralizada ou com alinhamento artístico largo. ZERO cápsulas de conteúdo. Fundo com asset visual (Q desfocado ou produto) discreto.",
      "visual_weight": "Foco 100% no Título e curiosidade."
    },
    "body": {
      "style": "ESTRUTURADO. Headline no topo (abaixo da paginação), Body dentro de cápsulas 'Glassmorphism' com contorno branco 0.5pt ultra-fino e transparência.",
      "visual_weight": "Clareza e legibilidade premium."
    }
  },
  "creative_direction": "Uma descrição detalhada do estilo visual geral a usar",
  "copy_direction": {
    "instructions_for_copywriter": "Regras para o copywriter: Slide 1 é a CAPA (Hook curta e magnética), slides seguintes são conteúdo. ${isAuto ? 'Sinta-se livre para escolher entre 2 e 10 slides.' : `Crie exatamente ${numSlides} slides.`}"
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
              
              BRIEFING: "${briefing}"
              ARCO NARRATIVO: "${context.orchestrator?.analysis?.carousel_narrative_arc || 'Crie um arco coerente.'}"
              ESTRUTURA EXTRA: "${context.orchestrator?.copy_direction?.instructions_for_copywriter || 'Nenhuma'}"
              
              🚨 LEIS DE COPY PARA CARROSSEL (ESTRUTURA OBRIGATÓRIA):
              ${isAuto 
                ? `- Tem de retornar um JSON contendo uma propriedade "slides" que é um array com exatamente a QUANTIDADE DE SLIDES QUE CONSIDERAR IDEAL para desenvolver este assunto (escolha o número total entre 2 a 10).` 
                : `- Tem de retornar um JSON contendo uma propriedade "slides" que é um array com RIGOROSAMENTE ${numSlides} objetos.`}
              - ESTRUTURA FIXA:
                1. SLIDE 1 (CAPA/COVER): Título extremamente magnético e visual limpo (Hook).
                2. SLIDES INTERMÉDIOS: Desenvolvimento do conteúdo/valor.
                3. ${isAuto ? 'ÚLTIMO SLIDE' : `SLIDE ${numSlides}`} (CTA/CALL TO ACTION): Instrução clara do que o usuário deve fazer agora (ex: Comenta 'Quero', Clica no link, Envia DM).
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
                // Auto limits: min 2, max 10
                while(parsed.slides.length < 3) { // usually at least 3 slides (capa, body, cta)
                   if (parsed.slides.length === 0) break; // if complete failure, let it fail or use fallback
                   parsed.slides.push({ slide_number: parsed.slides.length + 1, headline: "", body: "" });
                }
                if (parsed.slides.length === 0) {
                    // Absolute fallback if parsing failed entirely
                    parsed.slides = [
                      { slide_number: 1, headline: "Oops!", body: "Não conseguimos gerar o copy." },
                      { slide_number: 2, headline: "Tentando novamente...", body: "" }
                    ];
                }
                if (parsed.slides.length > 10) {
                   parsed.slides = parsed.slides.slice(0, 10);
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
            const forcedNumSlides = body.numSlides || numSlides || (body.designer?.imageUrls ? body.designer.imageUrls.length : 1);

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
                    ? `\n🚨 REFERÊNCIA DE LAYOUT OBRIGATÓRIA: Em anexo está o "SLIDE ANTERIOR". Você DEVE ESPELHAR rigorosamente as posições, tamanhos das fontes e alinhamentos exatos usados nele. Nenhuma caixa ou texto pode saltar milímetros.`
                    : '';

                const fullPrompt = `
Você é um Designer Sênior especializado em carroséis para redes sociais.
Está a renderizar o SLIDE ${slideIndex !== undefined ? slideIndex + 1 : 1} de ${forcedNumSlides} de um carrossel.
${strictConsistencyWarning}

📍 ORIENTAÇÃO DA TELA (CRÍTICO): Formato ${ratio} (${orientationInstruction}). A imagem DEVE ser gerada nas proporções corretas!

⚠️ REGRAS DE ESCALA E ESPAÇO (NON-NEGOTIABLE):
- LUXURY PADDING: Mantenha um respiro (Safe Zone) de exatamente 15% em TODAS as bordas. NADA pode tocar essa zona.
- ESCALA DOS ELEMENTOS: O design deve parecer "PEQUENO" dentro do canvas para dar sensação de grandeza. Itens nunca devem ocupar mais que 40% da área total.
- ESPAÇO NEGATIVO: Deixe muito espaço vazio. Isso é o que define um design profissional.

🎨 ESTRUTURA DO SLIDE (${isCover ? "CAPA / COVER" : "CONTEÚDO / BODY"}):
- ${isCover ? "ESTILO CAPA (HOOK): Headline centralizada ou com alinhamento artístico largo. ZERO cápsulas de conteúdo. Foco em impacto visual e curiosidade." : "ESTILO CONTEÚDO: Headline no topo (abaixo da paginação), Body dentro de cápsulas 'Glassmorphism' com contorno branco 0.5pt ultra-fino."}
- PAGINAÇÃO: Implemente barras horizontais discretas no topo (estilo Stories) e a numeração elegante '0${slideIndex + 1} / 0${forcedNumSlides}'.
- LOGOTIPO: Deve estar no ${layoutStrategy.logo_position || 'Canto superior'} em tamanho reduzido e elegante.

📝 CONTEÚDO DESTE SLIDE:
Headline: "${slideCopy.headline}"
Body: "${isCover ? '' : slideCopy.body}"

🎨 DIREÇÃO CRIATIVA GLOBAL: "${context.orchestrator?.creative_direction || 'Estilo premium e moderno'}"
🎯 PALETA EXATA: ${paletteColors.join(', ')}
🎯 FONTE: "${context.project?.primaryFont || 'Montserrat'}"

🚫 PROIBIÇÕES:
1. NUNCA use cápsulas ou listas no Slide 1 (Capa).
2. NUNCA deixe o texto "sufocado" ou grande demais. Use o tamanho da referência (pequeno e elegante).
3. NUNCA altere a posição do logo ou das barras de paginação entre os slides (consistência total).
4. NUNCA escreva metadados técnicos (ex: "Slide 1") no design, use apenas a numeração estilizada.
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
                // Usando concatenação explícita para evitar falhas de interpolação no Edge Runtime
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
                    
                    // ... (simplified loop logic for length, usually we'd avoid this in pipeline but keep for safety)
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
                await addImage(parts, imageUrl, "image/png", `SLIDE ${slideIndex + 1} GERADO`);
                parts.push({ text: `
                    Você é o Diretor de Arte. Analise o SLIDE ${slideIndex + 1} de um carrossel de ${numSlides}.
                    Verifique se o design está premium, se o texto está legível e se não há sobreposição amadora.
                    
                    Retorne APENAS JSON:
                    {
                        "status": "approved" ou "rejected",
                        "feedback": "Obrigatório se rejeitado"
                    }
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
