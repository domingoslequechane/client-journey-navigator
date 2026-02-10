// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const AI_MODELS = {
  "gemini-flash": "gemini-2.5-flash-image",
  "gemini-pro": "gemini-3-pro-image-preview",
  "gemini-flash-text": "gemini-2.5-flash",
} as const;

const SIZE_CONFIG: Record<string, { aspectRatio: string; orientation: string; width: number; height: number }> = {
  "1080x1080": { aspectRatio: "1:1", orientation: "Quadrado", width: 1080, height: 1080 },
  "1080x1920": { aspectRatio: "9:16", orientation: "Retrato (Stories)", width: 1080, height: 1920 },
  "1920x1080": { aspectRatio: "16:9", orientation: "Paisagem (Banner)", width: 1920, height: 1080 },
  "1080x1350": { aspectRatio: "4:5", orientation: "Retrato (Carrossel)", width: 1080, height: 1350 },
  "1280x720": { aspectRatio: "16:9", orientation: "YouTube Thumbnail", width: 1280, height: 720 },
};

const NICHE_STYLE: Record<string, string> = {
  'Construção': 'Industrial Power: High-contrast 3D renders of heavy materials (cement, steel, bricks). Dramatic low-angle lighting. Palette: Safety Orange, Charcoal, and Concrete Gray. Textures: Scratched metal, rough concrete.',
  'Mobiliário': 'Minimalist Luxury: Soft, diffused studio lighting. Focus on textures (velvet, wood grain, marble). Palette: Earthy tones, Cream, Gold accents. Composition: Spacious, clean, high-end editorial feel.',
  'Automóvel': 'High-Speed Dynamic: Motion blur backgrounds, sharp metallic reflections, rim lighting to define curves. Palette: Deep Black, Electric Blue, or Racing Red. Textures: Carbon fiber, polished chrome.',
  'Imobiliário': 'Modern Living: Bright, airy, natural sunlight. Wide-angle perspectives. Palette: Navy Blue, Gold, Crisp White. Elements: Glass reflections, architectural blueprints, luxury keys.',
  'Restaurante': 'Gourmet Sensorial: Macro photography style. Steam effects, water droplets, vibrant colors. Palette: Warm Red, Deep Gold, Dark Wood. Lighting: Moody, spotlighting the dish.',
  'Beleza': 'Ethereal Glow: Soft-focus backgrounds, pearlescent textures, flawless lighting. Palette: Rose Gold, Pastel Pink, Silk White. Elements: Floating petals, liquid splashes, soft shadows.',
  'Saúde': 'Clinical Trust: Bright, high-key lighting. Clean, sterile environments. Palette: Medical Blue, Mint Green, Pure White. Elements: Soft gradients, glass textures, professional icons.',
  'Tecnologia': 'Cyber-Future: Neon glows, circuit patterns, dark glass reflections. Palette: Deep Black, Electric Purple, Cyan. Lighting: Backlit elements, digital bokeh.',
  'Moda': 'Editorial Edge: High-fashion photography style. Dramatic shadows, bold typography. Palette: Monochrome with one bold accent color. Textures: Fabric weaves, leather, silk.',
  'Fitness': 'Raw Energy: High-contrast, gritty textures, sweat droplets. Dynamic action angles. Palette: Black, Neon Yellow, or Fire Red. Lighting: Harsh side-lighting to define muscles/shapes.',
  'Pet Shop': 'Playful Warmth: Soft textures, bright friendly colors, bokeh backgrounds. Palette: Sunny Yellow, Sky Blue, Grass Green. Elements: Paw prints, floating bubbles, soft fur textures.',
  'Agricultura': 'Natural Abundance: Golden hour lighting, organic textures (soil, wheat, leaves). Palette: Deep Green, Harvest Gold, Earth Brown. Elements: Sun flares, dew drops.',
  'Ótica': 'Crystal Clarity: Sharp focus, lens flares, transparent textures. Palette: Navy, Silver, Crystal Clear. Lighting: Precise spotlights, reflections on glass.',
  'Farmácia': 'Wellness Balance: Clean, organized, trustworthy. Soft shadows. Palette: Health Green, Clean White, Trust Blue. Elements: Leaf motifs, soft gradients.',
  'Joalharia': 'Precious Brilliance: Macro focus on sparkle, caustic light effects, deep shadows. Palette: Velvet Black, Pure Gold, Diamond White. Lighting: Multiple tiny spotlights.',
  'Eventos': 'Celebration Spark: Bokeh lights, glitter, confetti, elegant gradients. Palette: Champagne Gold, Midnight Black, Pearl White. Lighting: Warm, festive, glowing.',
  'Educação': 'Academic Prestige: Classic textures (paper, old wood, leather). Warm library lighting. Palette: Oxford Blue, Burgundy, Parchment. Elements: Ink strokes, subtle paper grain.',
};

interface DesignBrief {
  layout_description: string;
  color_plan: string;
  typography_plan: string;
  background_treatment: string;
  geometric_elements: string;
  logo_placement: string;
  lighting_and_depth: string;
  visual_energy: string;
  quality_notes: string;
  template_layout?: string;
  zone_map?: string;
  decorative_elements?: string;
  footer_structure?: string;
}

function buildCoreInstructions(sizeConfig: typeof SIZE_CONFIG[string], hasReferences: boolean = false, hasLogos: boolean = false): string {
  let core = `You are a World-Class Creative Director and Senior Graphic Designer at a top-tier global advertising agency. Your goal is to create a flyer so professional and polished that it is indistinguishable from high-end human-made commercial art.

CANVAS: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio}).

ABSOLUTE DESIGN PILLARS:
1. VISUAL DEPTH & LAYERING: Create a multi-layered composition. Use foreground elements (blurred or sharp), midground (hero product), and background (textures, shapes, gradients). Use "Atmospheric Perspective" (subtle haze or blur for distant elements).
2. MASTERFUL LIGHTING: Implement a professional 3-point lighting setup for the hero product:
   - Key Light: Primary source, creating form and dimension.
   - Fill Light: Softens shadows, reveals detail.
   - Rim Light: Sharp highlight on the edges to separate the product from the background.
   - Add "Global Illumination" and "Ambient Occlusion" for realistic contact shadows.
3. TYPOGRAPHY HIERARCHY: Use a maximum of 2-3 font families.
   - Headline: Bold, high-impact, creative placement (e.g., partially behind the product).
   - Subheads: Clean, legible, supporting the headline.
   - Body/Details: Perfectly aligned, using professional tracking and leading.
   - CTA: High-contrast, button-like or badge-style, impossible to miss.
4. GEOMETRIC SOPHISTICATION: Use bold, modern geometric shapes (circles, slanted blocks, rounded cards) to guide the eye. These should feel integrated, not just "placed". Use overlays and blending modes (Multiply, Screen, Overlay) for depth.
5. TEXTURES & OVERLAYS: Incorporate subtle textures (paper grain, brushed metal, soft bokeh, light leaks, or window-shadow overlays) to add "soul" and realism to the design.
6. COLOR HARMONY: Use professional color theory (Analogous, Complementary, or Triadic). Ensure colors are vibrant but balanced. Use gradients with 3+ stops for a premium feel.
7. NEGATIVE SPACE: Do not clutter. Use whitespace (or "empty" space) strategically to let the design breathe and focus the viewer's attention on the hero.

ABSOLUTE PROHIBITIONS:
- NO AI artifacts (distorted limbs, melting edges, nonsensical text).
- NO flat, boring designs.
- NO cartoonish or illustrative styles unless explicitly requested.
- NO generic "stock photo" look. Everything must feel custom-designed.`;

  if (hasLogos) {
    core += `\n\n8. LOGO INTEGRATION: The company logo is MANDATORY. Place it with "Brand Respect" — give it clear space, ensure it's perfectly legible, and align it with the overall grid. It should feel like it belongs to the design, not an afterthought.`;
  }

  if (hasReferences) {
    core += `\n\n⚠️ REFERENCE BENCHMARKS: The attached images represent the ELITE QUALITY BAR. Analyze their composition, lighting, and "vibe". Your output must match or EXCEED this level of professional execution.`;
  }

  return core;
}

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

function buildDesignBriefSection(brief: DesignBrief): string {
  let section = `\n\n=== ART DIRECTOR'S DESIGN BRIEF (follow this precisely) ===`;
  section += `\nLAYOUT: ${brief.layout_description}`;
  section += `\nCOLOR PLAN: ${brief.color_plan}`;
  section += `\nTYPOGRAPHY: ${brief.typography_plan}`;
  section += `\nBACKGROUND: ${brief.background_treatment}`;
  section += `\nGEOMETRIC ELEMENTS: ${brief.geometric_elements}`;
  section += `\nLOGO PLACEMENT: ${brief.logo_placement}`;
  section += `\nLIGHTING & DEPTH: ${brief.lighting_and_depth}`;
  section += `\nVISUAL ENERGY: ${brief.visual_energy}`;
  if (brief.template_layout) {
    section += `\nTEMPLATE LAYOUT POSITIONS: ${brief.template_layout}`;
  }
  if (brief.zone_map) {
    section += `\n\nEXACT ELEMENT POSITIONS (follow these coordinates precisely):\n${brief.zone_map}`;
  }
  if (brief.decorative_elements) {
    section += `\n\nDECORATIVE ELEMENTS TO REPRODUCE EXACTLY:\n${brief.decorative_elements}`;
  }
  if (brief.footer_structure) {
    section += `\n\nFOOTER TEMPLATE (reproduce exactly):\n${brief.footer_structure}`;
  }
  section += `\nQUALITY BENCHMARK: ${brief.quality_notes}`;
  section += `\n=== END BRIEF ===`;
  return section;
}

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

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (colors === 'Aleatórias (IA escolhe)') {
    p += `\nColors: Choose a harmonious high-impact palette for this industry.`;
  }

  if (clientContext) p += `\nClient info: ${clientContext}`;
  if (aiMemoryContext) p += `\nLearned preferences: ${aiMemoryContext}`;

  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

  p += `\n\nFLYER TEXT CONTENT (render ONLY this on the flyer):\n${prompt}`;
  p += `\n\nCreate a jaw-dropping, scroll-stopping, high-conversion commercial flyer. The product MUST be a photorealistic 3D render with studio lighting — NOT flat, NOT illustrated. Premium Brazilian agency quality.`;

  p += buildFinalChecklist({ hasLogos, primaryColor, secondaryColor, fontFamily, aiInstructions, colors });

  return p;
}

function buildCopyPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  niche?: string;
  clientContext?: string;
  designBrief?: DesignBrief | null;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  hasLogos?: boolean;
}): string {
  const { prompt, sizeConfig, niche, clientContext, designBrief, primaryColor, secondaryColor, fontFamily, hasLogos } = params;

  let p = `You are replicating a FIXED TEMPLATE. This is NOT creative work — it is STRICT LAYOUT REPRODUCTION with different content.

CANVAS: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio})

CRITICAL RULES FOR TEMPLATE REPLICATION:
1. The reference image IS the template. Your output must have IDENTICAL element positions, sizes, colors, and decorative elements.
2. You change ONLY: the product/hero image and text words. EVERYTHING ELSE must be identical.
3. Every decorative element (lines, dots, shapes, badges, bars) must be reproduced EXACTLY in the same position, same color, same size.
4. The footer structure must be IDENTICAL — same number of columns, same icons, same layout, same background color.
5. Background treatment must be the SAME TYPE — if blurred photo, use similar blurred photo; if solid, use same color; if gradient, use same gradient.
6. Typography hierarchy must be IDENTICAL — same font weights, same relative sizes, same alignment, same colors for each text level.
7. Color scheme must be IDENTICAL — use the EXACT SAME colors as the reference for backgrounds, text, shapes, accents.
8. Spacing and margins must match — the whitespace between elements must be the same.
9. The overall "feel" and "energy" of the flyer must be indistinguishable from the reference.`;

  if (hasLogos) {
    p += `\n10. COMPANY LOGO: Place the logo in EXACTLY the same position and size as shown in the reference template. If the reference has a logo badge in the footer, replicate that exact badge.`;
  }

  if (designBrief?.zone_map) {
    p += `\n\n=== EXACT ELEMENT POSITIONS — Follow these coordinates as ABSOLUTE RULES ===\n${designBrief.zone_map}\n=== END POSITIONS ===`;
  }
  if (designBrief?.decorative_elements) {
    p += `\n\n=== DECORATIVE ELEMENTS TO REPRODUCE EXACTLY ===\n${designBrief.decorative_elements}\n=== END DECORATIVE ===`;
  }
  if (designBrief?.footer_structure) {
    p += `\n\n=== FOOTER TEMPLATE — Reproduce this EXACTLY ===\n${designBrief.footer_structure}\n=== END FOOTER ===`;
  }

  if (designBrief) {
    p += `\n\n=== ADDITIONAL DESIGN CONTEXT ===`;
    p += `\nLAYOUT: ${designBrief.layout_description}`;
    p += `\nCOLOR PLAN: ${designBrief.color_plan}`;
    p += `\nTYPOGRAPHY: ${designBrief.typography_plan}`;
    p += `\nBACKGROUND: ${designBrief.background_treatment}`;
    if (designBrief.template_layout) {
      p += `\nTEMPLATE POSITIONS: ${designBrief.template_layout}`;
    }
    p += `\n=== END CONTEXT ===`;
  }

  if (niche && NICHE_STYLE[niche]) p += `\nIndustry context: ${NICHE_STYLE[niche]}`;
  if (clientContext) p += `\nClient info: ${clientContext}`;
  if (primaryColor) p += `\nBrand primary color: ${primaryColor}`;
  if (secondaryColor) p += `\nBrand secondary color: ${secondaryColor}`;
  if (fontFamily) p += `\nFont style: ${fontFamily}`;

  p += `\n\nNEW TEXT CONTENT TO USE (replace the reference's text with this):\n${prompt}`;
  p += `\n\nGenerate the flyer with IDENTICAL layout to the template reference image. The ONLY differences should be the product/hero image and text content. Everything else — positions, colors, decorative elements, footer, typography sizes — must be a near-perfect match.`;

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

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nCreate an original masterpiece inspired by the references. Match their 3D photorealistic quality. Surpass them in impact.`;

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

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

  p += `\n\nFLYER TEXT CONTENT (render this text on the flyer):\n${prompt}`;
  
  if (allowManipulation) {
    p += `\n\nDesign a premium flyer with the product as hero. You may creatively enhance the product's appearance (lighting, angle, effects) while maintaining its identity. Bold geometric background, premium agency quality.`;
  } else {
    p += `\n\nDesign a premium flyer AROUND the preserved product. The product from the image must appear EXACTLY as-is. Bold geometric background, premium agency quality.`;
  }

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

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (clientContext) p += `\nClient info: ${clientContext}`;
  if (aiMemoryContext) p += `\nPreferences: ${aiMemoryContext}`;

  if (designBrief) {
    p += buildDesignBriefSection(designBrief);
  }

  p += `\n\nFLYER TEXT CONTENT:\n${prompt}`;
  p += `\n\nGenerate visually IDENTICAL to template. Only product and text differ.`;

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

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

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
  const isCopyMode = config.mode === 'copy';

  let analysisPrompt: string;

  if (isCopyMode) {
    analysisPrompt = `You are a Senior Art Director at a top Brazilian design agency. The attached reference image is a FIXED TEMPLATE that must be replicated EXACTLY. Your job is to extract a precise ZONE MAP of every single element.

CONTEXT:
- Final flyer size: ${config.sizeConfig.width}×${config.sizeConfig.height}px (${config.sizeConfig.aspectRatio})
- Industry/Niche: ${config.niche || 'General'}
- Brand primary color: ${config.primaryColor || 'not set'}
- Brand secondary color: ${config.secondaryColor || 'not set'}
- Font family: ${config.fontFamily || 'not set'}
- Has company logos attached: ${config.hasLogos ? 'YES' : 'NO'}
- User prompt: "${config.prompt}"
${config.aiInstructions ? `- Client orders: ${config.aiInstructions}` : ''}
${config.aiRestrictions ? `- Client restrictions: ${config.aiRestrictions}` : ''}

COPY MODE ANALYSIS — Extract EXACT element positions as percentage zones.
Divide the canvas into a precise coordinate system (0%=left/top, 100%=right/bottom).

For EACH element visible in the reference image, measure and provide:
- Element name
- Position: x_start%, y_start%, x_end%, y_end%
- Style details (color hex, font weight, size relative to canvas height)

Be EXTREMELY precise. Count every decorative element: lines, dots, bars, shapes, badges, icons.
Measure the EXACT footer structure: how many columns, what content in each column.
Map the EXACT typography hierarchy: which text is biggest, which is smallest, exact colors.

Respond with a JSON object using EXACTLY these keys (all values must be strings):
{
  "layout_description": "Overall grid structure and flow — vertical sections, column splits, content zones",
  "color_plan": "EXACT colors used: background hex, text hex for each level, shape fill hex, accent hex. Map each element to its specific hex color",
  "typography_plan": "Typography hierarchy: headline (weight, size as % of canvas height, color hex), subheadline (same), body text (same), CTA text (same). Alignment for each.",
  "background_treatment": "EXACT background: type (solid/gradient/photo/blurred photo), colors/direction, any overlays or textures",
  "geometric_elements": "Every geometric/decorative element: lines (position, thickness, color), dots (position, size, color), shapes (type, position, color, opacity), badges (position, style)",
  "logo_placement": "Exact logo position as percentage zone, size, any background behind it",
  "template_layout": "Complete element-by-element positional map: logo at [x:A-B%, y:C-D%], headline at [x:A-B%, y:C-D%], product at [x:A-B%, y:C-D%], etc.",
  "zone_map": "PRECISE ZONE MAP — list every element with exact percentage coordinates:\\n- Element: x_start%-x_end%, y_start%-y_end% (style details)\\nExample:\\n- Decorative bars: x:3-12%, y:8-9% (orange #F59E0B, 2 horizontal lines + 2 dots)\\n- Headline line 1: x:3-50%, y:15-22% (bold black, ~5% canvas height)\\n- Product photo: x:45-95%, y:5-80% (centered, dominant, photorealistic)\\nList ALL visible elements in order from top to bottom.",
  "decorative_elements": "Catalog of ALL decorative elements: how many lines (with exact position, length, color, thickness), how many dots/circles (with exact position, size, color), shapes (position, type, fill color, border), stickers/badges (position, content, style). Be exhaustive — miss nothing.",
  "footer_structure": "Footer analysis: total height as % of canvas, number of columns, content of each column (e.g., col1: logo badge on dark bg, col2: phone icon + number centered, col3: location icon + address), dividers between columns, background color of footer strip.",
  "quality_notes": "Key quality benchmarks: lighting, shadow realism, color vibrancy, texture detail, polish level, specific techniques observed"
}

IMPORTANT: Respond ONLY with the JSON object. Be EXHAUSTIVELY detailed — the designer will use your zone map as absolute coordinates to place every element.`;
  } else {
    analysisPrompt = `You are a World-Class Art Director at a top-tier global advertising agency. Analyze the attached reference image(s) with extreme precision to produce a high-fidelity design brief.

CONTEXT:
- Final flyer size: ${config.sizeConfig.width}×${config.sizeConfig.height}px (${config.sizeConfig.aspectRatio})
- Generation mode: ${config.mode}
- Industry/Niche: ${config.niche || 'General'}
- Brand primary color: ${config.primaryColor || 'not set'}
- Brand secondary color: ${config.secondaryColor || 'not set'}
- Font family: ${config.fontFamily || 'not set'}
- Has company logos attached: ${config.hasLogos ? 'YES' : 'NO'}
- User prompt: "${config.prompt}"
${config.aiInstructions ? `- Client creative orders: ${config.aiInstructions}` : ''}
${config.aiRestrictions ? `- Client restrictions: ${config.aiRestrictions}` : ''}

${isCopyOrTemplate ? `TEMPLATE MODE — Analyze the reference as an EXACT TEMPLATE. Map every element position precisely: logo, headlines, product, footer, badges, etc. The designer must replicate this layout pixel-perfect.` : `INSPIRATION/ORIGINAL MODE — Analyze the references for elite quality benchmarks, lighting patterns, and sophisticated design cues to inspire a masterpiece.`}

Respond with a JSON object using EXACTLY these keys (all values must be strings):
{
  "layout_description": "Detailed grid and flow analysis. Where is the focal point? How does the eye travel? Describe the exact placement of the hero product, headlines, and CTA.",
  "color_plan": "Sophisticated color palette analysis. Identify primary, secondary, and accent hex codes. Describe how gradients and blending modes are used.",
  "typography_plan": "Exhaustive typography hierarchy. Identify font styles (Serif/Sans/Display), weights, relative sizes, tracking/leading, and creative text effects (shadows, outlines, overlays).",
  "background_treatment": "Deep analysis of the background. Is it a 3D environment, a textured surface, or a complex gradient? Describe any overlays like light leaks, window shadows, or grain.",
  "geometric_elements": "Catalog of all graphic elements. Describe shapes, lines, and patterns. How do they interact with the product and text? Mention layering and transparency.",
  "logo_placement": "Precise logo positioning and integration strategy. How is it balanced with other elements?",
  "lighting_and_depth": "Analyze the lighting setup. Where is the key light? Are there rim lights or reflections? Describe the depth of field and layering strategy.",
  "visual_energy": "Describe the 'vibe' or 'mood'. Is it aggressive, elegant, tech-focused, or organic? How is this energy achieved through design?",
  ${isCopyOrTemplate ? `"template_layout": "EXACT pixel-level mapping of every element: logo at [position] sized [X%], headline at [position], product at [position], footer at bottom, badges at [position]",` : ''}
  "quality_notes": "Identify the 'secret sauce' that makes these references look professional. Mention specific high-end techniques like caustic lights, sub-surface scattering, or advanced compositing."
}

IMPORTANT: Respond ONLY with the JSON object. Be extremely detailed and professional.`;
  }

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
            maxOutputTokens: isCopyMode ? 4096 : 2048,
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

    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const brief: DesignBrief = JSON.parse(jsonStr);
    const elapsed = Date.now() - startTime;
    console.log(`Layer 1 (Art Director): Brief generated in ${elapsed}ms`);
    
    return brief;
  } catch (e) {
    console.error("Layer 1 (Art Director) error:", e);
    return null;
  }
}

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

  const isCopyMode = config.mode === 'copy';
  const passThreshold = isCopyMode ? 9 : 8;

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
- Lighting & Depth: ${config.designBrief.lighting_and_depth}
- Visual Energy: ${config.designBrief.visual_energy}
${config.designBrief.template_layout ? `- Template layout: ${config.designBrief.template_layout}` : ''}`;

    if (isCopyMode) {
      if (config.designBrief.zone_map) {
        reviewPrompt += `\n\nZONE MAP TO COMPARE AGAINST (check each element position):\n${config.designBrief.zone_map}`;
      }
      if (config.designBrief.decorative_elements) {
        reviewPrompt += `\n\nDECORATIVE ELEMENTS THAT MUST BE PRESENT:\n${config.designBrief.decorative_elements}`;
      }
      if (config.designBrief.footer_structure) {
        reviewPrompt += `\n\nFOOTER STRUCTURE TO MATCH:\n${config.designBrief.footer_structure}`;
      }
    }
  }

  if (isCopyMode) {
    reviewPrompt += `\n\nCOPY MODE REVIEW — Be EXTRA STRICT on layout fidelity:
- Compare element positions zone-by-zone against the zone map
- Check that EVERY decorative element (lines, dots, bars, shapes) is present and in the correct position
- Verify footer structure matches exactly (same columns, same layout)
- Check that typography hierarchy is identical (same relative sizes, same colors, same weights)
- Check that the color scheme is identical to the reference
- Score must be >= ${passThreshold} to pass (higher bar for COPY mode)

Focus especially on POSITIONAL ACCURACY — elements should be in the same zones as the reference.`;
  }

  reviewPrompt += `\n\nScore the generated flyer from 1-10 and identify SPECIFIC, ACTIONABLE improvements.
A score of 10 means it looks like it was made by a top-tier human designer and is ready for a national ad campaign.

Respond with a JSON object using EXACTLY these keys:
{
  "score": <number 1-10>,
  "logo_present": <boolean — is the company logo clearly visible and well-integrated?>,
  "colors_correct": <boolean — are brand colors dominant and harmonious?>,
  "layout_matches": <boolean — does the layout match the brief/references?>,
  "text_readable": <boolean — is all text sharp, readable, and professionally typeset?>,
  "lighting_realistic": <boolean — is the lighting on the product and elements realistic and consistent?>,
  "improvements": [<array of specific actionable fix strings, max 5 items>],
  "pass": <boolean — true if score >= ${passThreshold}>
}

Focus on: logo presence, color accuracy, layout fidelity, text quality, 3D product realism, lighting consistency, and overall professional finish.
Respond ONLY with the JSON object.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: reviewPrompt },
    generatedImageData,
    ...referenceImageParts.slice(0, 2),
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

    return review;
  } catch (e) {
    console.error("Layer 3 (QC) error:", e);
    return null;
  }
}

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
    mode: string;
  }
): Promise<{ imageData: string; mimeType: string } | null> {
  console.log("=== LAYER 4: RETOUCHER — Refining flyer ===");
  const startTime = Date.now();

  const isCopyMode = config.mode === 'copy';

  let refinePrompt: string;

  if (isCopyMode) {
    refinePrompt = `You are a professional design retoucher specializing in LAYOUT PRECISION. The FIRST attached image is a flyer that was generated to replicate a template. ${referenceImageParts.length > 0 ? 'The OTHER attached images are the ORIGINAL TEMPLATE to match.' : ''}

YOUR TASK: Fix the positional and layout issues listed below. The output must look IDENTICAL to the reference template.

LAYOUT FIXES TO APPLY:
${improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

CRITICAL RULES:
- Focus on REPOSITIONING elements to match the reference template exactly
- Fix colors to match the reference if they differ
- Ensure decorative elements (lines, dots, bars, shapes) match the reference precisely
- Footer structure must be identical to the reference
- Typography hierarchy (sizes, weights, colors) must match the reference
- PRESERVE the overall content and text — only adjust positions, colors, and decorative elements
- This is a PRECISION ADJUSTMENT, not a redesign

Output: The refined flyer image with all layout corrections applied. Same dimensions.`;
  } else {
    refinePrompt = `You are a World-Class Design Retoucher. The FIRST attached image is a flyer that needs final professional polish. ${referenceImageParts.length > 0 ? 'The OTHER attached images are the reference/brand images to match.' : ''}

SPECIFIC IMPROVEMENTS TO APPLY (do ALL of these):
${improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

RETOUCHING RULES:
- ENHANCE LIGHTING: Add rim lights, fix shadows, and ensure global illumination is consistent.
- COLOR GRADE: Apply professional color grading to make the image "pop" and feel cohesive.
- SHARPEN & CLEAN: Ensure all text is razor-sharp and remove any minor AI artifacts.
- PRESERVE CONTENT: Keep all existing text content exactly as-is.
${config.preserveProduct ? '- CRITICAL: Do NOT alter the product in any way — it must remain 100% identical' : ''}
${config.hasLogos ? '- Ensure the company logo is perfectly integrated and visible.' : ''}

Output: The refined, high-fidelity flyer image. Same dimensions.`;
  }

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

    if (data?.promptFeedback?.blockReason) {
      console.warn(`Layer 4: Blocked - ${data.promptFeedback.blockReason}`);
      return null;
    }

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
    return null;
  }
}

async function callGeminiWithRetry(
  model: string,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
  apiKey: string,
  maxRetries: number = 2,
  isProductMode: boolean = false
): Promise<{ imageData: string; mimeType: string } | { error: string; status: number; response?: unknown }> {
  
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
          currentParts = parts;
        } else {
          if (isProductMode && imageParts.length > 0) {
            const simplifiedText = `Create a professional commercial flyer featuring the EXACT product shown in the attached image. 
Keep the product 100% identical. Design only the background and text layout around it.
Text content: ${textPart.text.match(/FLYER TEXT CONTENT[^\n]*\n([\s\S]*?)(?:\n\n|$)/)?.[1] || textPart.text.substring(textPart.text.length - 200)}`;
            currentParts = [{ text: simplifiedText }, ...imageParts];
          } else {
            const simplifiedText = textPart.text
              .replace(/DESIGN RULES:[\s\S]*?NO AI artifacts[^\n]*\n/g, 
                'Create a professional, photorealistic commercial flyer. Premium agency quality. Bold geometric design with depth.\n')
              .substring(0, 800);
            currentParts = [{ text: simplifiedText }];
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

        if (attempt < maxRetries) continue;
        return { error: "Failed to generate image", status: 500 };
      }

      const data = await response.json();

      if (data?.promptFeedback?.blockReason) {
        console.warn(`Blocked (attempt ${attempt}): ${data.promptFeedback.blockReason}`);
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        if (isProductMode) {
          return { error: "A imagem do produto foi bloqueada pela IA. Tente com uma imagem diferente do produto.", status: 500, response: data };
        }
        return { error: "Image generation was blocked. Try a different prompt.", status: 500, response: data };
      }

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
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

    const { data: project, error: projectError } = await supabase
      .from("studio_projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        if (aiMemoryContext.length > 500) {
          aiMemoryContext = aiMemoryContext.substring(0, 500);
        }
      }
    } catch (e) {
      console.error("Error fetching learnings:", e);
    }

    const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG["1080x1080"];
    const finalMode = preserveProduct ? 'product' : mode;
    const projectHasReferences = (project.reference_images && project.reference_images.length > 0) 
      || layoutReferences.length > 0 || additionalReferences.length > 0;
    const hasLogos = !!(project.logo_images && project.logo_images.length > 0);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allReferenceImages: string[] = [];
    if (finalMode === 'product' && productImage) {
      allReferenceImages.push(productImage);
    }
    if (finalMode === 'template' && project.template_image) {
      allReferenceImages.push(project.template_image);
    }
    if (finalMode !== 'product') {
      allReferenceImages.push(...layoutReferences);
      allReferenceImages.push(...additionalReferences);
      if (project.reference_images) {
        allReferenceImages.push(...project.reference_images);
      }
    }

    const logoCount = (project.logo_images && project.logo_images.length > 0) 
      ? Math.min(project.logo_images.length, 2) : 0;
    if (logoCount > 0) {
      allReferenceImages.push(...project.logo_images.slice(0, 2));
    }

    const maxImages = finalMode === 'product' ? (1 + logoCount) : (3 + logoCount);
    const imagesToProcess = allReferenceImages.slice(0, maxImages);

    const fetchedImageResults = await Promise.all(
      imagesToProcess.map((url, i) => fetchImageAsInlineData(url, i))
    );

    const validImageParts = fetchedImageResults.filter(
      (r): r is { inlineData: { mimeType: string; data: string } } => r !== null
    );

    let designBrief: DesignBrief | null = null;
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
      designBrief,
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
          primaryColor: project.primary_color,
          secondaryColor: project.secondary_color,
          fontFamily: project.font_family,
          hasLogos,
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

    const selectedModel = (finalMode === 'product' || finalMode === 'template' || finalMode === 'copy' || model === 'gemini-pro')
      ? AI_MODELS["gemini-pro"]
      : AI_MODELS["gemini-flash"];

    const generationParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: enhancedPrompt },
      ...validImageParts,
    ];

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

    let finalImageData = generationResult.imageData;
    let finalMimeType = generationResult.mimeType;

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

      if (review && !review.pass && review.improvements.length > 0) {
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
            mode: finalMode,
          }
        );

        if (refinedResult) {
          finalImageData = refinedResult.imageData;
          finalMimeType = refinedResult.mimeType;
        }
      }
    }

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
      return new Response(JSON.stringify({ error: "Failed to save image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("studio-assets")
      .getPublicUrl(fileName);

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
      return new Response(JSON.stringify({ error: "Failed to save flyer record" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      flyer,
      imageUrl: publicUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});