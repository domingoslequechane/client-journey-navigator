/**
 * carouselCanvasRenderer.ts — v2 (Professional Edition)
 *
 * Design principles extracted from reference images:
 * - Full-bleed product image as background (cover mode)
 * - Dark gradient overlay for text legibility
 * - Large editorial typography with accent color words
 * - Geometric accent shape (circle arc) bleeding off canvas edge
 * - Linear pagination sequence (01  •02•  03  04)
 * - Pill-shaped CTA element
 * - Subtle vertical stripe texture when no image
 */

export interface SlideRenderConfig {
  width: number;
  height: number;
  ratio: '1:1' | '9:16' | '16:9' | '4:5';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoBlob?: Blob | null;
  productBlob?: Blob | null;
  templateBlob?: Blob | null; // <--- The completely custom base template
  headline: string;
  body: string;
  slideIndex: number;
  totalSlides: number;
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha = 1): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function isDark(hex: string) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

// ── Font helpers ───────────────────────────────────────────────────────────────

async function loadFont(family: string) {
  try {
    const q = family.replace(/ /g, '+');
    const url = `https://fonts.googleapis.com/css2?family=${q}:wght@400;600;700;800;900&display=swap`;
    if (!document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    }
    await document.fonts.ready;
  } catch { /* silent fallback */ }
}

// ── Image helpers ──────────────────────────────────────────────────────────────

async function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  blob: Blob,
  x: number, y: number, w: number, h: number,
  slideIndex: number, totalSlides: number
) {
  return new Promise<void>((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      // Base scale to cover the canvas
      let scale = Math.max(w / img.width, h / img.height);
      
      // DYNAMIC PARALLAX: Zoom in by 18% to create panning room
      const zoom = 1.18;
      const sw = img.width * scale * zoom;
      const sh = img.height * scale * zoom;

      // Calculate maximum horizontal pan distance
      const maxPanX = sw - w;
      
      // Calculate slide progress ratio (0.0 to 1.0)
      const progress = totalSlides > 1 ? slideIndex / (totalSlides - 1) : 0;
      
      // Pan from left (0) to right (maxPanX) as progression increases
      const sx = x - (maxPanX * progress);
      
      // Center vertically 
      const sy = y - (sh - h) / 2;

      ctx.drawImage(img, sx, sy, sw, sh);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}

async function drawContainImage(
  ctx: CanvasRenderingContext2D,
  blob: Blob,
  x: number, y: number, w: number, h: number
) {
  return new Promise<void>((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(w / img.width, h / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}

// ── Text helpers ───────────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ── Layout config ──────────────────────────────────────────────────────────────

function getScale(width: number) {
  // Normalise around 1080 wide
  return width / 1080;
}

interface Layout {
  pad: number;
  topBarY: number;
  textZoneY: number; // top of headline zone
  headlineFS: number;
  headlineLH: number;
  bodyFS: number;
  bodyLH: number;
  maxTextW: number;
  circleRadius: number;
}

function getLayout(w: number, h: number, ratio: string): Layout {
  const sc = getScale(w);
  const base = {
    pad: Math.round(56 * sc),
    topBarY: Math.round(60 * sc),
    textZoneY: Math.round(h * (ratio === '16:9' ? 0.36 : 0.52)),
    headlineFS: Math.round((ratio === '16:9' ? 72 : ratio === '1:1' ? 80 : 88) * sc),
    headlineLH: Math.round((ratio === '16:9' ? 84 : ratio === '1:1' ? 94 : 102) * sc),
    bodyFS: Math.round((ratio === '16:9' ? 32 : 36) * sc),
    bodyLH: Math.round((ratio === '16:9' ? 46 : 52) * sc),
    maxTextW: Math.round((ratio === '16:9' ? w * 0.55 : w - 56 * sc * 2)),
    circleRadius: Math.round((ratio === '16:9' ? h * 0.55 : h * 0.42) * sc),
  };
  return base;
}

// ── Main render ────────────────────────────────────────────────────────────────

export async function renderCarouselSlide(cfg: SlideRenderConfig): Promise<Blob> {
  const { width, height, ratio, primaryColor, secondaryColor,
    fontFamily, logoBlob, productBlob, templateBlob, headline, body,
    slideIndex, totalSlides } = cfg;

  await loadFont(fontFamily);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const L = getLayout(width, height, ratio);
  const sc = getScale(width);

  // ── 1. BACKGROUND ──────────────────────────────────────────────────────────

  if (templateBlob) {
    // TEMPLATE MODE: The user provided a raw Canva/Figma template!
    // We draw it directly without any dark overlays or animations, granting 100% customizability.
    await drawCoverImage(ctx, templateBlob, 0, 0, width, height, slideIndex, totalSlides);
  } else if (productBlob) {
    // Full-bleed product photo with dynamic Parallax panning
    await drawCoverImage(ctx, productBlob, 0, 0, width, height, slideIndex, totalSlides);

    // Strong dark overlay — bottom heavy for text readability
    const overlay = ctx.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, 'rgba(0,0,0,0.55)');
    overlay.addColorStop(0.35, 'rgba(0,0,0,0.25)');
    overlay.addColorStop(0.65, 'rgba(0,0,0,0.7)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Clean dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Subtle vertical stripe texture
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const stripeW = Math.round(60 * sc);
    for (let x = 0; x < width; x += stripeW) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }

    // Top-left primary colour radial glow — subtle
    const glow = ctx.createRadialGradient(0, 0, 0, width * 0.25, height * 0.2, width * 0.7);
    glow.addColorStop(0, hexToRgba(primaryColor, 0.14));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // ── 2. GEOMETRIC ACCENT SHAPE ──────────────────────────────────────────────
  // Only draw our hardcoded aesthetic shapes if the user didn't provide a custom template
  if (!templateBlob) {
    const progress = totalSlides > 1 ? slideIndex / (totalSlides - 1) : 0;
    
    // Dynamic X/Y so the shape feels like it's rotating/moving as the user swipes
    const cx = width + L.circleRadius * 0.05 + (L.circleRadius * 0.15 * progress);
    const cy = height - L.circleRadius * 0.4 + (L.circleRadius * 0.6 * progress);
    
    const r = L.circleRadius;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    grad.addColorStop(0, hexToRgba(primaryColor, 0.9));
    grad.addColorStop(0.6, hexToRgba(primaryColor, 0.6));
    grad.addColorStop(1, hexToRgba(primaryColor, 0));
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner ring (filled solid)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = primaryColor;
    ctx.fill();

    // Punch-out centre hole for ring effect
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = productBlob ? 'rgba(0,0,0,0.82)' : '#0a0a0a';
    ctx.fill();
  }

  // ── 3. TOP BAR: Logo + Pagination ──────────────────────────────────────────
  {
    const pad = L.pad;
    const topY = L.topBarY;

    // Logo
    if (logoBlob) {
      const logoMaxW = Math.round(160 * sc);
      const logoMaxH = Math.round(44 * sc);
      ctx.save();
      await drawContainImage(ctx, logoBlob, pad, topY, logoMaxW, logoMaxH);
      ctx.restore();
    }

    // Linear pagination: 01  02  •03•  04  05
    const pageFS = Math.round(15 * sc);
    const pageGap = Math.round(22 * sc);
    ctx.font = `600 ${pageFS}px "${fontFamily}", monospace`;
    ctx.textAlign = 'right';

    // Measure total width to right-align
    const labels = Array.from({ length: totalSlides }, (_, i) =>
      String(i + 1).padStart(2, '0')
    );
    const totalPagW = labels.reduce((sum, lbl) => sum + ctx.measureText(lbl).width + pageGap, 0);
    let px = width - pad;

    for (let i = totalSlides - 1; i >= 0; i--) {
      const lbl = labels[i];
      const isActive = i === slideIndex;
      const lw = ctx.measureText(lbl).width;
      ctx.textAlign = 'left';
      if (isActive) {
        ctx.font = `800 ${pageFS}px "${fontFamily}", monospace`;
        ctx.fillStyle = primaryColor;
      } else {
        ctx.font = `500 ${pageFS}px "${fontFamily}", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
      }
      ctx.fillText(lbl, px - lw, topY + pageFS + 2);
      px -= lw + pageGap;
    }
  }

  // ── 4. HEADLINE (large, editorial, accent on key word) ─────────────────────
  {
    const pad = L.pad;
    const maxW = L.maxTextW;
    let textY = L.textZoneY;

    // Split headline: detect if there's a key phrase to highlight
    // Heuristic: highlight first "strong" segment (before comma or colon if exists,
    // otherwise highlight last 1-2 words IF they're short)
    const headWords = headline.split(' ');

    // Find a pivot point for colour split — roughly 40% through
    const pivot = Math.max(1, Math.floor(headWords.length * 0.45));
    const part1 = headWords.slice(0, pivot).join(' ');
    const part2 = headWords.slice(pivot).join(' ');

    // Part 1 — muted white
    ctx.font = `800 ${L.headlineFS}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const lines1 = wrapText(ctx, part1, maxW);
    lines1.slice(0, 2).forEach((line) => {
      ctx.fillText(line, pad, textY);
      textY += L.headlineLH;
    });

    // Part 2 — brand primary colour (bold accent)
    ctx.fillStyle = primaryColor;
    const lines2 = wrapText(ctx, part2, maxW);
    lines2.slice(0, 3).forEach((line) => {
      ctx.fillText(line, pad, textY);
      textY += L.headlineLH;
    });

    textY += Math.round(12 * sc);

    // ── 5. BODY ──────────────────────────────────────────────────────────────
    ctx.font = `400 ${L.bodyFS}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    const bodyLines = wrapText(ctx, body, maxW);
    bodyLines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, pad, textY + i * L.bodyLH);
    });

    textY += bodyLines.slice(0, 3).length * L.bodyLH + Math.round(32 * sc);

    // ── 6. PILL CTA ─────────────────────────────────────────────────────────
    if (slideIndex === 0) {
      // Cover slide: "ARRASTE →" pill
      const ctaLabel = 'ARRASTE →';
      const ctaFS = Math.round(14 * sc);
      ctx.font = `600 ${ctaFS}px "${fontFamily}", sans-serif`;
      const ctaW = ctx.measureText(ctaLabel).width + Math.round(36 * sc);
      const ctaH = Math.round(40 * sc);
      const ctaX = pad;
      const ctaY = textY;

      // Pill outline
      drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
      ctx.strokeStyle = hexToRgba(primaryColor, 0.7);
      ctx.lineWidth = Math.round(1.5 * sc);
      ctx.stroke();

      ctx.fillStyle = hexToRgba(primaryColor, 0.12);
      drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(ctaLabel, ctaX + ctaW / 2, ctaY + ctaH / 2 + ctaFS * 0.38);
      ctx.textAlign = 'left';
    } else if (slideIndex === totalSlides - 1) {
      // CTA slide: filled pill
      const ctaLabel = 'QUERO SABER MAIS →';
      const ctaFS = Math.round(14 * sc);
      ctx.font = `700 ${ctaFS}px "${fontFamily}", sans-serif`;
      const ctaW = ctx.measureText(ctaLabel).width + Math.round(48 * sc);
      const ctaH = Math.round(46 * sc);
      const ctaX = pad;
      const ctaY = textY;

      drawRoundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
      ctx.fillStyle = primaryColor;
      ctx.fill();

      ctx.fillStyle = isDark(primaryColor) ? '#ffffff' : '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(ctaLabel, ctaX + ctaW / 2, ctaY + ctaH / 2 + ctaFS * 0.38);
      ctx.textAlign = 'left';
    }
  }

  // ── 7. BOTTOM ACCENT LINE ──────────────────────────────────────────────────
  if (!templateBlob) {
    const lineH = Math.round(4 * sc);
    const lineY = height - L.pad - lineH;
    const lineW = Math.round(80 * sc);
    const grad = ctx.createLinearGradient(L.pad, 0, L.pad + lineW, 0);
    grad.addColorStop(0, primaryColor);
    grad.addColorStop(1, hexToRgba(primaryColor, 0));
    ctx.fillStyle = grad;
    drawRoundedRect(ctx, L.pad, lineY, lineW, lineH, lineH / 2);
    ctx.fill();
  }

  // ── EXPORT ────────────────────────────────────────────────────────────────
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/png');
  });
}

// ── Dimension utilities ────────────────────────────────────────────────────────

export function getSlideDimensions(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case 'story':     return { width: 1080, height: 1920 };
    case 'landscape': return { width: 1920, height: 1080 };
    case 'portrait':  return { width: 1080, height: 1350 };
    default:          return { width: 1080, height: 1080 };
  }
}

export function getRatioKey(aspectRatio: string): '1:1' | '9:16' | '16:9' | '4:5' {
  switch (aspectRatio) {
    case 'story':     return '9:16';
    case 'landscape': return '16:9';
    case 'portrait':  return '4:5';
    default:          return '1:1';
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, data] = dataUrl.split(',');
  const mime = head.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
