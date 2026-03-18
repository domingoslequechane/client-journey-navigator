// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Modelos Pro 2.5: Multimodal
const MODEL_TEXT  = "gemini-2.5-pro";
const MODEL_IMAGE = "gemini-2.5-pro";

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

async function callGemini(parts: any[], model: string, generateImage = false) {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiKey}`;

    const body: any = {
        contents: [{ role: "user", parts }],
        generationConfig: {
            responseModalities: generateImage ? ["TEXT", "IMAGE"] : ["TEXT"],
        }
    };

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Gemini Error: ${err}`);
    }

    return await resp.json();
}

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { agent, productImage, productImages, referenceImage, approvedTemplateImage, briefing, allowImageManipulation, context = {}, organizationId } = await req.json();

        if (!agent) throw new Error("Missing agent parameter");

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        let result = {};

        // Helpers de imagem
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

        // Campos de configuração da marca (vindos do onboarding)
        const primaryFont        = context.project?.primaryFont        || "Montserrat";
        const captionInstructions = context.project?.captionInstructions || "Tom profissional e engajador. Use emojis moderadamente.";
        const ratio              = context.project?.ratio              || "1:1";
        const dimensions         = context.project?.dimensions         || "1080x1080";

        let orientationNote = "Quadrado (1:1)";
        if (ratio === "9:16") orientationNote = "VERTICAL Story/Reels (9:16) — canvas muito mais ALTO que largo";
        else if (ratio === "16:9") orientationNote = "HORIZONTAL Banner (16:9) — canvas muito mais LARGO que alto";
        else if (ratio === "3:4" || ratio === "4:5") orientationNote = "RETRATO (4:5) — canvas mais alto que largo";

        // ──────────────────────────────────────────────────────────────
        // AGENT 1: ORCHESTRATOR
        // ──────────────────────────────────────────────────────────────
        if (agent === 'orchestrator') {
            const parts = [];
            if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO");
            if (referenceImage) await addImage(parts, referenceImage, "image/png", "IMAGEM DE REFERÊNCIA");
            if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");

            // Add product images for the Orchestrator to see what it's dealing with
            const allProductImages = productImages || (productImage ? [productImage] : []);
            for (let i = 0; i < allProductImages.length; i++) {
                await addImage(parts, allProductImages[i], "image/png", `PRODUTO / TELA ${i + 1}`);
            }

            parts.push({ text: `
              Você é o Orquestrador Master de uma agência de publicidade premium.
              Analise o cliente, a imagem de referência e o briefing. Crie um Master Plan limpo e sem poluição.

              IDENTIDADE COMPLETA DO CLIENTE:
              - Nome: "${context.project?.clientName}"
              - Nicho: "${context.project?.niche}"
              - Descrição da Marca: "${context.project?.description || 'Não fornecida'}"
              - Cores: Primária (${context.project?.primaryColor}), Secundária (${context.project?.secondaryColor})
              - Tipografia Principal OBRIGATÓRIA: Fonte Google Fonts "${primaryFont}"
              - Regras da Marca: ${context.project?.instructions || 'Nenhuma'}
              - Restrições da Marca: ${context.project?.restrictions || 'Nenhuma'}
              - Padrão de Legendas Instagram/Facebook da Marca: "${captionInstructions}"

              CONFIGURAÇÃO DO TRABALHO:
              - Objetivo: "${context.project?.objective}"
              - Tom de Voz: "${context.project?.tone}"
              - Formato: ${context.project?.size} / Proporção: ${ratio} / Orientação: ${orientationNote}
              - Modo de Referência: ${context.project?.referenceMode} ('similar' = reprodução fiel, 'inspired' = apenas base, 'new' = 100% original)

              BRIEFING: "${briefing}"

              🚨 POLÍTICA DE ZERO NEGOCIAÇÃO (TEMPLATE APROVADO):
              Se existir um [TEMPLATE APROVADO], sua missão é comandar uma RÉPLICA CIRÚRGICA.
              1. 🛡️ LOGOTIPOS IMUTÁVEIS: Posição e escala idênticas ao template. 
              2. ESTRUTURA TAXATIVA: Onde cada elemento senta é indiscutível. O "Nome do Produto" deve estar no mesmo local exato.
              3. DNA DO RODAPÉ (TÉCNICA PREMIUM): 
                 - Ícones: Retângulos ligeiramente arredondados (squircular), nunca círculos perfeitos.
                 - Typografia DDD: O "+258" (DDD) deve ser menor e alinhado ao topo em relação ao resto do número.
              4. BREVIDADE ABSOLUTA: Descrição deve ser curta e direta.
              5. INTEGRAÇÃO DE CENÁRIO: O produto deve parecer que nasceu no ambiente (sombras e brilhos reais).

              Retorne APENAS JSON válido:
              {
                "creative_direction": "Estilo visual e comando de RÉPLICA ABSOLUTA do DNA do Template Aprovado. Exija ícones 'squircular' e DDD top-aligned.",
                "copy_direction": "Headline curta. Descrição ultra-breve para manter o design limpo.",
                "layout_strategy": "Hierarquia idêntica ao template. ZERO SOBREPOSIÇÃO no produto principal."
              }
            `});
            const data = await callGemini(parts, MODEL_TEXT, false);
            const textPart = data.candidates[0].content.parts.find((p: any) => p.text && !p.thought);
            result = JSON.parse((textPart?.text || '{}').replace(/```json|```/g, '').trim());
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 2: COPYWRITER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'copywriter') {
            const parts = [];
            if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO");
            if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");

            // Add product images so copywriter knows what is being promoted
            const allProductImages = productImages || (productImage ? [productImage] : []);
            for (let i = 0; i < allProductImages.length; i++) {
                await addImage(parts, allProductImages[i], "image/png", `PRODUTO / TELA ${i + 1}`);
            }

            parts.push({ text: `
              Você é um Copywriter de elite. 
              Sua função é fornecer o texto necessário para preencher o design com precisão.

              🚨 REGRA DE OURO (EXTREMA BREVIDADE):
              A descrição ("body") deve ser extremamente curta (máximo 12 palavras) para não poluir o layout premium.

              REGRAS TIPOGRÁFICAS PARA O FOOTER:
              - No telefone, instrua que o DDD (+258) deve ser formatado visualmente menor e alinhado ao topo.

              BRIEFING: "${briefing}"
              DIREÇÃO DO ORQUESTRADOR: "${context.orchestrator?.copy_direction}"

              Retorne APENAS JSON válido:
              {
                "headline": "Nome/Título do Produto (curto)",
                "subheadline": "Frase de apoio",
                "body": "Descrição ultra-breve",
                "cta": "Texto do botão (se existir)",
                "footer": "Contatos (especifique o DDD menor e no topo no prompt do designer)",
                "social_caption": "Legenda curta e elegante"
              }
            `});
            const data = await callGemini(parts, MODEL_TEXT, false);
            const textPart = data.candidates[0].content.parts.find((p: any) => p.text && !p.thought);
            result = JSON.parse((textPart?.text || '{}').replace(/```json|```/g, '').trim());
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 3: DESIGNER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'designer') {
            const parts = [];
            
            const allProductImages = productImages || (productImage ? [productImage] : []);
            for (let i = 0; i < allProductImages.length; i++) {
                await addImage(parts, allProductImages[i], "image/png", `PRODUTO / TELA ${i + 1}`);
            }
            
            if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO");
            if (referenceImage) await addImage(parts, referenceImage, "image/png", "IMAGEM DE REFERÊNCIA");
            if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");

            const refMode = context.project?.referenceMode || 'similar';

            const reviewerFeedback = context.reviewer_feedback
                ? `\n\n⚠️ CORREÇÕES OBRIGATÓRIAS:\n${context.reviewer_feedback}\n`
                : '';

            const templateOverride = approvedTemplateImage ? `
                ╔══════════════════════════════════════════════╗
                ║   🚨 MODO RÉPLICA TAXATIVA (COPY & PASTE)   🚨 ║
                ╚══════════════════════════════════════════════╝
                Você é um Mestre Designer focado em PRECISÃO CIRÚRGICA. 
                1. LOCALIZAÇÃO DOS ELEMENTOS: O "Nome do Produto" e a "Descrição" devem estar EXATAMENTE no mesmo local que no template aprovado.
                2. ÍCONES (SQUIRCULAR): Os ícones no rodapé NÃO são círculos. Eles são retângulos com bordas ligeiramente arredondadas.
                3. TÉCNICA DDD PREMIM: No rodapé, o código de país (+258) deve ser renderizado menor e alinhado ao topo da linha de texto, para um look elegante.
                4. ZERO SOBREPOSIÇÃO: É terminantemente proibido colocar qualquer texto ou elemento gráfico sobre o produto principal. O produto deve estar totalmente visível.
                5. INTEGRAÇÃO REALISTA: Use técnicas de CGI para que o produto pareça estar fisicamente no cenário (brilhos refletidos do ambiente, sombras de contato precisas).
            ` : '';

            let orientationInstruction = "QUADRADO (1080x1080)";
            if (ratio === "9:16") orientationInstruction = "VERTICAL (9:16)";
            else if (ratio === "16:9") orientationInstruction = "HORIZONTAL (16:9)";

            const fullPrompt = `
                Você é um Mestre Designer e sua missão é a EXATIDÃO ABSOLUTA.
                ${reviewerFeedback}
                ${templateOverride}

                CONTEÚDO TEXTUAL OBRIGATÓRIO (MANTENHA CURTO):
                H1 (Nome do Produto): "${context.copywriter?.headline}"
                Body (Descrição): "${context.copywriter?.body}"
                Footer (DDD menor/topo): "${context.copywriter?.footer}"

                DIRETRIZES TÉCNICAS:
                - Tipografia: "${primaryFont}" (respeite pesos e cores do template).
                - Ícones: Bordas ligeiramente arredondadas (estilo iOS/squircular).
                - Integração: O produto deve estar ENCAIXADO no cenário, sem parecer colado.
                - 🚫 ZERO TEXTO FALSO.
                - 🚫 ZERO SOBREPOSIÇÃO NO PRODUTO.
            `;

            parts.push({ text: fullPrompt });

            const data = await callGemini(parts, MODEL_IMAGE, true);

            let base64Data = null;
            let mimeType = "image/png";
            const candidateParts = data.candidates[0].content?.parts || [];

            for (const part of candidateParts) {
                if (part.inlineData && !part.thought) {
                    base64Data = part.inlineData.data;
                    mimeType = part.inlineData.mimeType || "image/png";
                    break;
                }
            }

            if (!base64Data) throw new Error("Designer falhou: API não retornou imagem");

            const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
            const fileName = `${organizationId}/flyer-squad/${Date.now()}.${ext}`;
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            await supabase.storage.from("studio-assets").upload(fileName, imageBuffer, { contentType: mimeType });
            const { data: { publicUrl } } = supabase.storage.from("studio-assets").getPublicUrl(fileName);

            result = { imageUrl: publicUrl };
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 4: REVIEWER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'reviewer') {
            const parts = [];
            await addImage(parts, context.designer.imageUrl, "image/png", "FLYER GERADO");
            if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO");

            parts.push({ text: `
              Você é o Diretor de Arte (QA rigoroso).
              Avalie se o FLYER GERADO é uma RÉPLICA FIEL do TEMPLATE APROVADO.

              CONDIÇÕES DE REPROVAÇÃO (CRÍTICO):
              1. SOBREPOSIÇÃO: O produto está coberto por algum texto ou ícone? → REPROVAR.
              2. ÍCONES: Os ícones no rodapé são círculos em vez de retângulos arredondados? → REPROVAR.
              3. BREVIDADE: A descrição está muito longa e polui o design? → REPROVAR.
              4. LOCALIZAÇÃO: O nome do produto ou logo mudaram de lugar? → REPROVAR.
              5. TYPO DDD: O DDD (+258) não está menor ou alinhado ao topo? → REPORVAR.

              Retorne JSON:
              {
                "status": "approved" ou "rejected",
                "feedback": "Descreva o erro exato de layout ou tipografia"
              }
            `});
            const data = await callGemini(parts, MODEL_TEXT, false);
            const textPart = data.candidates[0].content.parts.find((p: any) => p.text && !p.thought);
            result = JSON.parse((textPart?.text || '{}').replace(/```json|```/g, '').trim());
        }

        // ──────────────────────────────────────────────────────────────
        // AGENT 5: PUBLISHER
        // ──────────────────────────────────────────────────────────────
        else if (agent === 'publisher') {
            result = {
                message: "Flyer entregue com sucesso!",
                finalUrl: context.designer.imageUrl
            };
        }

        return new Response(JSON.stringify({ success: true, agent, result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Flyer Squad Error:", error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
