/**
 * carouselCanvasRenderer.ts — v3 (Pagination Templates Edition)
 *
 * Design principles:
 * - Full-bleed product image as background (cover mode)
 * - Dark gradient overlay for text legibility
 * - Large editorial typography with accent color words
 * - Geometric accent shape (circle arc) bleeding off canvas edge
 * - 5 Pagination templates: dots | numbers | fraction | line | none
 * - Cover (slide 0) and CTA (last slide) NEVER show pagination
 * - Pill-shaped CTA element
 * - Subtle vertical stripe texture when no image
 */

export type PaginationStyle = 'dots' | 'numbers' | 'fraction' | 'line' | 'none';

export interface SlideRenderConfig {
  width: number;
  height: number;
  ratio: '1:1' | '9:16' | '16:9' | '4:5';
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoBlob?: Blob | null;
  productBlob?: Blob | null;
  templateBlob?: Blob | null;
  headline: string;
  body: string;
  slideIndex: number;
  totalSlides: number;
  paginationStyle?: PaginationStyle; // default 'numbers'
  footerText?: string;
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
      let scale = Math.max(w / img.width, h / img.height);
      const zoom = 1.18;
      const sw = img.width * scale * zoom;
      const sh = img.height * scale * zoom;
      const maxPanX = sw - w;
      const progress = totalSlides > 1 ? slideIndex / (totalSlides - 1) : 0;
      const sx = x - (maxPanX * progress);
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
  return width / 1080;
}

interface Layout {
  pad: number;
  topBarY: number;
  textZoneY: number;
  headlineFS: number;
  headlineLH: number;
  bodyFS: number;
  bodyLH: number;
  maxTextW: number;
  circleRadius: number;
}

function getLayout(w: number, h: number, ratio: string): Layout {
  const sc = getScale(w);
  return {
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
}

// ── Pagination Renderers ───────────────────────────────────────────────────────
// Rule: Cover (index 0) and CTA (index totalSlides-1) NEVER show pagination.

function isCoverOrCTA(slideIndex: number, totalSlides: number): boolean {
  return slideIndex === 0 || slideIndex === totalSlides - 1;
}

function drawPagination(
  ctx: CanvasRenderingContext2D,
  style: PaginationStyle,
  slideIndex: number,
  totalSlides: number,
  width: number,
  height: number,
  pad: number,
  topBarY: number,
  sc: number,
  primaryColor: string,
  fontFamily: string
) {
  // ✅ MANDATORY: Cover and CTA slides NEVER get pagination
  if (isCoverOrCTA(slideIndex, totalSlides) || style === 'none') return;

  // The "inner" slides are those between cover and CTA
  // Their visible index within the inner set (1-based)
  const innerSlides = Math.max(1, totalSlides - 2); // total minus cover and CTA
  const innerIndex = Math.max(0, Math.min(innerSlides - 1, slideIndex - 1)); // 0-based within inner slides

  switch (style) {

    // ─── DOTS ────────────────────────────────────────────────────────────────
    case 'dots': {
      const dotR = Math.round(5 * sc);
      const dotGap = Math.round(16 * sc);
      const totalW = innerSlides * (dotR * 2) + (innerSlides - 1) * dotGap;
      let dx = width / 2 - totalW / 2;
      const dy = Math.round(topBarY + dotR);

      for (let i = 0; i < innerSlides; i++) {
        ctx.beginPath();
        ctx.arc(dx + dotR, dy, i === innerIndex ? dotR * 1.5 : dotR, 0, Math.PI * 2);
        ctx.fillStyle = i === innerIndex ? primaryColor : 'rgba(255,255,255,0.35)';
        ctx.fill();
        dx += dotR * 2 + dotGap;
      }
      break;
    }

    // ─── NUMBERS (linear: 01  •02•  03) ─────────────────────────────────────
    case 'numbers': {
      const pageFS = Math.round(15 * sc);
      const pageGap = Math.round(22 * sc);
      ctx.font = `600 ${pageFS}px "${fontFamily}", monospace`;
      ctx.textAlign = 'right';

      const labels = Array.from({ length: innerSlides }, (_, i) =>
        String(i + 1).padStart(2, '0')
      );
      let px = width - pad;

      for (let i = innerSlides - 1; i >= 0; i--) {
        const lbl = labels[i];
        const isActive = i === innerIndex;
        const lw = ctx.measureText(lbl).width;
        ctx.textAlign = 'left';
        if (isActive) {
          ctx.font = `800 ${pageFS}px "${fontFamily}", monospace`;
          ctx.fillStyle = primaryColor;
        } else {
          ctx.font = `500 ${pageFS}px "${fontFamily}", sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
        }
        ctx.fillText(lbl, px - lw, topBarY + pageFS + 2);
        px -= lw + pageGap;
      }
      ctx.textAlign = 'left';
      break;
    }

    // ─── FRACTION (2 / 5) ────────────────────────────────────────────────────
    case 'fraction': {
      const fs = Math.round(18 * sc);
      const smallFS = Math.round(13 * sc);
      const current = String(innerIndex + 1).padStart(2, '0');
      const total = String(innerSlides).padStart(2, '0');
      const separator = '  /  ';
      const fullText = `${current}${separator}${total}`;

      ctx.textAlign = 'right';
      ctx.font = `700 ${fs}px "${fontFamily}", monospace`;
      const totalW = ctx.measureText(fullText).width;
      const startX = width - pad - totalW;
      const baseY = topBarY + fs + 2;

      // Current number — highlighted
      ctx.fillStyle = primaryColor;
      ctx.fillText(current, startX + ctx.measureText(current).width, baseY);

      // Separator — dim
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `400 ${smallFS}px "${fontFamily}", sans-serif`;
      const sepX = startX + ctx.measureText(current).width;
      ctx.fillText(separator, sepX + ctx.measureText(separator).width / 2, baseY);

      // Total — dim
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `500 ${smallFS}px "${fontFamily}", monospace`;
      ctx.fillText(fullText, width - pad, baseY);

      ctx.textAlign = 'left';
      break;
    }

    // ─── LINE (progress bar) ─────────────────────────────────────────────────
    case 'line': {
      const barH = Math.round(3 * sc);
      const barY = Math.round(topBarY / 2 - barH / 2);
      const barX = pad;
      const barW = width - pad * 2;
      const progress = innerSlides > 1 ? innerIndex / (innerSlides - 1) : 1;
      const filledW = Math.round(barW * progress);

      // Background track
      drawRoundedRect(ctx, barX, barY, barW, barH, barH / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();

      // Filled portion
      if (filledW > 0) {
        const grad = ctx.createLinearGradient(barX, 0, barX + filledW, 0);
        grad.addColorStop(0, hexToRgba(primaryColor, 0.6));
        grad.addColorStop(1, primaryColor);
        drawRoundedRect(ctx, barX, barY, filledW, barH, barH / 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Step number below bar (small)
      const fs = Math.round(11 * sc);
      ctx.font = `700 ${fs}px "${fontFamily}", sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`${innerIndex + 1}/${innerSlides}`, width - pad, barY + barH + fs + Math.round(4 * sc));
      ctx.textAlign = 'left';
      break;
    }
  }
}

// ── Main render ────────────────────────────────────────────────────────────────

export async function renderCarouselSlide(cfg: SlideRenderConfig): Promise<Blob> {
  const { width, height, ratio, primaryColor, secondaryColor,
    fontFamily, logoBlob, productBlob, templateBlob, headline, body,
    slideIndex, totalSlides, paginationStyle = 'numbers', footerText } = cfg;

  await loadFont(fontFamily);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const L = getLayout(width, height, ratio);
  const sc = getScale(width);

  // ── 1. BACKGROUND ──────────────────────────────────────────────────────────

  if (templateBlob) {
    await drawCoverImage(ctx, templateBlob, 0, 0, width, height, slideIndex, totalSlides);
  } else if (productBlob) {
    await drawCoverImage(ctx, productBlob, 0, 0, width, height, slideIndex, totalSlides);

    const overlay = ctx.createLinearGradient(0, 0, 0, height);
    overlay.addColorStop(0, 'rgba(0,0,0,0.55)');
    overlay.addColorStop(0.35, 'rgba(0,0,0,0.25)');
    overlay.addColorStop(0.65, 'rgba(0,0,0,0.7)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const stripeW = Math.round(60 * sc);
    for (let x = 0; x < width; x += stripeW) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }

    const glow = ctx.createRadialGradient(0, 0, 0, width * 0.25, height * 0.2, width * 0.7);
    glow.addColorStop(0, hexToRgba(primaryColor, 0.14));
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // ── 2. GEOMETRIC ACCENT SHAPE ──────────────────────────────────────────────
  if (!templateBlob) {
    const progress = totalSlides > 1 ? slideIndex / (totalSlides - 1) : 0;
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

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = primaryColor;
    ctx.fill();

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

    // ✅ Pagination — delegates to template renderer (respects cover/CTA rule internally)
    drawPagination(
      ctx, paginationStyle,
      slideIndex, totalSlides,
      width, height, pad, topY, sc,
      primaryColor, fontFamily
    );
  }

  // ── 4. HEADLINE ─────────────────────────────────────────────────────────────
  {
    const pad = L.pad;
    const maxW = L.maxTextW;
    let textY = L.textZoneY;

    const headWords = headline.split(' ');
    const pivot = Math.max(1, Math.floor(headWords.length * 0.45));
    const part1 = headWords.slice(0, pivot).join(' ');
    const part2 = headWords.slice(pivot).join(' ');

    ctx.font = `800 ${L.headlineFS}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const lines1 = wrapText(ctx, part1, maxW);
    lines1.slice(0, 2).forEach((line) => {
      ctx.fillText(line, pad, textY);
      textY += L.headlineLH;
    });

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

    // ── 6. PILL CTA ──────────────────────────────────────────────────────────
    if (slideIndex === 0) {
      const ctaLabel = 'ARRASTE →';
      const ctaFS = Math.round(14 * sc);
      ctx.font = `600 ${ctaFS}px "${fontFamily}", sans-serif`;
      const ctaW = ctx.measureText(ctaLabel).width + Math.round(36 * sc);
      const ctaH = Math.round(40 * sc);
      const ctaX = pad;
      const ctaY = textY;

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

  // ── 7. BOTTOM ACCENT LINE E FOOTER ──────────────────────────────────────────
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

    if (footerText) {
      const footerFS = Math.round(11 * sc);
      ctx.font = `600 ${footerFS}px "${fontFamily}", sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(footerText, width - L.pad, lineY + Math.round(4 * sc));
      ctx.textAlign = 'left';
    }
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
