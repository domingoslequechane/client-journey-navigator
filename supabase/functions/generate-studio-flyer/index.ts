import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const AI_MODELS = {
  "gemini-flash": "gemini-2.5-flash-image",
  "gemini-pro": "gemini-3-pro-image-preview",
} as const;

const SIZE_CONFIG: Record<string, { aspectRatio: string; orientation: string; width: number; height: number }> = {
  "1080x1080": { aspectRatio: "1:1", orientation: "Quadrado", width: 1080, height: 1080 },
  "1080x1920": { aspectRatio: "9:16", orientation: "Retrato (Stories)", width: 1080, height: 1920 },
  "1920x1080": { aspectRatio: "16:9", orientation: "Paisagem (Banner)", width: 1920, height: 1080 },
  "1080x1350": { aspectRatio: "4:5", orientation: "Retrato (Carrossel)", width: 1080, height: 1350 },
  "1280x720": { aspectRatio: "16:9", orientation: "YouTube Thumbnail", width: 1280, height: 720 },
};

// Compact niche intelligence - focused keywords only
const NICHE_STYLE: Record<string, string> = {
  'Construção': 'Industrial: 3D cement bags, bricks, steel rebars. Orange+Charcoal palette. Strong dramatic lighting.',
  'Mobiliário': 'Luxury furniture: wood grain, velvet sofas, warm ambient lighting. Brown+Gold+Cream palette.',
  'Automóvel': 'Automotive: metallic paint, chrome rims, motion blur. Black+Orange/Red palette.',
  'Imobiliário': 'Real estate: modern buildings, luxury interiors, golden keys. Navy+Gold+White palette.',
  'Restaurante': 'Food: gourmet dishes with steam, dark moody backgrounds. Red+Gold+Dark Wood palette.',
  'Beleza': 'Beauty: cosmetics, skincare bottles with droplets, soft lighting. Rose Gold+Pink+White palette.',
  'Saúde': 'Medical: clean clinical look, stethoscopes, trustworthy. Blue+White+Green palette.',
  'Tecnologia': 'Tech: smartphones, neon reflections, dark environments. Black+Electric Blue/Purple palette.',
  'Moda': 'Fashion: editorial style, fabric textures, dramatic lighting. Black+White+bold accent palette.',
  'Fitness': 'Sports: gym equipment, high contrast, dynamic angles. Black+Red/Orange palette.',
  'Pet Shop': 'Pet: colorful toys, warm friendly photography. Orange+Blue+Green palette.',
  'Agricultura': 'Agriculture: tractors, golden fields, natural sunlight. Green+Brown+Gold palette.',
  'Ótica': 'Optical: designer eyeglasses, lens reflections, sharp focus. Navy+Silver+White palette.',
  'Farmácia': 'Pharmacy: clean packaging, health supplements, bright whites. Green+White+Blue palette.',
  'Joalharia': 'Jewelry: gold rings, diamonds, dramatic spotlighting. Black+Gold+White palette.',
  'Eventos': 'Events: elegant decorations, bokeh lights, celebration mood. Gold+Black+White palette.',
  'Educação': 'Education: books, graduation caps, warm library lighting. Navy+Gold+White palette.',
};

// Concise design system core - optimized for token efficiency
function buildCoreInstructions(sizeConfig: typeof SIZE_CONFIG[string], hasReferences: boolean = false, hasLogos: boolean = false): string {
  let core = `You are an elite Brazilian graphic designer creating a premium commercial flyer (${sizeConfig.width}×${sizeConfig.height}px, ${sizeConfig.aspectRatio}).

MANDATORY DESIGN RULES:
1. DEPTH LAYERS: textured/dark background → bold geometric shapes (circles, rounded rectangles, diagonal color blocks) → hero 3D product → text overlay → accent light effects
2. HERO PRODUCT: Must be a photorealistic 3D render (NOT illustration, NOT flat, NOT cartoon). 40-60% of canvas. Studio lighting: key light + fill light + rim light. Slightly angled for dramatic 3D effect. Realistic shadows and reflections.
3. GEOMETRIC ELEMENTS: Large bold shapes inspired by top Brazilian design agencies — overlapping circles, rounded rectangle cards, diagonal color stripes. These create visual structure and depth.
4. TYPOGRAPHY: Ultra-bold Impact/Montserrat headline → medium weight subhead → bold CTA/price badge → clean contact info with small icons (phone, email, location)
5. COLORS: Max 3-4 colors with high contrast. Dark/textured backgrounds for premium feel. Color accent blocks behind text for readability.
6. FINISHING: Subtle grain texture, vignette edges, directional light rays/glows, consistent shadow direction. Premium agency quality.
7. ABSOLUTE RULES: NO AI artifacts. NO cartoon/illustration style. NO flat design. ALL products must look like real 3D photographs. All text sharp, readable, correctly spelled, never cut off.`;

  if (hasLogos) {
    core += `\n8. COMPANY LOGO: One or more of the attached images is the company LOGO. You MUST place the logo prominently on the flyer (top-left or top-center, ~10-15% of canvas width). The logo must be clearly visible, never cropped, never distorted, never omitted. It is MANDATORY to include the logo in the final output.`;
  }

  if (hasReferences) {
    core += `\n\n⚠️ REFERENCE IMAGES ATTACHED: Study the attached reference image(s) carefully. They define the QUALITY BAR and VISUAL STYLE you must match or exceed. Analyze their: composition, 3D product rendering style, geometric shapes, color palette, typography weight, background treatment, and overall professional finish. Your output must be AT LEAST as polished and impactful as these references.`;
  }

  return core;
}

// Helper: build mandatory brand config block
function buildMandatoryBrandConfig(params: {
  colors?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiRestrictions?: string;
  hasLogos?: boolean;
}): string {
  const { colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos } = params;
  let block = '';

  if (colors === 'Cores do Cliente' && (primaryColor || secondaryColor)) {
    block += `\n\nMANDATORY BRAND COLORS (non-negotiable):
- Primary: ${primaryColor || 'auto'} — use as the DOMINANT color (backgrounds, large shapes, accents). This MUST be the most visible color.
- Secondary: ${secondaryColor || 'auto'} — use as SUPPORTING color (badges, highlights, contrast elements, CTA buttons).
Do NOT invent other color schemes. Do NOT ignore these colors. These brand colors define the visual identity and MUST be followed.`;
  }

  if (fontFamily) {
    block += `\nMANDATORY FONT STYLE: ${fontFamily}. All headlines and text MUST reflect this typeface personality and weight. Do NOT use a different font.`;
  }

  if (aiInstructions) {
    block += `\n\nCREATIVE DIRECTOR ORDERS (must follow exactly — these are direct orders from the client):\n${aiInstructions}`;
  }

  if (aiRestrictions) {
    block += `\n\nABSOLUTE PROHIBITIONS (violating ANY of these = complete failure):\n${aiRestrictions}`;
  }

  return block;
}

// Helper: build final checklist
function buildFinalChecklist(params: {
  hasLogos?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  colors?: string;
}): string {
  const { hasLogos, primaryColor, secondaryColor, fontFamily, aiInstructions, colors } = params;
  let checklist = '\n\nFINAL CHECKLIST — your output MUST satisfy ALL of these requirements:';
  if (hasLogos) checklist += '\n✓ Company logo placed prominently (top-left or top-center, clearly visible)';
  if (colors === 'Cores do Cliente') {
    if (primaryColor) checklist += `\n✓ Primary color ${primaryColor} is the DOMINANT color`;
    if (secondaryColor) checklist += `\n✓ Secondary color ${secondaryColor} is visible as accent`;
  }
  if (fontFamily) checklist += `\n✓ ${fontFamily} typography style used for all text`;
  checklist += '\n✓ Photorealistic 3D product rendering (NOT flat, NOT cartoon, NOT illustrated)';
  checklist += '\n✓ Premium Brazilian agency quality with depth layers';
  if (aiInstructions) checklist += '\n✓ Creative director orders followed exactly';
  return checklist;
}

// Mode-specific prompt builders (concise versions)
function buildOriginalPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  mood?: string;
  colors?: string;
  elements?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiRestrictions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
  hasReferences?: boolean;
  hasLogos?: boolean;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors, elements,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiRestrictions, aiMemoryContext, clientContext, hasReferences, hasLogos } = params;

  let p = buildCoreInstructions(sizeConfig, hasReferences, hasLogos);

  if (hasReferences) {
    p += `\n\nMODE: Original creation guided by references — Create a 100% unique design but MATCH the visual quality, 3D rendering style, composition complexity, and professional finish of the attached reference image(s). The references are your quality standard.`;
  } else {
    p += `\n\nMODE: Original creation — 100% unique, bold, innovative design.`;
  }
  
  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry style: ${NICHE_STYLE[niche]}`;
  if (mood) p += `\nMood: ${mood}`;
  if (elements) p += `\nHero element: ${elements}`;

  // Mandatory brand configurations
  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (colors === 'Aleatórias (IA escolhe)') {
    p += `\nColors: Choose a harmonious high-impact palette for this industry.`;
  }

  if (clientContext) p += `\nClient info: ${clientContext}`;
  if (aiMemoryContext) p += `\nLearned preferences: ${aiMemoryContext}`;

  p += `\n\nFLYER TEXT CONTENT (render ONLY this on the flyer):\n${prompt}`;
  p += `\n\nCreate a jaw-dropping, scroll-stopping, high-conversion commercial flyer. The product MUST be a photorealistic 3D render with studio lighting — NOT flat, NOT illustrated. Premium Brazilian agency quality.`;

  // Final checklist
  p += buildFinalChecklist({ hasLogos, primaryColor, secondaryColor, fontFamily, aiInstructions, colors });

  return p;
}

function buildCopyPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  niche?: string;
  clientContext?: string;
}): string {
  const { prompt, sizeConfig, niche, clientContext } = params;

  let p = buildCoreInstructions(sizeConfig, true);

  p += `\n\nMODE: Template replication — COPY the first reference image EXACTLY.
Copy pixel-perfect: layout grid, spacing, colors, typography style, geometric shapes, decorative elements, 3D product rendering style.
Replace ONLY: product/subject image and text content with what's specified below.`;

  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (clientContext) p += `\nClient: ${clientContext}`;

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nReplicate the template EXACTLY. Only differences: product image and text. Photorealistic 3D quality.`;

  return p;
}

function buildInspirationPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  mood?: string;
  colors?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiRestrictions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
  referenceCount: number;
  hasLogos?: boolean;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions,
    aiMemoryContext, clientContext, referenceCount, hasLogos } = params;

  let p = buildCoreInstructions(sizeConfig, true, hasLogos);

  p += `\n\nMODE: Creative inspiration — Study the ${referenceCount} reference image(s) carefully. Absorb their 3D product rendering, composition, geometric shapes, color palette, and professional finish. Then create something ORIGINAL that SURPASSES them in quality and impact.`;

  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (mood) p += `\nMood: ${mood}`;

  // Mandatory brand configurations
  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nCreate an original masterpiece inspired by the references. Match their 3D photorealistic quality. Surpass them in impact.`;

  // Final checklist
  p += buildFinalChecklist({ hasLogos, primaryColor, secondaryColor, fontFamily, aiInstructions, colors });

  return p;
}

function buildProductPreservationPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiRestrictions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
  hasLogos?: boolean;
  colors?: string;
}): string {
  const { prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, aiMemoryContext, clientContext, hasLogos, colors } = params;

  let p = buildCoreInstructions(sizeConfig, true, hasLogos);

  p += `\n\nMODE: Product preservation (IMAGE EDITING TASK)
CRITICAL RULE: The attached image contains the EXACT product to advertise.
You MUST keep this product 100% IDENTICAL — same shape, color, texture, labels, logos, and packaging.
Do NOT substitute it with any other product. Do NOT reinterpret, reimagine, or redraw it.
Do NOT generate a similar-looking product. The product in the attached image is the ONLY product allowed.
Your task: Extract the product from the attached image and design a professional flyer AROUND it.
Only create/modify: background, geometric shapes, text layout, lighting effects, decorative elements.
The product itself is UNTOUCHABLE — treat it as a sacred, immutable element.
PRODUCT DESCRIPTION (from user): "${prompt}"`;

  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;

  // Mandatory brand configurations
  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  p += `\n\nFLYER TEXT CONTENT (render this text on the flyer):\n${prompt}`;
  p += `\n\nDesign a premium flyer AROUND the preserved product. The product from the image must appear EXACTLY as-is. Bold geometric background, premium agency quality.`;

  // Final checklist
  p += buildFinalChecklist({ hasLogos, primaryColor, secondaryColor, fontFamily, aiInstructions, colors });

  return p;
}

function buildTemplateMemoryPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiRestrictions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
  hasProductImage: boolean;
  hasLogos?: boolean;
  colors?: string;
}): string {
  const { prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, 
    aiInstructions, aiRestrictions, aiMemoryContext, clientContext, hasProductImage, hasLogos, colors } = params;

  let p = buildCoreInstructions(sizeConfig, true, hasLogos);

  p += `\n\nMODE: Strict template replication — The FIRST reference image is the approved template.
Copy pixel-perfect: logo position, typography, colors, geometric shapes, layout grid, footer structure.
Replace ONLY: product image${hasProductImage ? ' (use SECOND image)' : ''} and text content.`;

  if (clientName) p += `\nClient: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;

  // Mandatory brand configurations
  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient info: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nGenerate visually IDENTICAL to template. Only product and text differ.`;

  // Final checklist
  p += buildFinalChecklist({ hasLogos, primaryColor, secondaryColor, fontFamily, aiInstructions, colors });

  return p;
}

function buildClientContext(client: Record<string, unknown> | null): string {
  if (!client) return '';
  const parts: string[] = [];
  if (client.company_name) parts.push(`${client.company_name}`);
  if (client.services && Array.isArray(client.services) && client.services.length > 0) {
    parts.push(`Services: ${client.services.join(', ')}`);
  }
  if (client.notes) parts.push(`Notes: ${String(client.notes).substring(0, 150)}`);
  return parts.join(' | ');
}

// Safety settings to prevent overly cautious blocking
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

// Fetch and encode an image URL to inline data
async function fetchImageAsInlineData(
  imgUrl: string,
  index: number
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

  try {
    if (imgUrl.startsWith('data:')) {
      const matches = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return { inlineData: { mimeType: matches[1], data: matches[2] } };
      }
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const imgResp = await fetch(imgUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'image/png, image/jpeg, image/webp, image/gif, */*' }
      });
      clearTimeout(timeoutId);

      if (!imgResp.ok) return null;

      let contentType = imgResp.headers.get('content-type') || 'image/png';
      contentType = contentType.split(';')[0].trim().toLowerCase();

      if (!SUPPORTED_MIME_TYPES.includes(contentType)) {
        console.warn(`Image ${index + 1}: Unsupported MIME (${contentType}). Skipping.`);
        return null;
      }

      const imgBuffer = await imgResp.arrayBuffer();
      if (imgBuffer.byteLength > 4 * 1024 * 1024) {
        console.log(`Image ${index + 1}: Skipped - too large (${(imgBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
        return null;
      }

      const uint8Array = new Uint8Array(imgBuffer);
      let base64 = '';
      const chunkSize = 8192;
      for (let j = 0; j < uint8Array.length; j += chunkSize) {
        const chunk = uint8Array.slice(j, j + chunkSize);
        base64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      base64 = btoa(base64);

      console.log(`Image ${index + 1}: Added (${contentType}, ${(imgBuffer.byteLength / 1024).toFixed(0)}KB)`);
      return { inlineData: { mimeType: contentType, data: base64 } };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error(`Image ${index + 1}: Fetch error - ${fetchErr}`);
      return null;
    }
  } catch (e) {
    console.error(`Error processing image ${index + 1}:`, e);
    return null;
  }
}

// Call Gemini API with retry logic
async function callGeminiWithRetry(
  model: string,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  apiKey: string,
  maxRetries: number = 2,
  isProductMode: boolean = false
): Promise<{ imageData: string; mimeType: string } | { error: string; status: number; response?: unknown }> {
  
  // Separate text and image parts for retry logic
  const textParts = parts.filter(p => 'text' in p);
  const imageParts = parts.filter(p => 'inlineData' in p);
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const isRetry = attempt > 0;
    
    let currentParts = parts;
    if (isRetry) {
      console.log(`Retry attempt ${attempt}: simplifying request...`);
      const textPart = textParts[0] as { text: string } | undefined;
      
      if (textPart) {
        if (attempt === 1) {
          // First retry: keep everything, just retry
          currentParts = parts;
        } else {
          // Second retry: simplify text
          if (isProductMode && imageParts.length > 0) {
            // PRODUCT MODE: NEVER drop the product image — only simplify text
            const simplifiedText = `Create a professional commercial flyer featuring the EXACT product shown in the attached image. 
Keep the product 100% identical. Design only the background and text layout around it.
Text content: ${textPart.text.match(/FLYER TEXT CONTENT[^\n]*\n([\s\S]*?)(?:\n\n|$)/)?.[1] || textPart.text.substring(textPart.text.length - 200)}`;
            currentParts = [{ text: simplifiedText }, ...imageParts];
            console.log("Product mode retry: simplified text but KEPT product image");
          } else {
            // Non-product mode: drop images, simplify text
            const simplifiedText = textPart.text
              .replace(/DESIGN RULES:[\s\S]*?NO AI artifacts[^\n]*\n/g, 
                'Create a professional, photorealistic commercial flyer. Premium agency quality. Bold geometric design with depth.\n')
              .substring(0, 800);
            currentParts = [{ text: simplifiedText }];
            console.log("Retry with simplified prompt (no images), length:", simplifiedText.length);
          }
        }
      }
    }

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: currentParts }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              maxOutputTokens: 8192,
            },
            safetySettings: SAFETY_SETTINGS,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error (attempt ${attempt}):`, response.status, errorText);

        if (response.status === 429) {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          return { error: "Rate limit exceeded. Please try again in a moment.", status: 429 };
        }

        if (response.status === 403 || response.status === 401) {
          return { error: "API authentication error. Check API key.", status: 500 };
        }

        if (attempt < maxRetries) continue;
        return { error: "Failed to generate image", status: 500 };
      }

      const data = await response.json();
      console.log(`Gemini response (attempt ${attempt}):`, 
        JSON.stringify({
          blockReason: data?.promptFeedback?.blockReason,
          finishReason: data?.candidates?.[0]?.finishReason,
          hasContent: !!data?.candidates?.[0]?.content?.parts,
          partsCount: data?.candidates?.[0]?.content?.parts?.length,
        })
      );

      // Check for blocked response
      if (data?.promptFeedback?.blockReason) {
        console.warn(`Blocked (attempt ${attempt}): ${data.promptFeedback.blockReason}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        
        // For product mode, give a specific error since we can't generate without the product
        if (isProductMode) {
          return { error: "A imagem do produto foi bloqueada pela IA. Tente com uma imagem diferente do produto.", status: 500, response: data };
        }
        return { error: "Image generation was blocked. Try a different prompt.", status: 500, response: data };
      }

      // Extract image
      const responseParts = data?.candidates?.[0]?.content?.parts;
      if (Array.isArray(responseParts)) {
        for (const part of responseParts) {
          const inline = part?.inlineData ?? part?.inline_data;
          if (inline?.data && (inline?.mimeType || inline?.mime_type)) {
            const mimeType = inline?.mimeType ?? inline?.mime_type;
            return { imageData: inline.data, mimeType };
          }
        }
      }

      // No image found
      console.warn(`No image in response (attempt ${attempt})`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      return { error: "No image generated. Try simplifying your prompt.", status: 500, response: data };
    } catch (fetchError) {
      console.error(`Fetch error (attempt ${attempt}):`, fetchError);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return { error: "Network error communicating with AI", status: 500 };
    }
  }

  return { error: "All retry attempts failed", status: 500 };
}

// ==========================================
// API HANDLER
// ==========================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);

    if (claimsError || !claimsData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;

    const {
      projectId, prompt, size = '1080x1080', style = 'vivid',
      mode = 'original', model = 'gemini-flash', niche, mood,
      colors, elements, preserveProduct = false,
      productImage,
      layoutReferences = [], additionalReferences = [],
    } = await req.json();

    if (!projectId || !prompt) {
      return new Response(JSON.stringify({ error: "projectId and prompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project
    const { data: project, error: projectError } = await supabase
      .from("studio_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      console.error("Project error:", projectError);
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch client context
    let clientContext = "";
    if (project.client_id) {
      try {
        const { data: clientData } = await supabase
          .from('clients')
          .select('company_name, contact_name, services, website, source, notes')
          .eq('id', project.client_id)
          .single();
        if (clientData) {
          clientContext = buildClientContext(clientData as Record<string, unknown>);
        }
      } catch (e) {
        console.error("Error fetching client:", e);
      }
    }

    // Fetch AI learning history
    let aiMemoryContext = "";
    try {
      const { data: learnings } = await supabase
        .from('studio_ai_learnings')
        .select('content, learning_type')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (learnings && learnings.length > 0) {
        aiMemoryContext = learnings.map(l => `[${l.learning_type}]: ${l.content}`).join('; ');
        // Keep memory context concise
        if (aiMemoryContext.length > 500) {
          aiMemoryContext = aiMemoryContext.substring(0, 500);
        }
      }
    } catch (e) {
      console.error("Error fetching learnings:", e);
    }

    const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG["1080x1080"];
    const finalMode = preserveProduct ? 'product' : mode;

    // Determine if project has reference images available
    const projectHasReferences = (project.reference_images && project.reference_images.length > 0) 
      || layoutReferences.length > 0 || additionalReferences.length > 0;

    // Determine if project has logo images
    const hasLogos = !!(project.logo_images && project.logo_images.length > 0);
    console.log("Project logos:", hasLogos ? project.logo_images.length : 0);

    // Build prompt
    const baseParams = {
      prompt, sizeConfig,
      clientName: project.name,
      niche: niche || project.niche,
      primaryColor: project.primary_color,
      secondaryColor: project.secondary_color,
      fontFamily: project.font_family,
      aiInstructions: project.ai_instructions,
      aiMemoryContext,
      clientContext,
      hasLogos,
      colors,
    };

    let enhancedPrompt: string;

    switch (finalMode) {
      case 'template':
        enhancedPrompt = buildTemplateMemoryPrompt({
          ...baseParams,
          hasProductImage: additionalReferences.length > 0 || (project.reference_images?.length || 0) > 1,
        });
        break;
      case 'copy':
        enhancedPrompt = buildCopyPrompt({
          prompt, sizeConfig,
          niche: niche || project.niche,
          clientContext,
        });
        break;
      case 'inspiration': {
        const allRefs = [...layoutReferences, ...additionalReferences, ...(project.reference_images || [])];
        enhancedPrompt = buildInspirationPrompt({
          ...baseParams,
          mood,
          aiRestrictions: project.ai_restrictions,
          referenceCount: allRefs.length || 1,
        });
        break;
      }
      case 'product':
        enhancedPrompt = buildProductPreservationPrompt({
          ...baseParams,
          aiRestrictions: project.ai_restrictions,
        });
        break;
      case 'original':
      default:
        enhancedPrompt = buildOriginalPrompt({
          ...baseParams,
          mood, elements,
          aiRestrictions: project.ai_restrictions,
          hasReferences: projectHasReferences,
        });
        break;
    }

    // Select model
    const selectedModel = (finalMode === 'product' || finalMode === 'template' || model === 'gemini-pro')
      ? AI_MODELS["gemini-pro"]
      : AI_MODELS["gemini-flash"];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== GENERATING FLYER ===");
    console.log("Mode:", finalMode, "| Model:", selectedModel, "| Client:", project.name);
    console.log("Size:", size, "| Prompt length:", enhancedPrompt.length, "chars");

    // Build content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: enhancedPrompt }
    ];

    // Collect reference images
    const allReferenceImages: string[] = [];
    
    // Product image gets ABSOLUTE PRIORITY in product mode
    if (finalMode === 'product' && productImage) {
      allReferenceImages.push(productImage);
      console.log("Product mode: product image added as PRIMARY reference");
    }
    
    if (finalMode === 'template' && project.template_image) {
      allReferenceImages.push(project.template_image);
    }
    
    // In product mode, ONLY use the product image — no other references that could confuse the AI
    if (finalMode !== 'product') {
      allReferenceImages.push(...layoutReferences);
      allReferenceImages.push(...additionalReferences);
      if (project.reference_images) {
        allReferenceImages.push(...project.reference_images);
      }
    }

    // ALWAYS include logo images in ALL modes — logos are mandatory
    const logoCount = (project.logo_images && project.logo_images.length > 0) 
      ? Math.min(project.logo_images.length, 2) : 0;
    if (logoCount > 0) {
      const logosToAdd = project.logo_images.slice(0, 2);
      allReferenceImages.push(...logosToAdd);
      console.log(`Added ${logosToAdd.length} logo image(s) to reference images`);
    }

    // Limit images: product mode gets 1 product + logos, others get up to 2 refs + logos
    const maxImages = finalMode === 'product' ? (1 + logoCount) : (2 + logoCount);
    const imagesToProcess = allReferenceImages.slice(0, maxImages);

    console.log("Reference images:", imagesToProcess.length);

    // Fetch all images in parallel
    const imageResults = await Promise.all(
      imagesToProcess.map((url, i) => fetchImageAsInlineData(url, i))
    );

    for (const result of imageResults) {
      if (result) parts.push(result);
    }

    // Call Gemini with retry logic
    const result = await callGeminiWithRetry(selectedModel, parts, GEMINI_API_KEY, 2, finalMode === 'product');

    if ('error' in result) {
      return new Response(JSON.stringify({
        error: result.error,
        ...(result.response ? { response: result.response } : {}),
      }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const { imageData, mimeType } = result;
    const extension = mimeType.split("/")[1] || "png";
    const imageBuffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const fileName = `flyers/${projectId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("studio-assets")
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("studio-assets")
      .getPublicUrl(fileName);

    // Save flyer record
    const { data: flyer, error: flyerError } = await supabase
      .from("studio_flyers")
      .insert({
        project_id: projectId,
        organization_id: project.organization_id,
        created_by: userId,
        prompt,
        image_url: publicUrl,
        size: size || "1080x1080",
        style: style || "vivid",
        niche: niche || project.niche,
        model: selectedModel,
        generation_mode: finalMode,
      })
      .select()
      .single();

    if (flyerError) {
      console.error("Flyer save error:", flyerError);
      return new Response(JSON.stringify({ error: "Failed to save flyer record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Flyer generated successfully:", flyer.id);

    return new Response(JSON.stringify({
      success: true,
      flyer,
      imageUrl: publicUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate flyer error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
