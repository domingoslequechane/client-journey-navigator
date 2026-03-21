// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Configuração de Modelos Gemini 3.1 (Architecture: Agentic Workflow)
const MODELS = {
    ORCHESTRATOR: "gemini-3.1-pro-preview",
    COPYWRITER:   "gemini-2.5-flash",
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

async function callGemini(parts: any[], model: string, generateImage = false) {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${geminiKey}`;

    const body: any = {
        contents: [{ role: "user", parts }],
        generationConfig: {
            response_modalities: generateImage ? ["IMAGE", "TEXT"] : ["TEXT"],
        }
    };

    // Ativa o raciocínio profundo (Thinking) para modelos Pro (Orchestrator e Reviewer)
    if (model === MODELS.ORCHESTRATOR || model === MODELS.REVIEWER) {
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

            let refModeInstruction = '';
            if (referenceImage) {
                if (context.project?.referenceMode === 'similar') {
                    refModeInstruction = `
              🚨 MODO DE OPERAÇÃO: SIMILAR (CLONAGEM DA REFERÊNCIA)
              O cliente escolheu replicar a vibe exata da IMAGEM DE REFERÊNCIA. O teu Master Plan gerado (Zonas de texto, limites de copy e moodboard) tem de derivar EXATAMENTE do que estás a ver na imagem de referência. Não reinventes a roda. Extrai a alquimia exata da referência: 
              - Onde está o texto na referência? (Põe na "text_area").
              - Onde está ancorado o produto na referência? (Põe no "product_placement").
            `;
                } else if (context.project?.referenceMode === 'inspired') {
                    refModeInstruction = `
              🚨 MODO DE OPERAÇÃO: INSPIRADO (RELEITURA CRIATIVA)
              O cliente anexou a IMAGEM DE REFERÊNCIA apenas como uma "Bússola Estética", não para cópia. Analisa os traços, o estilo visual geral (ex: minimalista, caótico moderno, sombrio, futurista) e o tipo de iluminação.
              O teu Master Plan deve traduzir a ALMA visual desta referência num layout *novo* e original. Sente-te livre e encorajado para reposicionar as zonas de texto e a ancoragem do produto para construíres um visual ainda mais apelativo, mantendo o mesmo "vibe" de luxo da inspiração original.
            `;
                } else if (context.project?.referenceMode === 'new') {
                    refModeInstruction = `
              🚨 MODO DE OPERAÇÃO: NOVO (FOLHA EM BRANCO)
              O cliente tem uma IMAGEM DE REFERÊNCIA em mente, concebida para definir o "standard de agência" que procura, mas EXIGE ALGO TOTALMENTE NOVO. O teu Master Plan gerado (Zonas de texto, limites de copy e moodboard) deve desenhar DO ZERO uma macro-composição revolucionária que sirva o formato e o briefing, ignorando o layout original da constelação de referência dada. Fica livre para ser disrutptivo.
            `;
                }
            }

            parts.push({ text: `
              Você é o Orquestrador Master de uma agência de publicidade premium.
              Sua missão é analisar o briefing, a identidade do cliente e as imagens fornecidas (especialmente o TEMPLATE APROVADO, se existir) para criar um Master Plan arquitetural para o Copywriter e o Designer.
              
              ${refModeInstruction}

              IDENTIDADE COMPLETA DO CLIENTE:
              - Nome: "${context.project?.clientName}"
              - Nicho: "${context.project?.niche}"
              - Descrição da Marca: "${context.project?.description || 'Não fornecida'}"
              - Cores: Primária (${context.project?.primaryColor}), Secundária (${context.project?.secondaryColor})
              - Tipografia Principal OBRIGATÓRIA: Fonte Google Fonts "${primaryFont}"
              - Regras da Marca: ${context.project?.instructions || 'Nenhuma'}
              - Restrições da Marca: ${context.project?.restrictions || 'Nenhuma'}
              - Padrão de Legendas: "${captionInstructions}"

              CONFIGURAÇÃO DO RESULTADO ESPERADO:
              - Objetivo: "${context.project?.objective}"
              - Tom de Voz: "${context.project?.tone}"
              - Formato: ${context.project?.size} / Proporção: ${ratio} / Orientação: ${orientationNote}

              BRIEFING DO CLIENTE: "${briefing}"

              🚨 INSTRUÇÕES DE ESTRUTURA E ANÁLISE PROFUNDA:
              Antes de gerar a resposta, você deve usar o seu "Thinking" para analisar visualmente os elementos. Se houver um TEMPLATE APROVADO, ele é A LEI. Você deve mapear:
              1. Zonas de Layout (Onde fica o texto? Onde respira a imagem? Onde fica o rodapé?)
              2. Limites de Copy (Quantas palavras cabem sem estragar o design premium?)
              3. Paleta e Mood (Quais cores exatas e atmosfera visual extrair?)

              🚨 REGRAS CRÍTICAS DE DESIGN PREMIUM (DIAMOND STANDARD):
              - ZERO SOBREPOSIÇÃO: Nenhum elemento de texto ou gráfico deve cobrir o produto principal.

              Retorne APENAS um objeto JSON válido com a seguinte estrutura estrita:
              {
                "analysis": {
                  "template_zones": {
                    "text_area": "Descrição exata de onde o texto deve ficar (ex: topo esquerdo, 30% da altura)",
                    "product_placement": "Onde o produto deve ser ancorado (ex: centro inferior)",
                    "footer_position": "Regras para o rodapé"
                  },
                  "detected_palette": ["#Hex1", "#Hex2", "#Hex3"],
                  "mood_keywords": ["palavra1", "palavra2", "palavra3"]
                },
                "creative_direction": "Visão geral do estilo visual e iluminação",
                "copy_direction": {
                  "headline_max_chars": 20,
                  "body_max_words": 12,
                  "tone": "Tom de voz específico a ser usado",
                  "instructions_for_copywriter": "Instruções diretas para o agente Copywriter"
                },
                "layout_strategy": {
                  "constraints": [
                    "Regra 1 inegociável",
                    "Regra 2 inegociável"
                  ]
                }
              }
            `});
            const data = await callGemini(parts, MODELS.ORCHESTRATOR, false);
            
            // Extract the JSON safely handling potential markdown formatting
            const textPart = data.candidates[0].content.parts.find((p: any) => p.text && !p.thought);
            const rawText = textPart?.text || '{}';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : '{}';
            
            result = JSON.parse(jsonString);
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
              Você é o "Head of Copy" de uma agência de publicidade de luxo, famoso por textos curtos, magnéticos e que convertem.
              Sua missão é escrever copy cirúrgico para uma campanha publicitária premium.

              🚨 LEIS INEGOCIÁVEIS DE COPY ARCHITECTURE:
              1. BANIÇÃO DE CLICHÊS: É expressamente proibido usar: "Não perca", "Oportunidade única", "Para si", "O melhor do mercado", "Venha conferir". 
              2. EXTREMA BREVIDADE: O texto NÃO pode poluir o design. Menos palavras = Maior percepção de valor.
              3. TEXTO FUNCIONAL: Se a imagem do produto já fala por si, a Headline não deve repetir o que é óbvio, deve criar DESEJO ou ESTATUTO.
              4. O BEDEL DO ORQUESTRADOR: 
                 - Max HeadLine: ${context.orchestrator?.copy_direction?.headline_max_chars || 20} chars
                 - Max Body: ${context.orchestrator?.copy_direction?.body_max_words || 10} palavras
                 - Direção: "${context.orchestrator?.copy_direction?.instructions_for_copywriter || 'Seja elegante e direto.'}"

              📱 ESTRATÉGIA DA LEGENDA (SOCIAL MEDIA):
              A "social_caption" não vai no design, vai no texto do post (Instagram/Facebook). Aplique a estrutura Hook (linha 1 com impacto) -> Benefício Direto -> Call to Action Claro. Emojis devem ser usados com extrema moderação (estilo premium).

              BRIEFING DO CLIENTE: "${briefing}"
              TOM DE VOZ DA MARCA: "${context.orchestrator?.copy_direction?.tone || context.project?.tone}"
              RESTRIÇÕES DA MARCA: "${context.project?.restrictions || 'Nenhuma'}"

              Retorne APENAS um objeto JSON válido (cuidado com quebras de linha que invalidem o JSON):
              {
                "headline": "Título magnético e ultra-curto",
                "subheadline": "Frase de ancoragem (apenas se absolutamente necessário para o sentido)",
                "body": "No máximo 10 palavras que completam a venda (ou vazio se o design precisar de ar)",
                "cta": "Ex: COMPRAR AGORA (CTA com no máximo 2 palavras)",
                "footer": "Contactos (telefone, website, etc)",
                "social_caption": "Texto do post para as redes sociais seguindo a estratégia Hook+Benefício+CTA"
              }
            `});
            const data = await callGemini(parts, MODELS.COPYWRITER, false);
            
            const textPart = data.candidates[0].content.parts.find((p: any) => p.text && !p.thought);
            const rawText = textPart?.text || '{}';
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : '{}';
            
            result = JSON.parse(jsonString);
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

            const reviewerFeedback = context.reviewer_feedback
                ? `\n\n⚠️ CORREÇÕES OBRIGATÓRIAS (PELA DIREÇÃO DE ARTE):\n${context.reviewer_feedback}\n`
                : '';

            const templateOverride = approvedTemplateImage ? `
                ╔══════════════════════════════════════════════╗
                ║   🚨 MODO RÉPLICA TAXATIVA (COPY & PASTE)   🚨 ║
                ╚══════════════════════════════════════════════╝
                Você é um Mestre Designer focado em PRECISÃO CIRÚRGICA. O template aprovado dita TUDO.
            ` : '';

            let refModeInstructionDesigner = '';
            if (referenceImage) {
                if (context.project?.referenceMode === 'similar') {
                    refModeInstructionDesigner = `
                ╔═════════════════════════════════════════════════════════╗
                ║   🚨 MODO DE GERAÇÃO: SIMILAR (CLONAGEM ESTRUTURAL)   🚨 ║
                ╚═════════════════════════════════════════════════════════╝
                A "IMAGEM DE REFERÊNCIA" fornecida não é apenas uma inspiração vaga, é a tua BÍBLIA ARQUITETÓNICA para esta peça. 
                
                A tua missão é comportar-te como um Mestre Designer focado em PRECISÃO CIRÚRGICA para "clonar" o DNA visual dessa referência:
                1. MATCH DE LAYOUT: Respeita a mesma grelha, proporções e alinhamentos da referência (onde fica a headline, onde fica o produto, etc).
                2. MATCH DE LUZ E MOOD: Absorve o mesmo tipo de iluminação (claro/escuro, neon, studio, natural) para o produto do nosso cliente.
                3. ADAPTAÇÃO FIEL: Substitui os elementos do flyer de referência única e exclusivamente pelo Produto e pelas Cores/Marca do nosso cliente, mantendo o Vibe original inalterado.
            `;
                } else if (context.project?.referenceMode === 'inspired') {
                    refModeInstructionDesigner = `
                ╔═════════════════════════════════════════════════════════╗
                ║   🚨 MODO DE GERAÇÃO: INSPIRADO (RELEITURA MESTRE)    🚨 ║
                ╚═════════════════════════════════════════════════════════╝
                A "IMAGEM DE REFERÊNCIA" fornecida serve como a tua MUSA inspiradora, não como prisão fotocópia.
                
                A tua missão é comportar-te como um Diretor de Arte visionário que absorve uma referência fantástica e eleva-a a um novo patamar competitivo.
                1. MATCH DE ALMA E ENERGIA: Capta a essência da atmosfera, estilo fotográfico e a textura visual (ex: reflexos espelhados, fundos desfocados, estúdio brutalista).
                2. LIBERDADE ESTRUTURAL: Não estás preso(a) à grelha/layout exato da referência. Ajusta os enquadramentos e ângulos de forma orgânica e inteligente para favorecer o formato do nosso Produto.
                3. INOVAÇÃO NO DESIGN: Cria uma obra de arte fotorealista completamente original e que transmita superioridade máxima face à referência inicial. Surpreende!
            `;
                } else if (context.project?.referenceMode === 'new') {
                    refModeInstructionDesigner = `
                ╔═════════════════════════════════════════════════════════╗
                ║   🚨 MODO DE GERAÇÃO: NOVO (REVOLUÇÃO VISUAL)         🚨 ║
                ╚═════════════════════════════════════════════════════════╝
                A "IMAGEM DE REFERÊNCIA" fornecida não dita o projeto geométrico nem as texturas obrigatórias, serve apenas para contextualizar a exigência estética de alta classe expectável. CORTA AS AMARRAS.
                
                A tua missão é comportar-te como um Designer Visionário perante uma tela em branco:
                1. DESVINCULAÇÃO ESTRUTURAL: Rompendo a parede visual, ignora a composição de luz ou posicionamentos literais da referência.
                2. FÓCO NO MASTER PLAN: Baseia toda a tua arquitetura fotorealista exclusivamente nas limitações dadas pelo Orquestrador e nas necessidades de luxo do Produto.
                3. CRIATIVIDADE MÁXIMA MESTRE: Inventa atmosferas, linhas de fuga e dinâmicas criativas inesperadas e disruptivas que ofusquem e eclipsam a própria referência pela sua originalidade e brilho.
            `;
                }
            }

            let orientationInstruction = "QUADRADO (1:1)";
            if (ratio === "9:16") orientationInstruction = "VERTICAL (9:16)";
            else if (ratio === "16:9") orientationInstruction = "HORIZONTAL (16:9)";
            else if (ratio === "4:5") orientationInstruction = "RETRATO (4:5)";

            const fullPrompt = `
                Sua missão é a EXATIDÃO ABSOLUTA na criação visual.
                FORMATO OBRIGATÓRIO MONITORADO: ${orientationInstruction}
                
                ${reviewerFeedback}
                ${templateOverride}
                ${refModeInstructionDesigner}
                
                📋 MASTER PLAN DO ORQUESTRADOR:
                - Direção Criativa: "${context.orchestrator?.creative_direction || 'Não fornecido'}"
                - Mood & Cores: ${JSON.stringify(context.orchestrator?.analysis?.mood_keywords || [])} | ${JSON.stringify(context.orchestrator?.analysis?.detected_palette || [])}
                - Zonas de Layout Exigidas: ${JSON.stringify(context.orchestrator?.analysis?.template_zones || {})}
                
                🛑 RESTRIÇÕES INEGOCIÁVEIS DO LAYOUT:
                ${(context.orchestrator?.layout_strategy?.constraints || []).map((c: string) => `- ${c}`).join('\n')}

                ALÉM DISSO (LEIS GERAIS DO STUDIO E RENDERING):
                - QUALIDADE VISUAL: Masterpiece fotorealista, Octane Render ou Unreal Engine style, Studio Lighting meticuloso, 8k resolution.
                - TIPOGRAFIA: "${primaryFont}" (texto em foco afiado, altamente legível, kerning e alinhamento perfeitos, layout limpo).
                - NEGATIVE SPACE: Use espaço livre para deixar a arte respirar. Estética minimalista premium, focada na alta conversão.
                - 🚫 ZERO TEXTO FALSO/ALUCINADO.
                - 🚫 ZERO SOBREPOSIÇÃO NO PRODUTO.

                CONTEÚDO TEXTUAL OBRIGATÓRIO:
                H1: "${context.copywriter?.headline}"
                Body: "${context.copywriter?.body}"
                Footer: "${context.copywriter?.footer}"
            `;

            parts.push({ text: fullPrompt });
            const data = await callGemini(parts, MODELS.DESIGNER, true);

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

            const reviewerPrompt = approvedTemplateImage 
            ? `Você é o Diretor de Arte (QA rigoroso). Avalie se o FLYER GERADO é uma RÉPLICA FIEL do TEMPLATE APROVADO em termos de organização, ao mesmo tempo que garante um nível de rendering fotorealista premium.
            
            CONDIÇÕES DE REPROVAÇÃO (CRÍTICAS):
            1. SOBREPOSIÇÃO DE ELEMENTOS: O produto/personagem central está obstruído por texto ou gráficos? → REPROVAR.
            2. RENDERING E TIPOGRAFIA FALHADA: O render parece irreal/amador, os textos estão ilegíveis, desfocados ou com fontes/kerning não profissionais? → REPROVAR.
            3. ESPAÇO NEGATIVO (BREVIDADE): A arte está demasiado densa/poluída visualmente? → REPROVAR.
            4. LOCALIZAÇÃO E ANCORAGEM: Elementos fulcrais escaparam do alinhamento estruturado no template aprovado? → REPROVAR.`
            : `Você é o Supreme Diretor de Arte (QA rigoroso de agência Premium). A sua missão é avaliar a qualidade e conversão da peça gráfica, validando o trabalho do Mestre Designer.
            
            CONDIÇÕES DE REPROVAÇÃO (CRÍTICAS):
            1. SOBREPOSIÇÃO DE ELEMENTOS: O produto/personagem central está obstruído por texto ou gráficos de fundo? → REPROVAR.
            2. RENDERING E TIPOGRAFIA FALHADA: A iluminação está pobre (não fotorealista), parece um flyer amador ou o texto tem gralhas "sintéticas" indecifráveis? → REPROVAR.
            3. ESPAÇO NEGATIVO E POLUIÇÃO: O flyer está afogado em demasiados elementos e texto sem "respirar" (sem Espaço Negativo)? → REPROVAR.
            4. HIERARQUIA VISUAL E VENDAS: O título ou CTA não são proeminentes nem chamam a atenção? → REPROVAR.`;

            parts.push({ text: `
              ${reviewerPrompt}

              Use o seu sistema interno de pensamento profundo ("Thinking process") para observar a peça minuciosamente contra o padrão de luxo exigido, antes de ditar a sentença final.
              
              Retorne APENAS um objeto JSON válido (cuidado com as quebras de linha e escapes sintáticos que corrompam a string JSON):
              {
                "status": "approved" ou "rejected",
                "feedback": "Se aprovado de forma suprema, deixe em branco. Se rejeitado, indique explicitamente numa instrução clara o que falhou para o Designer conseguir consertar e re-gerar a peça brilhantemente."
              }
            `});
            const data = await callGemini(parts, MODELS.REVIEWER, false);
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
