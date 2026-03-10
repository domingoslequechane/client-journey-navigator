// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const AI_MODELS = {
  "gemini-flash": "gemini-3.1-flash-image-preview", // Nano Banana 2
  "gemini-pro": "gemini-3-pro-image-preview",       // Nano Banana Pro
  "gemini-flash-text": "gemini-3.1-flash-preview",   // Elite Reasoning v3
  "gemini-pro-text": "gemini-3-pro-preview",        // Advanced Reasoning v3
} as const;

const SIZE_CONFIG: Record<string, { aspectRatio: string; orientation: string; width: number; height: number }> = {
  "1080x1080": { aspectRatio: "1:1", orientation: "Quadrado", width: 1080, height: 1080 },
  "1080x1920": { aspectRatio: "9:16", orientation: "Retrato (Stories)", width: 1080, height: 1920 },
  "1920x1080": { aspectRatio: "16:9", orientation: "Paisagem (Banner)", width: 1920, height: 1080 },
  "1080x1350": { aspectRatio: "4:5", orientation: "Retrato (Carrossel)", width: 1080, height: 1350 },
  "1280x720": { aspectRatio: "16:9", orientation: "YouTube Thumbnail", width: 1280, height: 720 },
};

const NICHE_STYLE: Record<string, string> = {
  'Construção': 'Industrial Power: Bold 3D renders of heavy materials (cement bags, bricks, tiles, steel). Safety Orange + Charcoal + Concrete Gray palette. Scratched metal textures, dramatic low-angle lighting.',
  'Material de Construção': 'Construction Retail: Warehouse aesthetic, bold pricing banners, real product photography. Orange + Gray + White. Price tags, stock badges, heavy material renders.',
  'Material Decorativo': 'Interior Elegance: Tiles, paints, wallpapers shown in styled rooms. Soft neutral palette with gold accents. Lifestyle staging, marble textures, architectural details.',
  'Mobiliário': 'Minimalist Luxury: Soft studio lighting, wood grain and velvet textures. Earthy tones, Cream, Gold. Editorial spacing, premium feel.',
  'Automóvel': 'High-Speed Dynamic: Motion blur, metallic reflections, rim lighting. Deep Black, Electric Blue or Racing Red. Carbon fiber, polished chrome.',
  'Peças Automóveis': 'Technical Precision: Workshop lighting, macro product details, exploded part views. Steel Gray + Red + Black. Industrial fonts, technical diagrams.',
  'Imobiliário': 'Modern Living: Bright airy interiors, wide-angle architecture. Navy Blue + Gold + White. Glass reflections, luxury keys, blueprint elements.',
  'Restaurante': 'Gourmet Sensorial: Steam, macro food, vibrant plating. Warm Red + Gold + Dark Wood. Moody spotlighting on dish hero.',
  'Padaria & Confeitaria': 'Warm Artisan: Golden croissants, pastel macarons, rustic wood boards. Cream + Brown + Pastel Pink. Soft warm lighting, flour dust effects.',
  'Supermercado': 'Retail Promotion: Bright bold price flags, product stacks, color-coded category strips. Primary colors + White. High energy promotional style.',
  'Beleza': 'Ethereal Glow: Pearlescent textures, flawless product lighting. Rose Gold + Pastel Pink + Silk White. Floating petals, liquid splashes.',
  'Barbearia': 'Urban Barber: Dark moody backgrounds, vintage razor tools, leather textures. Black + Gold + Red. Retro typography, sharp masculine lines.',
  'Saúde': 'Clinical Trust: High-key bright, clean environments. Medical Blue + Mint + Pure White. Soft gradients, professional iconography.',
  'Clínica Médica': 'Healthcare Premium: Warm and approachable yet clinical. Teal + White + Light Blue. Doctor imagery, care symbols, soft shadows.',
  'Tecnologia': 'Cyber-Future: Neon glows, circuit patterns, dark glass reflections. Deep Black + Electric Purple + Cyan. Backlit elements, digital bokeh.',
  'Informática': 'Tech Retail: Product-forward, clean specs layout, glowing screens. Dark + Blue + Silver. Laptop/PC hero renders, comparison layouts.',
  'Moda': 'Editorial Edge: High-fashion, dramatic shadows, bold typography. Monochrome + one bold accent. Fabric textures, leather, silk.',
  'Calçados': 'Footwear Drama: Floating shoe on minimal background, shadow play, material close-ups. White + Black + Accent pop. Dynamic angled compositions.',
  'Fitness': 'Raw Energy: High-contrast, gritty textures, sweat drops. Black + Neon Yellow or Fire Red. Harsh side-lighting, muscle definition.',
  'Pet Shop': 'Playful Warmth: Bright friendly colors, bokeh, soft fur. Sunny Yellow + Sky Blue + Grass Green. Paw prints, playful bubbles.',
  'Agricultura': 'Natural Abundance: Golden hour, organic textures, soil and leaves. Deep Green + Harvest Gold + Earth Brown. Sun flares, dew drops.',
  'Ótica': 'Crystal Clarity: Lens flares, transparent textures, sharp focus. Navy + Silver + Crystal Clear. Precise spotlights, glass reflections.',
  'Farmácia': 'Wellness Balance: Clean, organized, trustworthy. Health Green + White + Trust Blue. Leaf motifs, soft gradients.',
  'Joalharia': 'Precious Brilliance: Caustic sparkle effects, deep velvet shadows. Velvet Black + Pure Gold + Diamond White. Multiple tiny spotlights, macro gem details.',
  'Eventos': 'Celebration Spark: Bokeh lights, glitter, confetti, gradients. Champagne Gold + Midnight Black + Pearl White. Festive glowing atmosphere.',
  'Educação': 'Academic Prestige: Classic paper textures, library warmth. Oxford Blue + Burgundy + Parchment. Ink strokes, subtle paper grain.',
  'Contabilidade': 'Corporate Trust: Clean charts, professional graphs, precise grid layouts. Navy + Gray + Green. Number elements, financial icons, authoritative typography.',
  'Advocacia': 'Legal Authority: Classic dark leather, scales of justice, marble textures. Deep Navy + Gold + Black. Heavy serif fonts, official seals.',
  'Seguros': 'Security & Trust: Shield motifs, family protection imagery. Blue + White + Teal. Safety icons, reassuring gradients.',
  'Logística': 'Global Movement: Trucks, cargo, route maps, dynamic arrows. Orange + Dark Blue + Gray. Bold directional elements, speed lines.',
  'Gráfica & Impressão': 'Print Craft: Color swatches, CMYK elements, paper textures. Vibrant spectrum + Black + White. Creative layering, type-as-art.',
  'Limpeza & Higiene': 'Fresh & Clean: Soap bubbles, water splashes, bright whites. Aqua Blue + White + Fresh Green. Crisp product shots, cleanliness cues.',
  'Eletrodomésticos': 'Home Innovation: Lifestyle photography, modern kitchens, product close-ups. Stainless Steel + White + Accent color. Premium appliance renders.',
  'Eletrônicos': 'Consumer Tech: Glowing screens, product hero shots, tech specs. Dark + Neon Accent. Dramatic spotlighting, floating device renders.',
  'Papelaria': 'Creative & Colorful: Flat-lay product shots, vibrant stationery, artistic backdrops. Bright + Pastel palette. Clean minimalist or playful aesthetic.',
  'Brinquedos': 'Joy & Wonder: Bright primary colors, playful typography, happy imagery. Red + Yellow + Blue + Green. Fun, energetic, child-friendly compositions.',
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

  // Product description always comes first — it's the most critical for fidelity
  if ((brief as any).product_description) {
    section += `\n\n⚠️ EXACT PRODUCT TO USE (NON-NEGOTIABLE):`;
    section += `\n${(brief as any).product_description}`;
    section += `\n=> The above product MUST appear as the hero element. Do NOT substitute it.`;
  }

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
  footerText?: string;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors, elements,
    primaryColor, secondaryColor, fontFamily, aiInstructions,
    aiRestrictions, aiMemoryContext, clientContext, hasLogos, hasReferences, designBrief, footerText } = params;

  let p = `Generate a world-class, premium advertising flyer.
Visual Style: Ultra-photorealistic, 8k resolution, cinematic studio lighting, magazine cover quality, Brazilian ad agency style.
Canvas: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio}).

Key Visual Details to generate:
- Background: Professional studio backdrop, deep rich gradients, structural geometric depth (subtle arcs, podiums, or clean intersecting layers).
- Lighting: Global illumination, 3-point lighting setup, soft specular highlights, clean and realistic shadows.
- Composition: The main subject must be massive and heroic. Stunning Z-pattern flow. Uncluttered.
- Typography: Extremely bold, modern sans-serif. Perfect kerning. High contrast and highly readable. TEXT MUST BE WRITTEN EXACTLY AS REQUESTED.

${clientName ? `Brand: ${clientName}\n` : ''}${niche && NICHE_STYLE[niche] ? `Industry: ${NICHE_STYLE[niche]}\n` : ''}${mood ? `Energy/Mood: ${mood}\n` : ''}${elements ? `Hero Subject: ${elements}\n` : ''}`;

  if (hasReferences || hasLogos) {
    p += `\n[Reference Integration]: The attached images dictate the lighting, color scheme, and texture vibe. Extract their essence (luxurious, dynamic, minimalist, etc.) and apply that visual language to this new flyer.\n`;
  }

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (designBrief) {
    p += `\n\nExpert Guidance:
- Layout & Symmetry: ${designBrief.layout_description}
- Logo & Icon Placement: ${designBrief.logo_placement}
- Geometric Alignment: ${designBrief.geometric_elements}
- Lighting: ${designBrief.lighting_and_depth}
- Secret Sauce: ${designBrief.quality_notes}
- Color Strategy: ${designBrief.color_plan}`;
  }

  p += `\n\nEXACT TEXT TO RENDER ON THE FLYER (Do not invent text, write exactly this prominently):\n"${prompt}"`;

  if (footerText) {
    p += `\n\nMANDATORY BOTTOM FOOTER BAR:\nCreate a distinct, structurally perfect footer zone at the very bottom.\n- Arrange these details symmetrically.\n- Add crisp, professional icons next to phone numbers and addresses.\n- Content to render in the footer:\n"${footerText}"`;
  }

  p += '\n\nEnsure no AI artifacts, no spelling mistakes. The final image must look like a real, published high-end commercial photo.';

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
  footerText?: string;
}): string {
  const { prompt, sizeConfig, niche, designBrief, primaryColor, secondaryColor, fontFamily, hasLogos, footerText } = params;

  let p = `Generate an exact replica advertising flyer based strictly on the provided image template.
Visual Style: Ultra-photorealistic, identical to the reference template's layout and energy.
Canvas Dimensions: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio}).

CRITICAL REPLICATION RULES:
- The FIRST attached image is the APPROVED TEMPLATE. You MUST COPY its layout, geometry, background flow, visual hierarchy, and object placement pixel-for-pixel.
- Render the exact same background aesthetic (shapes, lines, lighting, shadows).
- If a product or person is shown in the template, replace it with the subject of this new prompt, but place it in the EXACT SAME POSITION and SCALE.
- Use the exact same typographic scale and text placement zones.

CHANGES ALLOWED:
1. Replace the text in the template with the new text provided below.
2. Update the primary/secondary colors only if explicitly defined below, otherwise keep the template colors.

${primaryColor ? `Enforced Primary Color: ${primaryColor}\n` : ''}${secondaryColor ? `Enforced Secondary Color: ${secondaryColor}\n` : ''}`;

  if (designBrief?.zone_map) {
    p += `\n\nAbsolute Layout Coordinates (Do not deviate):\n${designBrief.zone_map}`;
  }

  p += `\n\nEXACT TEXT TO RENDER ON THE FLYER (Replace template text with this):\n"${prompt}"`;

  if (footerText) {
    p += `\n\nMANDATORY BOTTOM FOOTER BAR:\nCreate a distinct, structurally perfect footer zone at the very bottom.\n- Arrange these details symmetrically.\n- Add crisp, professional icons next to phone numbers and addresses.\n- Content to render in the footer:\n"${footerText}"`;
  }

  p += '\nEnsure 100% spelling accuracy and flawless photorealistic rendering.';
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
  footerText?: string;
  hasApprovedLayout?: boolean;
}): string {
  const { prompt, sizeConfig, clientName, niche, mood, colors,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions,
    hasLogos, designBrief, footerText, hasApprovedLayout } = params;

  let p = `Generate a premium, ultra-photorealistic commercial flyer heavily inspired by the attached reference images.
Visual Style: 8k resolution, cinematic lighting, magazine editorial quality, high-end agency design.
Canvas Dimensions: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio}).

MASTER INSTRUCTIONS:
- The attached images are your VISUAL ANCHORS. Extract their mood, lighting setup (e.g., neon, soft daylight, dramatic shadows), background textures, and geometric style.
- Create a new, brilliant composition that feels like it belongs in the exact same ad campaign as the references.
- Render 3D/photorealistic central hero elements (do not use flat illustrations unless the reference is purely illustrative).
- Ensure bold, striking typography that reads perfectly.

${hasApprovedLayout ? `CRITICAL RULE: The first image is an APPROVED STRUCTURAL TEMPLATE. You MUST place the main subject, the headline, and the background elements in the EXACT SAME positions as this layout.` : ''}

${clientName ? `Brand: ${clientName}
` : ''}${niche && NICHE_STYLE[niche] ? `Industry vibe: ${NICHE_STYLE[niche]}
` : ''}${mood ? `Energy: ${mood}
` : ''}`;

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (designBrief) {
    p += `\n\nExtracted Reference DNA to apply:
- MANDATORY LAYOUT: You MUST perfectly mirror the symmetry, spacing, and structural positioning of the reference layout. Place the logo exactly where specified. Align icons and text with absolute geometric precision.
- Layout Flow: ${designBrief.layout_description}
- Logo & Grid: ${designBrief.logo_placement}
- Geometric Elements: ${designBrief.geometric_elements}
- Typography Style: ${designBrief.typography_plan}
- Color Harmony: ${designBrief.color_plan}
- Lighting/Vibe: ${designBrief.lighting_and_depth}`;
  }

  p += `

EXACT TEXT TO RENDER ON THE FLYER:
"${prompt}"`;

  if (footerText) {
    p += `

MANDATORY BOTTOM FOOTER BAR:
Create a distinct, structurally perfect footer zone at the very bottom.
- Arrange these details symmetrically.
- Add crisp, professional icons next to phone numbers and addresses.
- Content to render in the footer:
"${footerText}"`;
  }

  p += '\nOutput must be a masterfully lit, perfectly spelled, photorealistic image.';

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
  footerText?: string;
  hasReferences?: boolean;
  hasApprovedLayout?: boolean;
}): string {
  const { prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos, colors, allowManipulation, designBrief, footerText, hasReferences, hasApprovedLayout } = params;

  let p = `Generate a photorealistic advertising flyer featuring the EXACT product shown in the attached image.
Canvas Dimensions: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio}).

PRODUCT INTEGRATION RULES:
${allowManipulation ? `ENHANCEMENT MODE: The attached product image is the core subject. You MUST feature this specific product, but you have full permission to enhance its lighting, correct reflections, improve its texture quality, and blend it seamlessly into a high-end, realistic studio environment. Make the product look like a million-dollar commercial photo.` : `STRICT PRESERVATION MODE: The attached product image MUST remain 100% physically identical. Do not alter its shape, branding, colors, or textures. It must look exactly like the input photo. Build a breathtaking, photorealistic studio environment and typography AROUND the product. Integrate it with perfect drop shadows and realistic ambient lighting from the new background.`}

${hasReferences ? `Background & Mood Inspiration: Look at the OTHER attached images (if any) as a moodboard for the background elements, lighting style, and color palette. Build the scene around the product using that vibe.` : ''}

${hasApprovedLayout ? `CRITICAL RULE: The second attached image is an APPROVED STRUCTURAL TEMPLATE. You MUST place the preserved product in the EXACT same spatial zone and scale as the main subject in that template. Recreate the template's background layout structure.` : ''}

${clientName ? `
Brand: ${clientName}` : ''}${niche && NICHE_STYLE[niche] ? `
Industry: ${NICHE_STYLE[niche]}` : ''}`;

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (designBrief) {
    p += `\n\nExtracted Focus:
- MANDATORY LAYOUT: Align text, logos, and icons symmetrically around the product exactly as described.
- Layout Flow: ${designBrief.layout_description}
- Logo Placement: ${designBrief.logo_placement}
- Geometric Elements: ${designBrief.geometric_elements}
- Lighting: ${designBrief.lighting_and_depth}`;
  }

  p += `

EXACT TEXT TO RENDER ON THE FLYER:
"${prompt}"`;

  if (footerText) {
    p += `

MANDATORY BOTTOM FOOTER BAR:
Create a distinct, structurally perfect footer zone at the very bottom.
- Arrange these details symmetrically.
- Add crisp, professional icons next to phone numbers and addresses.
- Content to render in the footer:
"${footerText}"`;
  }

  p += '\nOutput must be a masterfully lit, perfectly spelled, photorealistic image.';
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
  footerText?: string;
}): string {
  const { prompt, sizeConfig, clientName,
    primaryColor, secondaryColor, fontFamily,
    aiInstructions, aiRestrictions, hasProductImage, hasLogos, colors, designBrief, footerText } = params;

  let p = `Generate a photorealistic advertising flyer that perfectly replicates the structural template provided.
Canvas Dimensions: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio}).

STRICT TEMPLATE COMPLIANCE:
- The FIRST attached image is the APPROVED TEMPLATE layout.
- You MUST perfectly replicate the spatial arrangement, background geometry, typography hierarchy, and overall layout grid of this template.
- ${hasProductImage ? 'Extract the product from the OTHER attached image and place it precisely where the hero element is in the template.' : 'Keep the structural layout identical but skin it with high-end photorealistic textures.'}

${clientName ? `Brand: ${clientName}
` : ''}`;

  p += buildMandatoryBrandConfig({ colors, primaryColor, secondaryColor, fontFamily, aiInstructions, aiRestrictions, hasLogos });

  if (designBrief?.zone_map) {
    p += `

Absolute Layout Coordinates (Do not deviate):
${designBrief.zone_map}`;
  }

  p += `

EXACT TEXT TO RENDER ON THE FLYER (Replacing template text):
"${prompt}"`;

  if (footerText) {
    p += `

MANDATORY BOTTOM FOOTER BAR:
Create a distinct, structurally perfect footer zone at the very bottom.
- Arrange these details symmetrically.
- Add crisp, professional icons next to phone numbers and addresses.
- Content to render in the footer:
"${footerText}"`;
  }

  p += '\nOutput must be a masterfully lit, perfectly spelled, photorealistic image.';
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

async function generateShortTitle(prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Based on this advertising flyer prompt, generate a SHORT (2-4 words) and unique title in Portuguese. 
              Examples: "Som de Luxo", "Hambúrguer Artesanal", "Oferta de Natal".
              Prompt: "${prompt ? prompt.substring(0, 500) : "Flyer de Marketing"}"
              Respond ONLY with the title string.`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 20,
            temperature: 0.7,
          }
        }),
      }
    );

    const data = await response.json();
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/"/g, '') || "Flyer Gerado";
    // Limit length to avoid issues
    return title.substring(0, 50);
  } catch (e) {
    console.error("Error generating title:", e);
    return "Flyer Gerado";
  }
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

${isCopyOrTemplate ? `TEMPLATE MODE — Analyze the reference as an EXACT TEMPLATE. Map every element position precisely: logo, headlines, product, footer, badges, etc. The designer must replicate this layout pixel-perfect.` : `INSPIRATION/ORIGINAL MODE — Analyze the references for elite quality benchmarks, lighting patterns, and sophisticated design cues. CRITICAL: Identify and describe the EXACT products shown so the designer can preserve them faithfully.`}

Respond with a JSON object using EXACTLY these keys (all values must be strings):
{
  "product_description": "CRITICAL — Describe the EXACT product(s) visible in the reference images. Include: product type, specific model/style visible, colors and finishes, materials (metal/plastic/wood etc), any visible branding or text on the product, size/proportion relative to the frame, exact shape and distinctive features. This description will be used to ensure the same product appears in the final flyer.",
  "layout_description": "Detailed grid and flow analysis. Where is the focal point? How does the eye travel? Describe the exact placement of the hero product, headlines, and CTA.",
  "color_plan": "Sophisticated color palette analysis. Identify primary, secondary, and accent hex codes. Describe how gradients and blending modes are used.",
  "typography_plan": "Exhaustive typography hierarchy. Identify font styles (Serif/Sans/Display), weights, relative sizes, tracking/leading, and creative text effects (shadows, outlines, overlays).",
  "background_treatment": "Deep analysis of the background. Is it a 3D environment, a textured surface, or a complex gradient? Describe any overlays like light leaks, window shadows, or grain.",
  "geometric_elements": "Catalog of all graphic elements. Describe shapes, lines, and patterns. How do they interact with the product and text? Mention layering and transparency.",
  "logo_placement": "Precise logo positioning and integration strategy. How is it balanced with other elements?",
  "lighting_and_depth": "Analyze the lighting setup. Where is the key light? Are there rim lights or reflections? Describe the depth of field and layering strategy.",
  "visual_energy": "Describe the 'vibe' or 'mood'. Is it aggressive, elegant, tech-focused, or organic? How is this energy achieved through design?",
  ${isCopyOrTemplate ? `"template_layout": "EXACT pixel-level mapping of every element: logo at [position] sized [X%], headline at [position], product at [position], footer at bottom, badges at [position]",` : ''}
  "footer_structure": "Carefully analyze the footer area. Is it a distinct bar? How are elements (logos, text, icons) arranged horizontally and symmetrically?",
  "quality_notes": "Identify the 'secret sauce' that makes these references look professional. Mention specific high-end techniques like caustic lights, sub-surface scattering, or advanced compositing."
}

IMPORTANT: Respond ONLY with the JSON object. The product_description field is MANDATORY and must be exhaustively detailed — the designer relies on it to reproduce the exact product.`;
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: analysisPrompt },
    ...imageParts,
  ];

  try {
    const modelForAnalysis = config.model === "gemini-pro" ? AI_MODELS["gemini-pro-text"] : AI_MODELS["gemini-flash-text"];

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${modelForAnalysis}:generateContent`,
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
            maxOutputTokens: isCopyMode ? 4096 : 3072,
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

    // If prompt is empty or very short, and we have niche/context, the Art Director should suggest a copy
    if (config.prompt.length < 10) {
      console.log("Layer 1: Generating suggested copy since user prompt is empty/short");
      const copyPrompt = `Based on the niche "${config.niche || 'General'}" and the design style analyzed, write a high-conversion, short commercial copy in Portuguese (PT-PT) for this flyer.
      Include a catchy headline, a subheadline or benefit, and a call to action.
      Keep it under 20 words total.
      Respond ONLY with the suggested text.`;

      const copyResponse = await fetch(
        `${GEMINI_API_BASE}/models/${modelForAnalysis}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: copyPrompt }, ...imageParts] }],
            generationConfig: { maxOutputTokens: 200 },
            safetySettings: SAFETY_SETTINGS,
          }),
        }
      );

      if (copyResponse.ok) {
        const copyData = await copyResponse.json();
        const suggestedCopy = copyData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (suggestedCopy) {
          console.log("Layer 1: Suggested copy generated:", suggestedCopy);
          // We'll inject this into the brief to be used by the designer
          (brief as any).suggested_copy = suggestedCopy.trim();
        }
      }
    }

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
  maxRetries: number = 3,
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
          const extractedTextMatch = textPart.text.match(/EXACT TEXT TO RENDER[^\n]*\n"([^"]+)"/);
          const extractedText = extractedTextMatch ? extractedTextMatch[1] : textPart.text.substring(textPart.text.length - 100);

          if (isProductMode && imageParts.length > 0) {
            const simplifiedText = `A professional commercial flyer featuring the EXACT product shown in the attached image.
Photorealistic, studio environment, beautiful lighting.
Text to render: "${extractedText}"`;
            currentParts = [{ text: simplifiedText }, ...imageParts];
          } else {
            const simplifiedText = `A professional commercial flyer, photorealistic, premium agency quality, cinematic lighting.
Text to render: "${extractedText}"`;
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

        if (response.status === 429 || response.status === 503) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return { error: "Rate limit exceeded or service unavailable. Please try again in a moment.", status: response.status };
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
    const userEmail = claimsData.user.email;

    // SECURITY: Get user's organization_id to verify ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, current_organization_id')
      .eq('id', userId)
      .single();

    const userOrgId = profile?.current_organization_id || profile?.organization_id;

    if (!userOrgId) {
      return new Response(JSON.stringify({ error: "User organization not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      projectId, prompt = '', size = '1080x1080', style = 'vivid',
      mode = 'original', model = 'gemini-flash', niche, mood,
      colors, elements, preserveProduct = false,
      productImage, allowManipulation = false,
      autoCopy = false,
      layoutReferences = [], additionalReferences = [],
      footerText = '',
      action = 'generate-image' // New param to support Canvas Engine Hybrid Mode
    } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Verify project belongs to user's organization
    const { data: project, error: projectError } = await supabase
      .from("studio_projects")
      .select("*")
      .eq("id", projectId)
      .eq("organization_id", userOrgId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found or access denied" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is exempt from limits (development accounts)
    const EXEMPT_EMAILS = ["domingosf.lequechane@gmail.com", "onixagence.geral@gmail.com"];
    const isExempt = userEmail && EXEMPT_EMAILS.some(e => userEmail.toLowerCase().includes(e.split('@')[0].toLowerCase()));

    if (!isExempt) {
      // Fetch organization plan type
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("plan_type")
        .eq("id", project.organization_id)
        .single();

      if (orgError) {
        console.error("Error fetching organization plan:", orgError);
      }

      const planType = orgData?.plan_type || 'free';

      // Define daily limits based on plan (from pricing page)
      const dailyLimits: Record<string, number> = {
        'free': 5,
        'starter': 15,
        'pro': 30,
        'agency': 60
      };

      const userDailyLimit = dailyLimits[planType] || 5;

      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const { count: dailyCount, error: countError } = await supabase
        .from("studio_flyers")
        .select("*", { count: 'exact', head: true })
        .eq("created_by", userId)
        .gte("created_at", today);

      if (countError) {
        console.error("Error checking daily limit:", countError);
      } else if (dailyCount !== null && dailyCount >= userDailyLimit) {
        return new Response(JSON.stringify({
          error: `Limite diário atingido para o plano ${planType}. Você pode gerar até ${userDailyLimit} flyers por dia.`
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If no prompt and not autoCopy mode, require a prompt
    if (!prompt && !autoCopy) {
      return new Response(JSON.stringify({ error: "prompt is required (or enable autoCopy)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let clientContext = "";
    if (project.client_id) {
      try {
        // SECURITY: Verify client belongs to user's organization
        const { data: clientData } = await supabase
          .from('clients')
          .select('company_name, contact_name, services, website, source, notes')
          .eq('id', project.client_id)
          .eq('organization_id', userOrgId)
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
      if (project.template_image) {
        allReferenceImages.push(project.template_image);
      } else if (project.reference_images?.length > 0) {
        allReferenceImages.push(...project.reference_images.slice(0, 2 - allReferenceImages.length));
      }
    } else if (finalMode === 'template' && project.template_image) {
      allReferenceImages.push(project.template_image);
      if (productImage) allReferenceImages.push(productImage);
    } else if (finalMode === 'copy' && project.template_image) {
      allReferenceImages.push(project.template_image);
      if (productImage) allReferenceImages.push(productImage);
    } else if (finalMode === 'copy') {
      if (layoutReferences.length > 0) allReferenceImages.push(layoutReferences[0]);
      if (productImage) allReferenceImages.push(productImage);
    } else if (finalMode === 'inspiration') {
      if (project.template_image) {
        allReferenceImages.push(project.template_image);
        if (productImage) allReferenceImages.push(productImage);
      } else {
        if (layoutReferences.length > 0) allReferenceImages.push(layoutReferences[0]);
        if (additionalReferences.length > 0) allReferenceImages.push(additionalReferences[0]);
        if (allReferenceImages.length < 2 && project.reference_images?.length > 0) {
          allReferenceImages.push(...project.reference_images.slice(0, 2 - allReferenceImages.length));
        }
      }
    } else {
      if (layoutReferences.length > 0) allReferenceImages.push(layoutReferences[0]);
      if (additionalReferences.length > 0) allReferenceImages.push(additionalReferences[0]);
      if (allReferenceImages.length < 2 && project.reference_images?.length > 0) {
        allReferenceImages.push(...project.reference_images.slice(0, 2 - allReferenceImages.length));
      }
    }

    // Limit to 2 reference images max as per competitor training
    const imagesToProcess = allReferenceImages.slice(0, 2);

    // Add one logo if available
    if (hasLogos && project.logo_images && project.logo_images.length > 0) {
      imagesToProcess.push(project.logo_images[0]);
    }

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

    // --- HYBRID ENGINE: Copy Generation Only ---
    if (action === 'generate-copy') {
      const copyPrompt = `
      You are an elite copywriter for an advertising agency.
      Client: ${project.name}
      Niche: ${niche || project.niche}
      Theme/Idea: ${prompt}
      
      Generate highly persuasive, short advertising copy for a promotional flyer that will be used in a square layout.
      
      RETURN ONLY A VALID JSON OBJECT WITH THE EXACT FOLLOWING STRUCTURE (NO MARKDOWN WRAPPERS):
      {
        "headline": "Short, punchy title (max 4 words)",
        "subheadline": "Persuasive subtext (max 10 words)",
        "cta": "Call to action button text (max 3 words)",
        "suggestedBackgroundColor": "A hex color code that fits the theme",
        "suggestedTextColor": "A high contrast hex color against the background"
      }
      `;

      try {
        const response = await fetch(
          `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: copyPrompt }] }],
              generationConfig: {
                responseModalities: ["TEXT"],
                responseMimeType: "application/json",
                maxOutputTokens: 1024,
              },
              safetySettings: SAFETY_SETTINGS,
            }),
          }
        );

        if (!response.ok) {
          return new Response(JSON.stringify({ error: "Failed to generate copy" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const jsonString = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!jsonString) {
          throw new Error("No response string");
        }

        const copyData = JSON.parse(jsonString);

        return new Response(JSON.stringify({
          success: true,
          copy: copyData,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (copyErr) {
        console.error("Copy generation error:", copyErr);
        return new Response(JSON.stringify({ error: "Error parsing AI copy" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    // --- END HYBRID ENGINE COPY ---

    // Use suggested copy if user prompt is empty
    const finalPrompt = (prompt.trim() === "" && (designBrief as any)?.suggested_copy)
      ? (designBrief as any).suggested_copy
      : prompt;

    const baseParams = {
      prompt: finalPrompt, sizeConfig,
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
      footerText: footerText || (project as any).footer_text || '',
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
          prompt: finalPrompt, sizeConfig,
          niche: niche || project.niche,
          clientContext,
          designBrief,
          primaryColor: project.primary_color,
          secondaryColor: project.secondary_color,
          fontFamily: project.font_family,
          hasLogos,
          footerText: baseParams.footerText,
        });
        break;
      case 'inspiration': {
        const allRefs = [...layoutReferences, ...additionalReferences, ...(project.reference_images || [])];
        enhancedPrompt = buildInspirationPrompt({
          ...baseParams,
          prompt: finalPrompt,
          mood,
          aiRestrictions: project.ai_restrictions,
          referenceCount: allRefs.length || 1,
          hasApprovedLayout: !!project.template_image,
        });
        break;
      }
      case 'product':
        enhancedPrompt = buildProductPreservationPrompt({
          ...baseParams,
          prompt: finalPrompt,
          aiRestrictions: project.ai_restrictions,
          allowManipulation,
          hasReferences: projectHasReferences || !!project.template_image,
          hasApprovedLayout: !!project.template_image,
        });
        break;
      case 'original':
      default:
        enhancedPrompt = buildOriginalPrompt({
          ...baseParams,
          prompt: finalPrompt,
          mood, elements,
          aiRestrictions: project.ai_restrictions,
          hasReferences: projectHasReferences,
        });
        break;
    }

    const selectedModel = (finalMode === 'product' || finalMode === 'template' || finalMode === 'copy' || model === 'gemini-pro')
      ? AI_MODELS["gemini-pro"]
      : AI_MODELS["gemini-flash"];

    // Add Carousel instructions if applicable
    if (size === '1080x1350') {
      const carouselPrompt = `PAGINA 1 de 1 em um CARROSSEL INDIVIDUAL.
REGRAS CRITICAS:
- Cada pagina tem sua PROPRIA composicao e layout independente
- MAS manter a MESMA identidade visual (cores, tipografia, elementos de marca)
- Mesma paleta de cores em todas as paginas
- Mesma hierarquia tipografica e escolha de fontes
- Cada pagina tem composicao/arranjo UNICO\n\n`;
      enhancedPrompt = carouselPrompt + enhancedPrompt;
    }

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
          prompt: finalPrompt,
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

    const flyerTitle = await generateShortTitle(finalPrompt, GEMINI_API_KEY!);

    const { data: flyer, error: flyerError } = await supabase
      .from("studio_flyers")
      .insert({
        project_id: projectId,
        organization_id: project.organization_id,
        created_by: userId,
        prompt: finalPrompt,
        title: flyerTitle,
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