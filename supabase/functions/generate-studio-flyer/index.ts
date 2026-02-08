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
  // Text-only model for analysis layers (no image generation needed)
  "gemini-flash-text": "gemini-2.5-flash",
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
  const { colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions } = params;
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
  designBrief?: DesignBrief | null;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors, elements,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiRestrictions, aiMemoryContext, clientContext, hasReferences, hasLogos, designBrief } = params;

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

  // Inject Art Director's design brief if available
  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

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
  designBrief?: DesignBrief | null;
}): string {
  const { prompt, sizeConfig, niche, clientContext, designBrief } = params;

  let p = buildCoreInstructions(sizeConfig, true);

  p += `\n\nMODE: Template replication — COPY the first reference image EXACTLY.
Copy pixel-perfect: layout grid, spacing, colors, typography style, geometric shapes, decorative elements, 3D product rendering style.
Replace ONLY: product/subject image and text content with what's specified below.`;

  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (clientContext) p += `\nClient: ${clientContext}`;

  // Inject Art Director's design brief if available
  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

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
  designBrief?: DesignBrief | null;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions,
    aiMemoryContext, clientContext, referenceCount, hasLogos, designBrief } = params;

  let p = buildCoreInstructions(sizeConfig, true, hasLogos);

  p += `\n\nMODE: Creative inspiration — Study the ${referenceCount} reference image(s) carefully. Absorb their 3D product rendering, composition, geometric shapes, color palette, typography weight, background treatment, and professional finish. Then create something ORIGINAL that SURPASSES them in quality and impact.`;

  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;
  if (mood) p += `\nMood: ${mood}`;

  // Mandatory brand configurations
  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  // Inject Art Director's design brief if available
  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

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
  allowManipulation?: boolean;
  designBrief?: DesignBrief | null;
}): string {
  const { prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, aiMemoryContext, clientContext, hasLogos, colors, allowManipulation, designBrief } = params;

  let p = buildCoreInstructions(sizeConfig, true, hasLogos);

  if (allowManipulation) {
    p += `\n\nMODE: Product-based creative design (IMAGE EDITING TASK WITH MANIPULATION ALLOWED)
The attached image contains the product to advertise. You MUST use THIS EXACT product as the hero element.
MANIPULATION PERMITTED: You are allowed to creatively manipulate the product — adjust lighting, change angles, add dramatic effects, reflections, shadows, or 3D transformations. The product should remain RECOGNIZABLE (same brand, same packaging, same core identity) but you have creative freedom to make it look MORE impressive, dramatic, and professional.
Your task: Use the product from the attached image as the hero, manipulate it creatively for maximum visual impact, and design a premium flyer around it.`;
  } else {
    p += `\n\nMODE: Product preservation (IMAGE EDITING TASK)
CRITICAL RULE: The attached image contains the EXACT product to advertise.
You MUST keep this product 100% IDENTICAL — same shape, color, texture, labels, logos, and packaging.
Do NOT substitute it with any other product. Do NOT reinterpret, reimagine, or redraw it.
Do NOT generate a similar-looking product. The product in the attached image is the ONLY product allowed.
Your task: Extract the product from the attached image and design a professional flyer AROUND it.
Only create/modify: background, geometric shapes, text layout, lighting effects, decorative elements.
The product itself is UNTOUCHABLE — treat it as a sacred, immutable element.`;
  }

  p += `\nPRODUCT DESCRIPTION (from user): "${prompt}"`;

  if (clientName) p += `\nBrand: ${clientName}`;
  if (niche && NICHE_STYLE[niche]) p += `\nIndustry: ${NICHE_STYLE[niche]}`;

  // Mandatory brand configurations
  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  // Inject Art Director's design brief if available
  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

  p += `\n\nFLYER TEXT CONTENT (render this text on the flyer):\n${prompt}`;
  
  if (allowManipulation) {
    p += `\n\nDesign a premium flyer with the product as hero. You may creatively enhance the product's appearance (lighting, angle, effects) while maintaining its identity. Bold geometric background, premium agency quality.`;
  } else {
    p += `\n\nDesign a premium flyer AROUND the preserved product. The product from the image must appear EXACTLY as-is. Bold geometric background, premium agency quality.`;
  }

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
  designBrief?: DesignBrief | null;
}): string {
  const { prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, 
    aiInstructions, aiRestrictions, aiMemoryContext, clientContext, hasProductImage, hasLogos, colors, designBrief } = params;

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

  // Inject Art Director's design brief if available
  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

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

// ==========================================
// LAYER 1: ART DIRECTOR — Analyze references and build a design brief
// ==========================================

interface DesignBrief {
  layout_description: string;
  color_plan: string;
  typography_plan: string;
  background_treatment: string;
  geometric_elements: string;
  logo_placement: string;
  quality_notes: string;
  template_layout?: string; // For copy/template modes — exact positions
}

function buildDesignBriefSection(brief: DesignBrief): string {
  let section = `\n\n=== ART DIRECTOR'S DESIGN BRIEF (follow this precisely) ===`;
  section += `\nLAYOUT: ${brief.layout_description}`;
  section += `\nCOLOR PLAN: ${brief.color_plan}`;
  section += `\nTYPOGRAPHY: ${brief.typography_plan}`;
  section += `\nBACKGROUND: ${brief.background_treatment}`;
  section += `\nGEOMETRIC ELEMENTS: ${brief.geometric_elements}`;
  section += `\nLOGO PLACEMENT: ${brief.logo_placement}`;
  if (brief.template_layout) {
    section += `\nTEMPLATE LAYOUT POSITIONS: ${brief.template_layout}`;
  }
  section += `\nQUALITY BENCHMARK: ${brief.quality_notes}`;
  section += `\n=== END BRIEF ===`;
  return section;
}

async function analyzeReferencesAndBuildBrief(
  apiKey: string,
  imageParts: Array<{ inlineData: { mimeType: string; data: string } }>,
  config: {
    mode: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    niche?: string;
    prompt: string;
    sizeConfig: typeof SIZE_CONFIG[string];
    aiInstructions?: string;
    aiRestrictions?: string;
    hasLogos: boolean;
  }
): Promise<DesignBrief | null> {
  if (imageParts.length === 0) {
    console.log("Layer 1 (Art Director): No reference images, skipping analysis");
    return null;
  }

  console.log("=== LAYER 1: ART DIRECTOR — Analyzing references ===");
  const startTime = Date.now();

  const isCopyOrTemplate = config.mode === 'copy' || config.mode === 'template';

  const analysisPrompt = `You are a Senior Art Director at a top Brazilian design agency. Analyze the attached reference image(s) and produce a precise design brief for your designer team.

CONTEXT:
- Final flyer size: ${config.sizeConfig.width}×${config.sizeConfig.height}px (${config.sizeConfig.aspectRatio})
- Generation mode: ${config.mode}
- Industry/Niche: ${config.niche || 'General'}
- Brand primary color: ${config.primaryColor || 'not set'}
- Brand secondary color: ${config.secondaryColor || 'not set'}
- Font family: ${config.fontFamily || 'not set'}
- Has company logos attached: ${config.hasLogos ? 'YES — one or more images are the company logo' : 'NO'}
- User prompt: "${config.prompt}"
${config.aiInstructions ? `- Client creative orders: ${config.aiInstructions}` : ''}
${config.aiRestrictions ? `- Client restrictions: ${config.aiRestrictions}` : ''}

${isCopyOrTemplate ? `COPY/TEMPLATE MODE — You MUST analyze the reference image as an EXACT TEMPLATE to replicate. Map every element position precisely: where the logo sits, where headlines go, where the product is placed, footer structure, badge positions, etc. The designer will need to replicate this layout pixel-perfect.` : `INSPIRATION/ORIGINAL MODE — Analyze the references for quality benchmarks, style cues, and design patterns to inspire an original creation that matches or exceeds their quality.`}

Respond with a JSON object using EXACTLY these keys (all values must be strings):
{
  "layout_description": "Precise description of element placement — where the hero product goes (position, size relative to canvas), where headline text sits, subhead position, CTA/price badge location, contact info strip location, and overall grid/flow",
  "color_plan": "Which colors are used where — background color/gradient, shape fill colors, text colors, accent/highlight colors. Map each area to a specific color",
  "typography_plan": "Font sizes (relative: large/medium/small), weights (bold/regular/light), text alignment, headline style, subhead style, CTA style, and any decorative text effects",
  "background_treatment": "Exact description of background — solid color, gradient (direction + colors), texture type, pattern, image overlay, or combination",
  "geometric_elements": "All geometric shapes used — circles (position, size, color), rectangles (rounded?), diagonal stripes, overlapping shapes, decorative lines, their layering order",
  "logo_placement": "Where the company logo should be placed — position (top-left, top-center, etc.), approximate size relative to canvas, any effects (shadow, glow, border)",
  ${isCopyOrTemplate ? `"template_layout": "EXACT pixel-level mapping of every element: logo at [position] sized [X%], headline at [position] spanning [width], product centered at [position] taking [X%] of canvas, footer at bottom with [elements], badges/stickers at [position]",` : ''}
  "quality_notes": "Key quality benchmarks from the references — lighting quality, shadow realism, color vibrancy level, texture detail, overall polish level, specific techniques observed (glow effects, grain, reflections, etc.)"
}

IMPORTANT: Respond ONLY with the JSON object, no other text. Every value must be a detailed, actionable instruction string.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: analysisPrompt },
    ...imageParts,
  ];

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${AI_MODELS["gemini-flash-text"]}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          },
          safetySettings: SAFETY_SETTINGS,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Layer 1 error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      console.warn("Layer 1: No text response from model");
      return null;
    }

    // Parse the JSON response — handle potential markdown wrapping
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const brief: DesignBrief = JSON.parse(jsonStr);
    const elapsed = Date.now() - startTime;
    console.log(`Layer 1 (Art Director): Brief generated in ${elapsed}ms`);
    console.log("Brief keys:", Object.keys(brief).join(', '));
    
    return brief;
  } catch (e) {
    console.error("Layer 1 (Art Director) error:", e);
    return null; // Non-fatal — continue without brief
  }
}

// ==========================================
// LAYER 3: QUALITY CONTROL — Review generated flyer
// ==========================================

interface QualityReview {
  score: number;
  logo_present: boolean;
  colors_correct: boolean;
  layout_matches: boolean;
  text_readable: boolean;
  improvements: string[];
  pass: boolean;
}

async function reviewGeneratedFlyer(
  apiKey: string,
  generatedImageData: { inlineData: { mimeType: string; data: string } },
  referenceImageParts: Array<{ inlineData: { mimeType: string; data: string } }>,
  config: {
    designBrief: DesignBrief | null;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    hasLogos: boolean;
    mode: string;
    prompt: string;
    preserveProduct: boolean;
  }
): Promise<QualityReview | null> {
  console.log("=== LAYER 3: QUALITY CONTROL — Reviewing generated flyer ===");
  const startTime = Date.now();

  let reviewPrompt = `You are a Quality Control specialist at a premium design agency. Compare the FIRST attached image (the generated flyer) against the REMAINING attached images (reference images) and the design brief below.

BRAND REQUIREMENTS TO VERIFY:
- Primary color: ${config.primaryColor || 'not specified'} (should be DOMINANT)
- Secondary color: ${config.secondaryColor || 'not specified'} (should be accent)
- Font style: ${config.fontFamily || 'not specified'}
- Company logo required: ${config.hasLogos ? 'YES — must be prominently visible' : 'NO'}
- Generation mode: ${config.mode}
- User's text content: "${config.prompt}"
${config.preserveProduct ? '- PRODUCT PRESERVATION: The product from the reference must appear IDENTICAL in the output' : ''}`;

  if (config.designBrief) {
    reviewPrompt += `\n\nART DIRECTOR'S BRIEF TO COMPARE AGAINST:
- Layout: ${config.designBrief.layout_description}
- Colors: ${config.designBrief.color_plan}
- Typography: ${config.designBrief.typography_plan}
- Background: ${config.designBrief.background_treatment}
- Geometric elements: ${config.designBrief.geometric_elements}
- Logo: ${config.designBrief.logo_placement}
${config.designBrief.template_layout ? `- Template layout: ${config.designBrief.template_layout}` : ''}`;
  }

  reviewPrompt += `\n\nScore the generated flyer from 1-10 and identify SPECIFIC, ACTIONABLE improvements.

Respond with a JSON object using EXACTLY these keys:
{
  "score": <number 1-10>,
  "logo_present": <boolean — is the company logo clearly visible?>,
  "colors_correct": <boolean — are brand colors dominant as required?>,
  "layout_matches": <boolean — does the layout match the brief/references?>,
  "text_readable": <boolean — is all text sharp, readable, and correctly placed?>,
  "improvements": [<array of specific actionable fix strings, max 5 items>],
  "pass": <boolean — true if score >= 8>
}

Be strict but fair. Focus on: logo presence, color accuracy, layout fidelity, text quality, 3D product realism, overall professional finish.
Respond ONLY with the JSON object.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: reviewPrompt },
    generatedImageData, // Generated flyer goes first
    ...referenceImageParts.slice(0, 2), // Max 2 reference images for comparison
  ];

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${AI_MODELS["gemini-flash-text"]}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1024,
          },
          safetySettings: SAFETY_SETTINGS,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Layer 3 error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      console.warn("Layer 3: No text response");
      return null;
    }

    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const review: QualityReview = JSON.parse(jsonStr);
    const elapsed = Date.now() - startTime;
    console.log(`Layer 3 (QC): Score ${review.score}/10, Pass: ${review.pass}, Time: ${elapsed}ms`);
    console.log(`  Logo: ${review.logo_present}, Colors: ${review.colors_correct}, Layout: ${review.layout_matches}, Text: ${review.text_readable}`);
    if (review.improvements.length > 0) {
      console.log(`  Improvements needed: ${review.improvements.join(' | ')}`);
    }

    return review;
  } catch (e) {
    console.error("Layer 3 (QC) error:", e);
    return null; // Non-fatal — treat as pass
  }
}

// ==========================================
// LAYER 4: RETOUCHER — Refine the generated flyer
// ==========================================

async function refineFlyer(
  apiKey: string,
  generatedImagePart: { inlineData: { mimeType: string; data: string } },
  referenceImageParts: Array<{ inlineData: { mimeType: string; data: string } }>,
  improvements: string[],
  config: {
    preserveProduct: boolean;
    primaryColor?: string;
    secondaryColor?: string;
    hasLogos: boolean;
  }
): Promise<{ imageData: string; mimeType: string } | null> {
  console.log("=== LAYER 4: RETOUCHER — Refining flyer ===");
  const startTime = Date.now();

  let refinePrompt = `You are a professional design retoucher. The FIRST attached image is a flyer that needs specific improvements. ${referenceImageParts.length > 0 ? 'The OTHER attached images are the reference/brand images to match.' : ''}

SPECIFIC IMPROVEMENTS TO APPLY (do ALL of these):
${improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

RULES:
- PRESERVE the overall layout and composition — this is a refinement, NOT a redesign
- Fix ONLY the issues listed above
- Keep all existing text content exactly as-is (same words, same placement)
- Maintain the existing 3D product rendering
${config.preserveProduct ? '- CRITICAL: Do NOT alter the product in any way — it must remain 100% identical' : ''}
${config.hasLogos ? '- Ensure the company logo is prominently visible (if missing, add it top-left or top-center)' : ''}
${config.primaryColor ? `- Primary brand color: ${config.primaryColor} (should be dominant)` : ''}
${config.secondaryColor ? `- Secondary brand color: ${config.secondaryColor} (accent)` : ''}

Output: The refined flyer image with all improvements applied. Same dimensions and orientation.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: refinePrompt },
    generatedImagePart,
    ...referenceImageParts.slice(0, 2),
  ];

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${AI_MODELS["gemini-pro"]}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            maxOutputTokens: 8192,
          },
          safetySettings: SAFETY_SETTINGS,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Layer 4 error:", response.status, errText);
      return null;
    }

    const data = await response.json();

    // Check for blocking
    if (data?.promptFeedback?.blockReason) {
      console.warn(`Layer 4: Blocked - ${data.promptFeedback.blockReason}`);
      return null;
    }

    // Extract refined image
    const responseParts = data?.candidates?.[0]?.content?.parts;
    if (Array.isArray(responseParts)) {
      for (const part of responseParts) {
        const inline = part?.inlineData ?? part?.inline_data;
        if (inline?.data && (inline?.mimeType || inline?.mime_type)) {
          const mimeType = inline?.mimeType ?? inline?.mime_type;
          const elapsed = Date.now() - startTime;
          console.log(`Layer 4 (Retoucher): Refinement complete in ${elapsed}ms`);
          return { imageData: inline.data, mimeType };
        }
      }
    }

    console.warn("Layer 4: No refined image in response");
    return null;
  } catch (e) {
    console.error("Layer 4 (Retoucher) error:", e);
    return null; // Non-fatal — use original image
  }
}

// ==========================================
// Call Gemini API with retry logic (Layer 2: Designer)
// ==========================================
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
// API HANDLER — 4-Layer Creative Team Pipeline
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
      productImage, allowManipulation = false,
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== 4-LAYER CREATIVE TEAM PIPELINE ===");
    console.log("Mode:", finalMode, "| Model:", model, "| Client:", project.name);
    console.log("Size:", size);

    // =====================================================
    // STEP 1: Collect and fetch ALL reference images upfront
    // =====================================================

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
      console.log(`Added ${logosToAdd.length} logo image(s)`);
    }

    // Limit images: product mode gets 1 product + logos, others get up to 3 refs + logos
    const maxImages = finalMode === 'product' ? (1 + logoCount) : (3 + logoCount);
    const imagesToProcess = allReferenceImages.slice(0, maxImages);

    console.log("Total reference images to fetch:", imagesToProcess.length);

    // Fetch all images in parallel (shared across all layers)
    const fetchedImageResults = await Promise.all(
      imagesToProcess.map((url, i) => fetchImageAsInlineData(url, i))
    );

    const validImageParts = fetchedImageResults.filter(
      (r): r is { inlineData: { mimeType: string; data: string } } => r !== null
    );
    console.log("Successfully fetched images:", validImageParts.length);

    // =====================================================
    // LAYER 1: ART DIRECTOR — Analyze references & build brief
    // =====================================================

    let designBrief: DesignBrief | null = null;

    // Only run Layer 1 if we have reference images to analyze
    if (validImageParts.length > 0) {
      designBrief = await analyzeReferencesAndBuildBrief(
        GEMINI_API_KEY,
        validImageParts,
        {
          mode: finalMode,
          primaryColor: project.primary_color,
          secondaryColor: project.secondary_color,
          fontFamily: project.font_family,
          niche: niche || project.niche,
          prompt,
          sizeConfig,
          aiInstructions: project.ai_instructions,
          aiRestrictions: project.ai_restrictions,
          hasLogos,
        }
      );
    }

    // =====================================================
    // LAYER 2: DESIGNER — Generate the flyer
    // =====================================================

    console.log("=== LAYER 2: DESIGNER — Generating flyer ===");

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
      designBrief, // Inject Art Director's brief
    };

    let enhancedPrompt: string;

    switch (finalMode) {
      case 'template':
        enhancedPrompt = buildTemplateMemoryPrompt({
          ...baseParams,
          aiRestrictions: project.ai_restrictions,
          hasProductImage: additionalReferences.length > 0 || (project.reference_images?.length || 0) > 1,
        });
        break;
      case 'copy':
        enhancedPrompt = buildCopyPrompt({
          prompt, sizeConfig,
          niche: niche || project.niche,
          clientContext,
          designBrief,
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
          allowManipulation,
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

    console.log("Prompt length:", enhancedPrompt.length, "chars | Model:", selectedModel);

    // Build content parts for Layer 2
    const generationParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: enhancedPrompt },
      ...validImageParts,
    ];

    // Call Gemini with retry logic (Layer 2)
    const generationResult = await callGeminiWithRetry(selectedModel, generationParts, GEMINI_API_KEY, 2, finalMode === 'product');

    if ('error' in generationResult) {
      return new Response(JSON.stringify({
        error: generationResult.error,
        ...(generationResult.response ? { response: generationResult.response } : {}),
      }), {
        status: generationResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Layer 2 (Designer): Flyer generated successfully");

    // =====================================================
    // LAYER 3: QUALITY CONTROL — Review the generated flyer
    // =====================================================

    let finalImageData = generationResult.imageData;
    let finalMimeType = generationResult.mimeType;

    // Only run QC if we have references to compare against
    if (validImageParts.length > 0) {
      const generatedImagePart = {
        inlineData: { mimeType: finalMimeType, data: finalImageData },
      };

      const review = await reviewGeneratedFlyer(
        GEMINI_API_KEY,
        generatedImagePart,
        validImageParts,
        {
          designBrief,
          primaryColor: project.primary_color,
          secondaryColor: project.secondary_color,
          fontFamily: project.font_family,
          hasLogos,
          mode: finalMode,
          prompt,
          preserveProduct: finalMode === 'product',
        }
      );

      // =====================================================
      // LAYER 4: RETOUCHER — Refine if QC failed
      // =====================================================

      if (review && !review.pass && review.improvements.length > 0) {
        console.log(`QC score ${review.score}/10 — triggering Layer 4 refinement`);

        const refinedResult = await refineFlyer(
          GEMINI_API_KEY,
          generatedImagePart,
          validImageParts,
          review.improvements,
          {
            preserveProduct: finalMode === 'product',
            primaryColor: project.primary_color,
            secondaryColor: project.secondary_color,
            hasLogos,
          }
        );

        if (refinedResult) {
          finalImageData = refinedResult.imageData;
          finalMimeType = refinedResult.mimeType;
          console.log("Layer 4: Using refined image");
        } else {
          console.log("Layer 4: Refinement failed, using original Layer 2 output");
        }
      } else if (review) {
        console.log(`QC score ${review.score}/10 — PASSED, skipping Layer 4 (early exit)`);
      } else {
        console.log("QC skipped (no review), using Layer 2 output directly");
      }
    } else {
      console.log("No reference images — skipping Layers 3 & 4");
    }

    // =====================================================
    // UPLOAD & SAVE — Same as before
    // =====================================================

    const extension = finalMimeType.split("/")[1] || "png";
    const imageBuffer = Uint8Array.from(atob(finalImageData), c => c.charCodeAt(0));
    const fileName = `flyers/${projectId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("studio-assets")
      .upload(fileName, imageBuffer, {
        contentType: finalMimeType,
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

    console.log("=== PIPELINE COMPLETE ===");
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
