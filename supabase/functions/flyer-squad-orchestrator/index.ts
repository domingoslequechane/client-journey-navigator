// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Modelos separados: texto (rápido, barato) vs imagem (premium Nano Banana Pro)
const MODEL_TEXT  = "gemini-2.5-flash";
const MODEL_IMAGE = "gemini-3-pro-image-preview";

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

              🚨 DIRETIVA DE DETALHE ABSURDO (NÍVEL DIRETOR DE ARTE SENIOR):
              1. ANÁLISE DE LUZ: Identifique a direção da luz no [TEMPLATE APROVADO]. Ordene ao Designer que aplique EXATAMENTE a mesma iluminação (luz direta, preenchimento e rim light) no novo produto.
              2. GRID E ESPAÇAMENTO: O Designer deve respeitar os "respiros" (white space) do template. Nada de texto encostado às bordas ou ao produto.
              3. MICRO-COMPONENTES:
                 - Ícones: Devem ter a mesma espessura de linha (stroke weight) em todo o flyer.
                 - Rodapé: A "Pílula" (pill) do telemóvel deve ter os cantos perfeitamente matemáticos.
              4. LIFESTYLE HIPER-REALISTA: O fundo não é uma "foto de banco". Deve ser um cenário de alto padrão onde o produto pareça ter sido fotografado por um profissional (Shadows, Reflections, Depth of Field).
              5. VETO A HALLUCINAÇÕES: Proibido inventar sombras "drop shadow" flutuantes. Use apenas Sombras de Contacto (Grounded Shadows).
              6. FONTE: Exclusividade absoluta da "${primaryFont}".
              ${approvedTemplateImage ? `
              🚨 MODO CLONAGEM MOLECULAR (TEMPLATE APROVADO):
              Ignore a criatividade livre. O seu único trabalho é a SUBSTITUIÇÃO CIRÚRGICA DE 4 PASSOS:
              - Passo 1: Mantenha a arquitetura do rodapé (Pílula Topo + Endereço Base) intocável.
              - Passo 2: Troque o produto integrando-o fisicamente ao novo ambiente.
              - Passo 3: Use os novos textos com ícones gráficos reais (Checkmarks/Dots), nunca caracteres de teclado.
              - Passo 4: Gere o fundo Depicting a real-world application with Bokeh.
              ` : ''}

              Retorne APENAS JSON válido (sem markdown, sem texto extra):
              {
                "creative_direction": "Estilo visual, contraste, regras anti-alucinação e obrigatoriedade da fonte ${primaryFont}",
                "copy_direction": "Mensagem central, tom de voz e gatilho emocional para o copywriter",
                "layout_strategy": "Hierarquia de elementos: onde vai o logo, título, CTA, footer — garantindo que CAIXAS DE TEXTO nunca cubram a imagem principal"
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
            // Copywriter vê o logo também
            if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");

            // Add product images so copywriter knows what is being promoted
            const allProductImages = productImages || (productImage ? [productImage] : []);
            for (let i = 0; i < allProductImages.length; i++) {
                await addImage(parts, allProductImages[i], "image/png", `PRODUTO / TELA ${i + 1}`);
            }

            parts.push({ text: `
              Você é um Copywriter de elite especializado em Marketing de Alta Conversão.

              MARCA DO CLIENTE:
              - Empresa: "${context.project?.clientName}"
              - Nicho: "${context.project?.niche}"
              - Descrição da Marca: "${context.project?.description || 'Não fornecida'}"
              - Objetivo da Campanha: "${context.project?.objective}"
              - Tom de Voz: "${context.project?.tone}"
              - Site da Marca: "${context.project?.websiteUrl || 'Não fornecido'}"

              CONTATOS OFICIAIS (para o rodapé do flyer — use exatamente estes):
              ${JSON.stringify(context.project?.contactInfo || {})}

              ══════════════════════════════════════════════
              PADRÃO DE LEGENDAS DA MARCA (REGRA CRÍTICA):
              "${captionInstructions}"
              O campo "social_caption" DEVE seguir RIGOROSAMENTE este padrão.
              ══════════════════════════════════════════════

              BRIEFING: "${briefing}"
              DIREÇÃO DO ORQUESTRADOR: "${context.orchestrator?.copy_direction}"

              REGRAS:
              1. PROIBIDO incluir caracteres como "(i)", "•" ou "-" dentro do texto retornado. Envie apenas o texto limpo.
              2. "footer" DEVE conter os contatos reais (telefone, site, endereço).
              3. Mantenha os textos do flyer curtos e legíveis (headline: máx 7 palavras).
              4. NÃO use marcas, nomes ou @handles da imagem de referência.
              ${approvedTemplateImage ? `
              🚨 MODO TEMPLATE APROVADO:
              Mantenha o tom de elite. Envie apenas as frases dos benefícios em "body". O Designer se encarregará de colocar os ícones visuais adequados.
              ` : ''}

              Retorne APENAS JSON válido:
              {
                "headline": "Título impactante (máx 7 palavras)",
                "subheadline": "Frase de apoio (máx 10 palavras)",
                "body": "Descrição curta ou bullet points",
                "cta": "Chamada para ação (máx 4 palavras)",
                "footer": "Site, telefone e endereço reais do cliente",
                "social_caption": "Legenda COMPLETA para redes sociais seguindo o PADRÃO DE LEGENDAS DA MARCA acima"
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
            
            // Handle multiple product images
            const allProductImages = productImages || (productImage ? [productImage] : []);
            for (let i = 0; i < allProductImages.length; i++) {
                await addImage(parts, allProductImages[i], "image/png", `PRODUTO / TELA ${i + 1}`);
            }
            
            if (approvedTemplateImage) await addImage(parts, approvedTemplateImage, "image/png", "TEMPLATE APROVADO");
            if (referenceImage) await addImage(parts, referenceImage, "image/png", "IMAGEM DE REFERÊNCIA");
            if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl, "image/png", "LOGOTIPO DA MARCA");

            const refMode = context.project?.referenceMode || 'similar';

            const reviewerFeedback = context.reviewer_feedback
                ? `\n\n⚠️ CORREÇÕES OBRIGATÓRIAS (o revisor reprovou o design anterior — CORRIJA AGORA):\n${context.reviewer_feedback}\n`
                : '';

            const templateOverride = approvedTemplateImage ? `
                ╔══════════════════════════════════════════════╗
                ║   🚨 MODO DETALHE ABSURDO (CGI & RETOUCH) 🚨 ║
                ╚══════════════════════════════════════════════╝
                Você é um Mestre Retocador Digital. O seu nível de detalhe deve ser doentio:
                1. FISICA DO PRODUTO: Analise o material do produto (ex: Chrome/Metal). Ele DEVE refletir sutilmente as cores do novo cenário criado. Aplique Sombras de Contacto (AO) escuras onde o metal toca a superfície e sombras suaves de preenchimento.
                2. INTEGRAÇÃO DE BORDAS: Elimine qualquer halo ou serrilhado. O produto deve estar "fundido" ao fundo de forma orgânica.
                3. DNA DO RODAPÉ (MATEMÁTICO): 
                   - O recipiente branco deve ser um "Stadium Shape" perfeito. 
                   - Ícone de Telemóvel e Pin de Localização devem ter o mesmo estilo minimalista (line icons). 
                   - Respeite o alinhamento vertical exato: Pílula em cima, Endereço centrado em baixo.
                4. TIPOGRAFIA FLUTUANTE: Use apenas gradientes sutis para garantir a leitura. Veto total a caixas sólidas atrás do texto principal.
                5. CENÁRIO (STAGING): O cenário de fundo deve ser um ambiente de luxo "Lifestyle" que faça sentido para o produto, com profundidade de campo (Bokeh) ultrarrealista.
            ` : '';

            let orientationInstruction = "QUADRADO (canvas 1080x1080 — igual em largura e altura)";
            if (ratio === "9:16") orientationInstruction = "VERTICAL STORY (canvas 1080x1920 — MUITO MAIS ALTO que largo)";
            else if (ratio === "16:9") orientationInstruction = "HORIZONTAL BANNER (canvas 1920x1080 — MUITO MAIS LARGO que alto)";
            else if (ratio === "4:5") orientationInstruction = "RETRATO (canvas 1080x1350 — mais alto que largo)";

            const fullPrompt = `
                Você é o Designer Gráfico Sênior mais premiado da agência.
                Sua tarefa: criar arte fotorrealista ultra-premium no formato ${ratio}.
                ${reviewerFeedback}
                ${templateOverride}

                ╔══════════════════════════════════════════════╗
                ║           IDENTIDADE DO CLIENTE              ║
                ╚══════════════════════════════════════════════╝
                - Marca: ${context.project?.clientName}
                - Nicho: ${context.project?.niche}
                - Cores Oficiais: ${context.project?.primaryColor} (primária) e ${context.project?.secondaryColor} (secundária)
                - Logotipo Oficial: Última imagem fornecida (incorpore no topo ou rodapé com destaque)
                - Tipografia Principal Oficial (GOOGLE FONT): "${primaryFont}"
                  → TODA tipografia do flyer DEVE usar visualmente esta fonte: "${primaryFont}"
                  → H1, subtítulo, CTA — tudo com o estilo tipográfico de "${primaryFont}"

                ╔══════════════════════════════════════════════╗
                ║     CONTEÚDO TEXTUAL — IMPRIMA EXATAMENTE   ║
                ╚══════════════════════════════════════════════╝
                H1 (Título): "${context.copywriter?.headline}"
                Sub: "${context.copywriter?.subheadline}"
                Corpo: "${context.copywriter?.body}"
                CTA (Botão): "${context.copywriter?.cta}"
                RODAPÉ/FOOTER: "${context.copywriter?.footer}"

                ╔══════════════════════════════════════════════╗
                ║       DIREÇÃO CRIATIVA DO ORQUESTRADOR       ║
                ╚══════════════════════════════════════════════╝
                ${context.orchestrator?.creative_direction}

                ESTRATÉGIA DE LAYOUT:
                ${context.orchestrator?.layout_strategy}

                ╔══════════════════════════════════════════════╗
                ║         REGRAS ABSOLUTAS DE DESIGN           ║
                ╚══════════════════════════════════════════════╝
                1. 🚫 ZERO TEXTO FALSO: Os ÚNICOS textos visíveis na arte são os do "CONTEÚDO TEXTUAL" acima. Nada de letras em placas, telas de apps ou fundos.
                2. 🚫 ZERO MOCKUPS DEFORMADOS: Não gere celulares flutuantes com interfaces de app falsas. Prefira fotos reais de ambiente ou pessoas naturais.
                3. 🛡️ PROTEJA ROSTOS/PRODUTO: Caixas de texto NUNCA cobrem rostos ou o produto principal. Use espaço negativo ou "lower thirds".
                4. 🔤 TIPOGRAFIA (CRÍTICO): A FONTE OBRIGATÓRIA É "${primaryFont}". Renderize H1, subtítulos e CTA com o estilo visual desta Google Font.
                5. 📍 RODAPÉ OBRIGATÓRIO: O texto "${context.copywriter?.footer}" DEVE estar no rodapé da arte, legível e organizado.
                6. 🖼️ LOGO OBRIGATÓRIO: Use a última imagem fornecida como logo da marca. Ajuste cor se necessário (branco/preto para contraste).
                ${allowImageManipulation === false 
                    ? '7. 🚷 PROIBIDO MANIPULAR O PRODUTO (CRÍTICO): As imagens fornecidas de produtos/telas DEVEM aparecer EM DESTAQUE NA FRENTE DO FLYER, MAS EXATAMENTE COMO SÃO. Não deforme, não mude a cor, tamanho, nem aplique filtros destruidores. Elas são a atração principal.'
                    : '7. 🧩 INTEGRAÇÃO CENÁRIO/LIFESTYLE: Foram fornecidas imagens de produtos/telas. Você DEVE criar uma cena estilo "Product Staging" realista. Integre perfeitamente este produto a um ambiente impressionante. Combine as luzes, adicione reflexos e sombras precisos. O produto deve parecer que pertence fisicamente ao ambiente criado.'}
                8. 📐 FORMATO OBRIGATÓRIO: ${orientationInstruction}
                9. ✂️ APAGUE qualquer texto, @ ou logo da IMAGEM DE REFERÊNCIA.
                10. 🎨 REGRAS DE OURO PARA DESIGN PROFISSIONAL:
                    - 🚫 ZERO CARACTERES TEXTUAIS EM LISTAS: É terminantemente proibido desenhar "(i)", "(1)" ou "-". Em vez disso, desenhe ELEMENTOS GRÁFICOS reais como círculos coloridos, checkmarks estilizados ou ícones minimalistas.
                    - SEM CAIXAS PESADAS: O texto deve flutuar em gradientes suaves.
                    - SEM "HALOS": Recorte do produto orgânico e sem brilho branco.
                    - SOMBRAS DE CONTATO (AO): Realistas e suaves.
                    - BOKEH REALISTA: Fundo com desfoque fotográfico.
                    - CONTACT PILLS: Pílula branca (telefone) + Texto branco (endereço) conforme o template.
                11. MODO [${refMode.toUpperCase()}]:
                   - SIMILAR: Reproduza a estrutura exata da referência, com acabamento de luxo e cores do novo cliente.
                   - INSPIRED: Use apenas a aura de estilo. Layout original e moderno.
                   - NEW: Ignore completamente a referência. Crie um design 2025 focado em conversão.
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
            await addImage(parts, context.designer.imageUrl);
            if (context.project?.logoUrl) await addImage(parts, context.project.logoUrl);

            parts.push({ text: `
              Você é o Diretor de Arte (QA rigoroso).
              Analise a 1ª imagem (flyer gerado) vs a 2ª (logo do cliente).

              LISTA DE VERIFICAÇÃO:
              1. Texto falso: Tem "lorem ipsum", palavras distorcidas ou dashboard sem sentido? → REJEITAR
              2. Obstrução: Caixa de texto opaca cobre rosto ou produto principal gravemente? → REJEITAR
              3. Rodapé ausente: O texto "${context.copywriter?.footer}" não aparece legível na base do flyer? → REJEITAR
              4. Logo ausente: O logo do cliente (2ª imagem) não aparece no flyer? → REJEITAR
              5. Contaminação: Aparece nome, @ ou logo de outra marca que não "${context.project?.clientName}"? → REJEITAR

              Seja severo. Rejeite qualquer grau de "linguagem alienígena" visível na imagem.

              Retorne APENAS JSON válido:
              {
                "status": "approved" ou "rejected",
                "score": (1 a 10),
                "feedback": "'Aprovado' ou descreva O ERRO EXATO para o designer corrigir"
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
