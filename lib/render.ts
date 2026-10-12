import type { Blend, Settings } from './settings';

export const OVERLAY_TAG = 'page-tint-overlay';

const INVERT = 'invert(1) hue-rotate(180deg)';

// hue-rotate(180deg) colour matrix from the Filter Effects spec (cos = -1, sin = 0).
type Vec3 = [number, number, number];

const HUE_180: [Vec3, Vec3, Vec3] = [
  [-0.574, 1.43, 0.144],
  [0.426, 0.43, 0.144],
  [0.426, 1.43, -0.856],
];

export function pageFilter(s: Settings): string {
  const parts: string[] = [];
  if (s.invert) parts.push(INVERT);
  if (s.brightness !== 100) parts.push(`brightness(${s.brightness}%)`);
  if (s.contrast !== 100) parts.push(`contrast(${s.contrast}%)`);
  if (s.saturation !== 100) parts.push(`saturate(${s.saturation}%)`);
  if (s.warmth > 0) parts.push(`sepia(${s.warmth}%)`);
  return parts.join(' ');
}

/**
 * The tint layer sits inside <html>, so in dark mode the page's invert filter
 * flips it too. Pre-flip its colour and swap multiply/screen so it ends up
 * looking like the colour the user picked, laid over the already-dark page.
 */
export function overlayPaint(s: Settings): { color: string; blend: Blend } {
  if (!s.invert) return { color: s.tintColor, blend: s.tintBlend };
  const [r, g, b] = hexToRgb(s.tintColor).map((c) => 1 - c / 255) as Vec3;
  const flipped = HUE_180.map(([mr, mg, mb]) => mr * r + mg * g + mb * b);
  const blend: Blend = s.tintBlend === 'multiply' ? 'screen' : s.tintBlend === 'screen' ? 'multiply' : 'normal';
  return { color: rgbToHex(flipped.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255))), blend };
}

/**
 * Full stylesheet for the page. `rootBg` is the colour to pin on <html> while
 * a filter is active, so the canvas behind short pages is filtered too.
 */
export function buildCss(s: Settings, rootBg: string): string {
  const filter = pageFilter(s);
  let css = '';
  if (filter) {
    css += `html { filter: ${filter} !important; background-color: ${rootBg} !important; }\n`;
  }
  if (s.invert) {
    css += `img, video, canvas, iframe, embed, object, svg image { filter: ${INVERT} !important; }\n`;
  }
  if (s.tintStrength > 0) {
    const { color, blend } = overlayPaint(s);
    css += `${OVERLAY_TAG} { all: initial !important; display: block !important; position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; pointer-events: none !important; background: ${color} !important; opacity: ${s.tintStrength / 100} !important; mix-blend-mode: ${blend} !important; }\n`;
  }
  return css;
}

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: number[]): string {
  return '#' + rgb.map((c) => c.toString(16).padStart(2, '0')).join('');
}
