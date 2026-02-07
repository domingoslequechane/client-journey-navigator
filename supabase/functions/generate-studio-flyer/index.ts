import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Gemini API base
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Model IDs
const AI_MODELS = {
  "gemini-flash": "gemini-2.5-flash-image",
  "gemini-pro": "gemini-3-pro-image-preview",
} as const;

// Size configuration
const SIZE_CONFIG: Record<string, { aspectRatio: string; orientation: string; width: number; height: number }> = {
  "1080x1080": { aspectRatio: "1:1", orientation: "Quadrado", width: 1080, height: 1080 },
  "1080x1920": { aspectRatio: "9:16", orientation: "Retrato (Stories)", width: 1080, height: 1920 },
  "1920x1080": { aspectRatio: "16:9", orientation: "Paisagem (Banner)", width: 1920, height: 1080 },
  "1080x1350": { aspectRatio: "4:5", orientation: "Retrato (Carrossel)", width: 1080, height: 1350 },
  "1280x720": { aspectRatio: "16:9", orientation: "YouTube Thumbnail", width: 1280, height: 720 },
};

// Niche-specific product and visual style intelligence
const NICHE_INTELLIGENCE: Record<string, { products: string; visualStyle: string; colorPalette: string; mood: string }> = {
  'Construção': {
    products: 'hyper-realistic 3D renders of cement bags (Votoran, Cauê, InterCement), red ceramic bricks with visible pores and imperfections, orange roof tiles with terracotta texture, concrete blocks with aggregate detail, steel rebars with rust patina, wheelbarrows, yellow safety helmets with scratches',
    visualStyle: 'Industrial strength, raw materials hero shots with dramatic side-lighting, dust particles in air, textured concrete/steel backgrounds',
    colorPalette: 'Orange + Charcoal Gray + White accents, or Yellow + Dark Blue + Concrete Gray',
    mood: 'Strong, reliable, professional construction aesthetic'
  },
  'Mobiliário': {
    products: 'premium furniture with visible wood grain (walnut, oak, mahogany), velvet/leather sofa textures with light catching fabric, glass dining tables with reflections, mid-century modern chairs, king-size beds with luxury bedding',
    visualStyle: 'Luxury interior photography with warm ambient lighting, shallow depth of field, lifestyle staging',
    colorPalette: 'Dark Brown/Gold/Cream, or Black + Warm Gold + Ivory',
    mood: 'Elegant, sophisticated, aspirational living spaces'
  },
  'Automóvel': {
    products: 'photorealistic cars with metallic paint reflections, chrome wheel rims, tire treads with visible rubber texture, engine blocks with metal sheen, car interiors with stitched leather',
    visualStyle: 'Automotive photography with dramatic studio lighting, light streaks, wet surface reflections, motion blur backgrounds',
    colorPalette: 'Black + Orange/Red accent, Silver + Deep Blue, or Metallic Gray + Neon accents',
    mood: 'Speed, power, precision engineering, premium automotive'
  },
  'Imobiliário': {
    products: 'modern architectural buildings with glass facades, luxury apartment interiors with designer furniture, golden house keys, aerial views of gated communities, swimming pools with turquoise water',
    visualStyle: 'Premium real estate photography with HDR lighting, twilight exterior shots, wide-angle interiors with natural light streaming in',
    colorPalette: 'Dark Navy + Gold + White, or Forest Green + Cream + Bronze',
    mood: 'Luxury, exclusivity, dream home, investment opportunity'
  },
  'Restaurante': {
    products: 'gourmet dishes with steam rising, dewy fresh ingredients, artistic plating on dark slate, craft cocktails with condensation, wood-fired pizza with melting cheese',
    visualStyle: 'Food photography with moody dark background, directional warm lighting, macro details of textures, bokeh background elements',
    colorPalette: 'Deep Red + Warm Gold + Dark Wood, or Black + Vibrant Food Colors + White text',
    mood: 'Appetizing, artisanal, gastronomic experience'
  },
  'Beleza': {
    products: 'cosmetic products with luxe packaging, makeup palettes with powder dust clouds, skincare bottles with water droplets, salon scissors with chrome reflections, lipstick with creamy texture closeup',
    visualStyle: 'Beauty campaign photography with soft diffused lighting, pastel gradients, glass and water effects, floral accents',
    colorPalette: 'Rose Gold + Blush Pink + White, or Deep Purple + Gold + Black',
    mood: 'Glamorous, self-care, premium beauty, empowerment'
  },
  'Saúde': {
    products: 'medical equipment with clean metallic surfaces, stethoscopes, pharmaceutical packaging, digital health monitors, clean clinical environments with natural light',
    visualStyle: 'Clean medical photography with cool blue tones, sterile white backgrounds, trustworthy and calming aesthetic',
    colorPalette: 'Clean Blue + White + Soft Green, or Teal + White + Light Gray',
    mood: 'Trustworthy, professional, caring, scientifically credible'
  },
  'Tecnologia': {
    products: 'smartphones with glowing screens, laptops with neon reflections, circuit boards with soldering detail, wireless earbuds, smartwatches, gaming peripherals with RGB lighting',
    visualStyle: 'Tech product photography with neon accent lighting, dark environments, holographic/glitch effects, floating product angles',
    colorPalette: 'Black + Electric Blue/Purple neon, or Dark Gray + Green neon + White',
    mood: 'Futuristic, innovative, cutting-edge, sleek minimalism'
  },
  'Moda': {
    products: 'clothing on invisible mannequins, fabric texture closeups, designer accessories, sunglasses with reflections, watches, handbags with visible stitching',
    visualStyle: 'Fashion editorial photography with dramatic lighting, B&W with color accents, runway-inspired compositions, model silhouettes',
    colorPalette: 'Black + White + one bold accent color, or Nude/Beige + Gold + Deep tone',
    mood: 'Trendy, aspirational, runway-quality, fashion-forward'
  },
  'Fitness': {
    products: 'gym equipment with sweat detail, chrome dumbbells with dramatic lighting, protein supplements with powder explosion, athletic wear with fabric stretch detail',
    visualStyle: 'Sports photography with high contrast, dynamic angles, motion blur, sweat and intensity, gym environment backdrops',
    colorPalette: 'Black + Red/Orange energy colors, or Dark + Neon Green/Yellow',
    mood: 'Energy, power, transformation, motivation, intensity'
  },
  'Pet Shop': {
    products: 'premium pet food packaging, colorful pet toys, grooming tools with chrome detail, pet beds with fluffy textures, collars and leashes',
    visualStyle: 'Warm friendly photography with soft lighting, playful compositions, paw print elements, cute animal silhouettes',
    colorPalette: 'Warm Orange + Light Blue + Green, or Purple + Yellow + White',
    mood: 'Playful, caring, trusted pet wellness, love for animals'
  },
  'Agricultura': {
    products: 'tractors with muddy tires, seed bags with grain visible, golden wheat crops, farming machinery, fresh harvest produce, green irrigation systems',
    visualStyle: 'Agricultural photography with golden hour lighting, vast field panoramas, earth tones, natural sunlight',
    colorPalette: 'Green + Earth Brown + Golden Yellow, or Dark Green + Harvest Gold + Sky Blue',
    mood: 'Natural, productive, abundance, rooted in the earth'
  },
  'Ótica': {
    products: 'designer eyeglasses with lens reflections, sunglasses with gradient lenses, contact lens floating in solution, eye chart, optical instruments',
    visualStyle: 'Clean product photography with lens flare effects, glass reflections, sharp focus details, minimal backgrounds',
    colorPalette: 'Navy Blue + Silver + White, or Teal + Gold + Dark Gray',
    mood: 'Clarity, precision, style, vision care expertise'
  },
  'Farmácia': {
    products: 'pharmaceutical packaging with clean design, medicine bottles with droplets, health supplement bottles, pharmacy mortar and pestle, medical cross symbol',
    visualStyle: 'Clean clinical photography with bright whites, soft shadows, trustworthy compositions, health and wellness elements',
    colorPalette: 'Green + White + Light Blue, or Blue + White + Soft Teal',
    mood: 'Health, trust, pharmaceutical quality, wellness'
  },
  'Joalharia': {
    products: 'gold rings with brilliant diamond reflections, pearl necklaces with lustre, luxury watches with crystal faces, gemstones with internal refractions, velvet jewelry boxes',
    visualStyle: 'Luxury jewelry photography with dramatic spotlighting, dark backgrounds, reflective surfaces, sparkle and bokeh effects',
    colorPalette: 'Black + Gold + Diamond White, or Deep Burgundy + Gold + Cream',
    mood: 'Ultra-luxury, timeless elegance, precious, exclusive'
  },
  'Eventos': {
    products: 'elegant event decorations, balloon arches, professional stage lighting, banquet table settings, flower arrangements, confetti explosions',
    visualStyle: 'Event photography with dramatic lighting, bokeh fairy lights, celebratory atmosphere, rich warm tones',
    colorPalette: 'Gold + Black + White, or Rose Gold + Blush + Ivory, or Bold multicolor',
    mood: 'Celebration, unforgettable moments, premium events'
  },
  'Educação': {
    products: 'books with crisp pages, notebooks with quality paper texture, graduation caps with gold tassels, modern classroom technology, pencils and art supplies',
    visualStyle: 'Academic photography with warm library lighting, knowledge-inspired compositions, clean organized layouts',
    colorPalette: 'Navy Blue + Gold + White, or Green + Brown + Cream',
    mood: 'Knowledge, achievement, growth, academic excellence'
  },
};

// ==========================================
// CORE DESIGN SYSTEM - Shared quality foundation
// ==========================================
function buildDesignSystemCore(): string {
  return `
══════════════════════════════════════════════════════════════
MASTER DESIGN SYSTEM — PROFESSIONAL FLYER CREATION ENGINE
══════════════════════════════════════════════════════════════

You are an ELITE GRAPHIC DESIGNER at a world-class creative agency specializing in high-conversion social media marketing. Your work rivals the best agencies in São Paulo, Johannesburg, Lagos, and Lisbon. Every flyer you create wins awards and drives massive engagement.

YOUR CREATIVE DNA:
You think like a senior Art Director with 15+ years of experience. You understand visual psychology, consumer behavior, and brand storytelling. Every pixel has purpose. Every element serves the conversion goal.

═══════════════════════════════════════════════════════════════
COMPOSITION MASTERY (follow these rules EXACTLY):
═══════════════════════════════════════════════════════════════

1. **DEPTH & LAYERING** — Create visual depth with 3-5 distinct layers:
   - BACKGROUND layer: textured, gradient, or pattern (never flat single color)
   - MIDGROUND layer: large geometric shapes (circles, rounded rectangles, diagonal blocks)
   - FOREGROUND layer: the HERO product/subject, large and dominant
   - OVERLAY layer: text, logos, icons positioned with clear visual hierarchy
   - ACCENT layer: subtle effects (glow, shadow, light rays, particles)

2. **PRODUCT HERO SHOT** — The main subject must:
   - Occupy 40-60% of the canvas area
   - Be rendered in PHOTOREALISTIC 3D quality (not illustration, not cartoon)
   - Have professional studio lighting (key light + fill light + rim/back light)
   - Cast realistic soft shadows and reflections
   - Be slightly angled (15-30°) for dynamic perspective
   - Break out of containing shapes for depth (product overlapping geometric elements)

3. **GEOMETRIC DESIGN ELEMENTS** (inspired by top Brazilian agencies):
   - Large bold CIRCLES and SEMICIRCLES as accent shapes
   - ROUNDED RECTANGLES (border-radius: 20-40px) as content frames
   - DIAGONAL COLOR BLOCKS cutting across the composition
   - OVERLAPPING shapes with transparency (10-30% opacity)
   - Elements should be LARGE and CONFIDENT, not small and timid
   - Shapes behind the product create depth; shapes in front create framing

4. **TYPOGRAPHY THAT CONVERTS** — Text must be:
   - MAIN HEADLINE: Ultra-bold, oversized (dominates the text area), high contrast
   - KEY WORDS in accent color or different weight to create visual interest
   - SUBHEADLINE: Medium weight, smaller, complementary
   - PRICE/CTA: Bold, isolated in a badge/button shape, eye-catching
   - CONTACT: Clean, with recognizable icons (WhatsApp, Instagram, phone)
   - Text should have LETTER-SPACING and LINE-HEIGHT for readability
   - Use TEXT SHADOWS or OUTLINES when over complex backgrounds
   - Typography hierarchy must guide the eye: Headline → Subhead → CTA → Contact

5. **COLOR PSYCHOLOGY** — Apply professional color theory:
   - Use maximum 3-4 colors: primary, secondary, accent, neutral
   - High contrast between text and background (WCAG AAA when possible)
   - Accent color for CTAs, prices, and key words only
   - Dark backgrounds = premium/luxury feel (dark gray, charcoal, navy, black)
   - Bright backgrounds = energy/urgency feel (yellow, orange, red)
   - NEVER use colors that clash or reduce readability

6. **PROFESSIONAL FINISHING TOUCHES**:
   - Subtle GRAIN/NOISE texture on backgrounds (2-5% opacity) for premium feel
   - VIGNETTE effect on edges to draw eye to center
   - LIGHT EFFECTS: subtle lens flares, light rays, or glow behind products
   - SHADOW MAPPING: consistent light direction across ALL elements
   - BRAND ELEMENTS: logo in corner, social handles, contact info
   - Instagram UI hints (like/comment/share icons) for social media context

═══════════════════════════════════════════════════════════════
ABSOLUTE QUALITY STANDARDS:
═══════════════════════════════════════════════════════════════

✅ MUST ACHIEVE:
- 8K ultra-high resolution clarity
- Photorealistic product rendering (indistinguishable from professional photography)
- Magazine-quality commercial design
- Print-ready sharpness on all text
- Professional color grading with cinematic tone
- Pixel-perfect alignment of all elements
- Consistent lighting direction across the entire composition

❌ ABSOLUTELY FORBIDDEN:
- Cartoon, illustrated, or flat-design products (MUST be photorealistic 3D)
- Pixelated, blurry, or low-resolution elements
- Cluttered layouts without clear visual hierarchy
- Text that is cut off, overlapping illegibly, or too small to read
- Generic stock photo aesthetics
- Centered-everything boring layouts (use dynamic asymmetric composition)
- Watermarks, "AI generated" artifacts, or uncanny valley elements
- Misspelled words or garbled text
- Flat single-color backgrounds without depth or texture
`;
}

// ==========================================
// MODO 1: CRIAÇÃO ORIGINAL
// ==========================================
function buildOriginalCreationPrompt(params: {
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
}): string {
  const { 
    prompt, sizeConfig, clientName, niche, mood, colors, elements,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiRestrictions, aiMemoryContext, clientContext
  } = params;

  const nicheData = niche ? NICHE_INTELLIGENCE[niche] : null;

  let p = buildDesignSystemCore();

  p += `
═══════════════════════════════════════════════════════════════
MODE: ORIGINAL CREATION — 100% UNIQUE DESIGN
═══════════════════════════════════════════════════════════════

Create a COMPLETELY ORIGINAL flyer that will outperform every competitor.
Be BOLD, CREATIVE, and INNOVATIVE. Push design boundaries while maintaining professionalism.

═══════════════════════════════════════════════════════════════
DESIGN BRIEF:
═══════════════════════════════════════════════════════════════

- Canvas: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio})
- Orientation: ${sizeConfig.orientation}
${clientName ? `- Brand/Client: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${mood ? `- Visual Mood: ${mood}` : ''}
${elements ? `- Hero Element Style: ${elements}` : ''}
${fontFamily ? `- Typography: ${fontFamily} family` : ''}`;

  // Color instructions
  if (colors === 'Cores do Cliente' && (primaryColor || secondaryColor)) {
    p += `
- PRIMARY BRAND COLOR: ${primaryColor || 'not specified'} — Use this as the dominant accent color
- SECONDARY BRAND COLOR: ${secondaryColor || 'not specified'} — Use for secondary elements and contrast`;
  } else if (colors === 'Aleatórias (IA escolhe)') {
    p += `
- COLOR PALETTE: Choose a harmonious, high-impact palette that suits the industry and mood. Be creative but professional.`;
  }

  if (nicheData) {
    p += `

═══════════════════════════════════════════════════════════════
INDUSTRY INTELLIGENCE — ${niche?.toUpperCase()}:
═══════════════════════════════════════════════════════════════

PRODUCT RENDERING: ${nicheData.products}
VISUAL STYLE: ${nicheData.visualStyle}
RECOMMENDED PALETTE: ${nicheData.colorPalette}
INDUSTRY MOOD: ${nicheData.mood}`;
  }

  if (clientContext) {
    p += `

═══════════════════════════════════════════════════════════════
CLIENT INTELLIGENCE (use this for personalization):
═══════════════════════════════════════════════════════════════
${clientContext}`;
  }

  if (aiInstructions) {
    p += `

═══════════════════════════════════════════════════════════════
ADDITIONAL CREATIVE DIRECTION:
═══════════════════════════════════════════════════════════════
${aiInstructions}`;
  }

  if (aiMemoryContext) {
    p += `

═══════════════════════════════════════════════════════════════
LEARNED PREFERENCES (from past feedback — APPLY THESE):
═══════════════════════════════════════════════════════════════
${aiMemoryContext}`;
  }

  if (aiRestrictions) {
    p += `

═══════════════════════════════════════════════════════════════
RESTRICTIONS (NEVER violate these):
═══════════════════════════════════════════════════════════════
${aiRestrictions}`;
  }

  p += `

════════════════════════════════════════════════════════════════
📝 FLYER CONTENT (render ONLY this text on the flyer):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

NOW CREATE: A jaw-dropping, scroll-stopping, high-conversion commercial flyer.
The design must look like it was crafted by a premium design agency — not by AI.
Every element must serve the conversion goal. Make it IMPOSSIBLE to scroll past.`;

  return p;
}
// ==========================================
// MODO 2: CÓPIA DE TEMPLATE
// ==========================================
function buildCopyTemplatePrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  niche?: string;
  clientContext?: string;
}): string {
  const { prompt, sizeConfig, niche, clientContext } = params;
  const nicheData = niche ? NICHE_INTELLIGENCE[niche] : null;

  let p = buildDesignSystemCore();

  p += `
═══════════════════════════════════════════════════════════════
MODE: TEMPLATE REPLICATION — EXACT LAYOUT COPY
═══════════════════════════════════════════════════════════════

The FIRST IMAGE provided is the TEMPLATE you MUST REPLICATE EXACTLY.

COPY WITH PIXEL-PERFECT PRECISION:
□ Layout grid and spacing between ALL elements
□ EXACT color palette (match hex values precisely)
□ Typography style, weight, size, and hierarchy
□ Geometric background shapes (position, size, color, opacity)
□ Logo placement and contact info positioning
□ Visual flow and reading order
□ Decorative elements (lines, shapes, icons, badges)
□ Light direction and shadow style

WHAT TO REPLACE:
□ Product/subject image → Use the described content below
□ Text content → Use ONLY the text provided below

DESIGN BRIEF:
- Canvas: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio})
${niche ? `- Industry: ${niche}` : ''}
${nicheData ? `- Product Rendering: ${nicheData.products}` : ''}
${clientContext ? `\n${clientContext}` : ''}

════════════════════════════════════════════════════════════════
📝 FLYER CONTENT (render ONLY this text):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

Replicate the template EXACTLY. The only differences should be the product and text.
Maintain PHOTOREALISTIC quality. The result must be indistinguishable from the original.`;

  return p;
}

// ==========================================
// MODO 3: INSPIRAÇÃO
// ==========================================
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
  aiMemoryContext?: string;
  clientContext?: string;
  referenceCount: number;
}): string {
  const { 
    prompt, sizeConfig, clientName, niche, mood, colors,
    primaryColor, secondaryColor, fontFamily, aiInstructions, 
    aiMemoryContext, clientContext, referenceCount 
  } = params;

  const nicheData = niche ? NICHE_INTELLIGENCE[niche] : null;

  let p = buildDesignSystemCore();

  p += `
═══════════════════════════════════════════════════════════════
MODE: CREATIVE INSPIRATION — ORIGINAL DESIGN WITH REFERENCES
═══════════════════════════════════════════════════════════════

You received ${referenceCount} REFERENCE IMAGE(S) for inspiration.

STUDY THE REFERENCES AND ABSORB:
- Composition techniques (how elements are arranged and layered)
- Color harmony and contrast ratios
- Typography treatment and text hierarchy
- Product presentation style and lighting setup
- Geometric and decorative element usage
- Overall mood, energy, and visual impact
- How depth and layering create a premium feel

Then CREATE SOMETHING ORIGINAL that SURPASSES the references.

═══════════════════════════════════════════════════════════════
DESIGN BRIEF:
═══════════════════════════════════════════════════════════════

- Canvas: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio})
${clientName ? `- Brand/Client: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${mood ? `- Visual Mood: ${mood}` : ''}
${fontFamily ? `- Typography: ${fontFamily}` : ''}`;

  if (colors === 'Cores do Cliente' && (primaryColor || secondaryColor)) {
    p += `
- PRIMARY BRAND COLOR: ${primaryColor || 'not specified'}
- SECONDARY BRAND COLOR: ${secondaryColor || 'not specified'}`;
  }

  if (nicheData) {
    p += `

INDUSTRY INTELLIGENCE — ${niche?.toUpperCase()}:
- Products: ${nicheData.products}
- Visual Style: ${nicheData.visualStyle}
- Palette: ${nicheData.colorPalette}
- Mood: ${nicheData.mood}`;
  }

  if (clientContext) {
    p += `\n\nCLIENT INTELLIGENCE:\n${clientContext}`;
  }
  if (aiInstructions) {
    p += `\n\nADDITIONAL CREATIVE DIRECTION:\n${aiInstructions}`;
  }
  if (aiMemoryContext) {
    p += `\n\nLEARNED PREFERENCES (APPLY THESE):\n${aiMemoryContext}`;
  }

  p += `

════════════════════════════════════════════════════════════════
📝 FLYER CONTENT (render ONLY this text on the flyer):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

Create an ORIGINAL masterpiece inspired by the references.
Surpass them in quality, creativity, and visual impact.
The result must look like premium agency work — not AI-generated.`;

  return p;
}

// ==========================================
// MODO 4: PRODUTO EXATO (ANTI-ALTERAÇÃO MÁXIMA)
// ==========================================
function buildProductPreservationPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
}): string {
  const { 
    prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, aiInstructions, aiMemoryContext, clientContext
  } = params;

  const nicheData = niche ? NICHE_INTELLIGENCE[niche] : null;

  let p = buildDesignSystemCore();

  p += `
╔══════════════════════════════════════════════════════════════╗
║  ⚠️ STRICT PRODUCT PRESERVATION MODE — LEGAL COMPLIANCE     ║
╚══════════════════════════════════════════════════════════════╝

The reference image contains the EXACT REAL product being advertised.
This product MUST remain 100% IDENTICAL in the generated flyer.

FORBIDDEN — You MUST NOT:
❌ Redesign, recreate, reinterpret, or stylize the product
❌ Change shape, size, proportions, materials, or colors
❌ Modify textures, logos, labels, or brand markings
❌ Generate a "similar" product or stock version
❌ Create 3D interpretations or illustrated versions

REQUIRED — You MUST:
✅ EXTRACT the exact product from the reference image
✅ PLACE IT as the hero element (large, prominent, 40-60% of canvas)
✅ Keep it PIXEL-PERFECT identical to the reference
✅ Design ONLY the background, layout, and text AROUND it

BACKGROUND DESIGN (full creative freedom):
- Bold geometric shapes, circles, rounded rectangles
- Vibrant gradient backgrounds with texture
- Professional color blocking and depth
- Typography hierarchy and text layout

DESIGN SPECIFICATIONS:
- Canvas: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio})
${clientName ? `- Brand: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${primaryColor ? `- Primary color: ${primaryColor}` : ''}
${secondaryColor ? `- Secondary color: ${secondaryColor}` : ''}
${fontFamily ? `- Font: ${fontFamily}` : ''}
${nicheData ? `- Visual style: ${nicheData.visualStyle}` : ''}`;

  if (clientContext) {
    p += `\n\nCLIENT INTELLIGENCE:\n${clientContext}`;
  }
  if (aiInstructions) {
    p += `\n\nADDITIONAL INSTRUCTIONS:\n${aiInstructions}`;
  }
  if (aiMemoryContext) {
    p += `\n\nLEARNED PREFERENCES:\n${aiMemoryContext}`;
  }

  p += `

════════════════════════════════════════════════════════════════
📝 FLYER CONTENT (render ONLY this text):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════
⚠️ LEGAL: The product from the reference MUST appear EXACTLY as-is.
Design ONLY the background, layout, and text around the preserved product.`;

  return p;
}

// ==========================================
// MODO 5: TEMPLATE MEMORY (STRICT REPLICATION)
// ==========================================
function buildTemplateMemoryPrompt(params: {
  prompt: string;
  sizeConfig: typeof SIZE_CONFIG[string];
  clientName?: string;
  niche?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  aiInstructions?: string;
  aiMemoryContext?: string;
  clientContext?: string;
  hasProductImage: boolean;
}): string {
  const { 
    prompt, sizeConfig, clientName, niche,
    primaryColor, secondaryColor, fontFamily, 
    aiInstructions, aiMemoryContext, clientContext, hasProductImage 
  } = params;

  let p = buildDesignSystemCore();

  p += `
╔══════════════════════════════════════════════════════════════╗
║  STRICT TEMPLATE REPLICATION MODE                            ║
║  CLIENT: ${clientName || 'Unknown'}                          ║
║  APPROVED TEMPLATE — MANDATORY LAYOUT COMPLIANCE             ║
╚══════════════════════════════════════════════════════════════╝

The FIRST REFERENCE IMAGE is the OFFICIAL APPROVED TEMPLATE.

COPY PIXEL-PERFECT:
□ Logo position and size
□ Social media icons style and position
□ Title typography (font style, color, size, position)
□ Color palette (EXACT hex values)
□ Background geometric shapes
□ Footer structure with contacts layout
□ Overall layout grid and spacing
□ Decorative elements

WHAT TO REPLACE:
□ Product image → NEW product${hasProductImage ? ' (SECOND IMAGE)' : ''}
□ Text content → NEW copy below

DESIGN SPECS:
- Canvas: ${sizeConfig.width}×${sizeConfig.height}px (${sizeConfig.aspectRatio})
${clientName ? `- Client: ${clientName}` : ''}
${niche ? `- Industry: ${niche}` : ''}
${primaryColor ? `- Primary color: ${primaryColor}` : ''}
${secondaryColor ? `- Secondary color: ${secondaryColor}` : ''}
${fontFamily ? `- Font: ${fontFamily}` : ''}`;

  if (clientContext) {
    p += `\n\nCLIENT INTELLIGENCE:\n${clientContext}`;
  }
  if (aiInstructions) {
    p += `\n\nADDITIONAL CLIENT INSTRUCTIONS:\n${aiInstructions}`;
  }
  if (aiMemoryContext) {
    p += `\n\nLEARNED PREFERENCES:\n${aiMemoryContext}`;
  }

  p += `

════════════════════════════════════════════════════════════════
📝 FLYER CONTENT (render ONLY this text):
════════════════════════════════════════════════════════════════

${prompt}

════════════════════════════════════════════════════════════════

Generate a flyer VISUALLY IDENTICAL to the template.
ONLY differences: product image and text content.`;

  return p;
}

// ==========================================
// BUILD CLIENT CONTEXT for richer prompts
// ==========================================
function buildClientContext(client: Record<string, unknown> | null): string {
  if (!client) return '';
  
  const parts: string[] = [];
  if (client.company_name) parts.push(`Company: ${client.company_name}`);
  if (client.contact_name) parts.push(`Contact: ${client.contact_name}`);
  if (client.services && Array.isArray(client.services) && client.services.length > 0) {
    parts.push(`Services: ${client.services.join(', ')}`);
  }
  if (client.website) parts.push(`Website: ${client.website}`);
  if (client.source) parts.push(`Source: ${client.source}`);
  if (client.notes) parts.push(`Notes: ${String(client.notes).substring(0, 200)}`);
  
  return parts.length > 0 ? parts.join('\n') : '';
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
      projectId, 
      prompt, 
      size = '1080x1080', 
      style = 'vivid', 
      mode = 'original',
      model = 'gemini-flash',
      niche,
      mood,
      colors,
      elements,
      preserveProduct = false,
      layoutReferences = [],
      additionalReferences = [],
    } = await req.json();

    if (!projectId || !prompt) {
      return new Response(JSON.stringify({ error: "projectId and prompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project details
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

    // Fetch linked client data for richer context
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
        console.error("Error fetching client data:", e);
      }
    }

    // Fetch AI learning history (increased limit for deeper memory)
    let aiMemoryContext = "";
    try {
      const { data: learnings } = await supabase
        .from('studio_ai_learnings')
        .select('content, learning_type')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(25);

      if (learnings && learnings.length > 0) {
        aiMemoryContext = learnings.map(l => `- [${l.learning_type.toUpperCase()}]: ${l.content}`).join('\n');
      }
    } catch (e) {
      console.error("Error fetching learning history:", e);
    }

    const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG["1080x1080"];

    // Determine final mode
    const finalMode = preserveProduct ? 'product' : mode;

    // Build prompt based on generation mode
    let enhancedPrompt: string;

    const baseParams = {
      prompt,
      sizeConfig,
      clientName: project.name,
      niche: niche || project.niche,
      primaryColor: project.primary_color,
      secondaryColor: project.secondary_color,
      fontFamily: project.font_family,
      aiInstructions: project.ai_instructions,
      aiMemoryContext,
      clientContext,
    };

    switch (finalMode) {
      case 'template':
        enhancedPrompt = buildTemplateMemoryPrompt({
          ...baseParams,
          hasProductImage: additionalReferences.length > 0 || (project.reference_images?.length || 0) > 1,
        });
        break;

      case 'copy':
        enhancedPrompt = buildCopyTemplatePrompt({ 
          prompt, 
          sizeConfig, 
          niche: niche || project.niche,
          clientContext,
        });
        break;

      case 'inspiration':
        const allRefs = [...layoutReferences, ...additionalReferences, ...(project.reference_images || [])];
        enhancedPrompt = buildInspirationPrompt({
          ...baseParams,
          mood,
          colors,
          referenceCount: allRefs.length || 1,
        });
        break;

      case 'product':
        enhancedPrompt = buildProductPreservationPrompt(baseParams);
        break;

      case 'original':
      default:
        enhancedPrompt = buildOriginalCreationPrompt({
          ...baseParams,
          mood,
          colors,
          elements,
          aiRestrictions: project.ai_restrictions,
        });
        break;
    }

    // Select the appropriate model
    // For product and template modes, always use Pro for better accuracy
    const selectedModel = (finalMode === 'product' || finalMode === 'template' || model === 'gemini-pro')
      ? AI_MODELS["gemini-pro"] 
      : AI_MODELS["gemini-flash"];

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("=== GENERATING FLYER ===");
    console.log("Mode:", finalMode);
    console.log("Model:", selectedModel);
    console.log("Client:", project.name);
    console.log("Size:", size, "->", sizeConfig);
    console.log("Enhanced prompt preview:", enhancedPrompt.substring(0, 300) + "...");

    // Build the content parts - TEXT MUST COME BEFORE IMAGES
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: enhancedPrompt }
    ];

    // Collect all reference images
    const allReferenceImages: string[] = [];
    
    // For template mode, template image comes first
    if (finalMode === 'template' && project.template_image) {
      allReferenceImages.push(project.template_image);
    }
    
    // Add layout references
    allReferenceImages.push(...layoutReferences);
    
    // Add additional references
    allReferenceImages.push(...additionalReferences);
    
    // Add project reference images
    if (project.reference_images) {
      allReferenceImages.push(...project.reference_images);
    }

    // Limit images based on mode
    const maxImages = finalMode === 'product' ? 1 : (finalMode === 'template' ? 2 : 3);
    const imagesToProcess = allReferenceImages.slice(0, maxImages);

    console.log("Reference images count:", imagesToProcess.length);

    // Add reference images if provided
    const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

    for (let i = 0; i < imagesToProcess.length; i++) {
      const imgUrl = imagesToProcess[i];
      try {
        if (imgUrl.startsWith('data:')) {
          const matches = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            parts.push({
              inlineData: { mimeType: matches[1], data: matches[2] }
            });
          }
        } else {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          try {
            const imgResp = await fetch(imgUrl, { 
              signal: controller.signal,
              headers: { 'Accept': 'image/png, image/jpeg, image/webp, image/gif, */*' }
            });
            clearTimeout(timeoutId);

            if (imgResp.ok) {
              let contentType = imgResp.headers.get('content-type') || 'image/png';
              contentType = contentType.split(';')[0].trim().toLowerCase();

              if (!SUPPORTED_MIME_TYPES.includes(contentType)) {
                console.warn(`Image ${i + 1}: Unsupported MIME type (${contentType}). Skipping.`);
                continue;
              }

              const imgBuffer = await imgResp.arrayBuffer();

              if (imgBuffer.byteLength > 4 * 1024 * 1024) {
                console.log(`Image ${i + 1}: Skipped - too large`);
                continue;
              }

              const uint8Array = new Uint8Array(imgBuffer);
              let base64 = '';
              const chunkSize = 8192;
              for (let j = 0; j < uint8Array.length; j += chunkSize) {
                const chunk = uint8Array.slice(j, j + chunkSize);
                base64 += String.fromCharCode.apply(null, Array.from(chunk));
              }
              base64 = btoa(base64);

              parts.push({
                inlineData: { mimeType: contentType, data: base64 }
              });
              console.log(`Image ${i + 1}: Added successfully`);
            }
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.error(`Image ${i + 1}: Fetch error - ${fetchErr}`);
          }
        }
      } catch (e) {
        console.error(`Error processing reference image ${i + 1}:`, e);
      }
    }

    // Call Gemini Image API
    const geminiResponse = await fetch(
      `${GEMINI_API_BASE}/models/${selectedModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);

      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to generate image",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("Gemini API response received");

    // Extract image from Gemini response
    let imageUrl: string | null = null;

    const responseParts = geminiData?.candidates?.[0]?.content?.parts;
    if (Array.isArray(responseParts)) {
      for (const part of responseParts) {
        const inline = part?.inlineData ?? part?.inline_data;
        if (inline?.data && (inline?.mimeType || inline?.mime_type)) {
          const mimeType = inline?.mimeType ?? inline?.mime_type;
          imageUrl = `data:${mimeType};base64,${inline.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(geminiData).substring(0, 1000));
      return new Response(
        JSON.stringify({
          error: "No image generated. The AI may not have understood the request.",
          response: geminiData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If it's a base64 data URL, upload to storage
    let publicUrl = imageUrl;
    
    if (imageUrl.startsWith("data:image/")) {
      const matches = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        const extension = mimeType.split("/")[1] || "png";
        
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
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

        const { data: { publicUrl: storageUrl } } = supabase.storage
          .from("studio-assets")
          .getPublicUrl(fileName);
        
        publicUrl = storageUrl;
      }
    }

    // Save flyer to database
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
      imageUrl: publicUrl 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate flyer error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
