import type { Look } from '../model';
import { LEVEL_COUNT } from '../theme/levels';

/** Colours and type of the map as it looks on screen, read from the page. */
export interface ExportTheme {
  look: Look;
  bg: string;
  accent: string;
  /** Border of first-level topics in the Minimal Look. */
  level1: string;
  selection: string;
  topicBg: string;
  topicBorder: string;
  topicText: string;
  coreBg: string;
  coreText: string;
  /** Playful sticker lettering: the light edge around the ink, and its shadow. */
  stickerEdge: string;
  stickerShadow: string;
  stickerShadowOpacity: number;
  /** What a sticker face is tinted into, and how much of its ink it takes (0 to 1). */
  stickerFaceBase: string;
  stickerTint: number;
  connector: string;
  muted: string;
  surface: string;
  /** Positive and warning colours that read well on `bg`. */
  good: string;
  warn: string;
  /** Work in progress. */
  info: string;
  /** Work waiting for approval. */
  pending: string;
  fontStack: string;
  /** The colour and text ink of the Core and each level, used by Playful. */
  levels: Array<{ hue: string; ink: string }>;
}

const FALLBACK: ExportTheme = {
  look: 'minimal',
  bg: '#ffffff',
  accent: '#5b4bdb',
  level1: '#5b4bdb',
  selection: '#5b4bdb',
  topicBg: '#ffffff',
  topicBorder: '#c9cad4',
  topicText: '#1b1b1f',
  coreBg: '#5b4bdb',
  coreText: '#ffffff',
  stickerEdge: '#ffffff',
  stickerShadow: '#1e143c',
  stickerShadowOpacity: 0.3,
  stickerFaceBase: '#ffffff',
  stickerTint: 0.12,
  connector: '#b4b5c3',
  muted: '#5f6068',
  surface: '#ffffff',
  good: '#2b8a3e',
  warn: '#c2410c',
  info: '#1c7ed6',
  pending: '#7048e8',
  fontStack: 'system-ui, sans-serif',
  levels: [],
};

/** Relative brightness of a `#rgb` or `#rrggbb` colour, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return 1;
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

const rgbOf = (hex: string): [number, number, number] | null => {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 1) + 0.05) / ((lo ?? 1) + 0.05);
};

/**
 * `colour` as text on `background`: the colour itself when it reads well, otherwise pulled toward
 * `toward` (the normal text colour) just far enough to reach `min` contrast.
 */
export function legibleOn(colour: string, background: string, toward: string, min = 4.5): string {
  const from = rgbOf(colour);
  const to = rgbOf(toward);
  if (!from || !to) return toward;
  for (let step = 0; step <= 10; step++) {
    const t = step / 10;
    const hex = `#${from
      .map((c, i) =>
        Math.round(c + ((to[i] ?? c) - c) * t)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
    if (contrast(hex, background) >= min) return hex;
  }
  return toward;
}

/** Black or white, whichever reads better on `background`. */
export const readableOn = (background: string): string =>
  luminance(background) > 0.35 ? '#111111' : '#ffffff';

/** `a` blended over `b`; `amount` is how much of `a` shows. Falls back to `b` for non-hex colours. */
export function mixHex(a: string, b: string, amount: number): string {
  const from = rgbOf(a);
  const to = rgbOf(b);
  if (!from || !to) return b;
  return `#${from
    .map((c, i) =>
      Math.round(c * amount + (to[i] ?? c) * (1 - amount))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Reads the live design tokens, so an export matches what is on screen. */
export function readExportTheme(root: HTMLElement = document.documentElement): ExportTheme {
  const css = getComputedStyle(root);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const look = (root.getAttribute('data-look') as Look | null) ?? 'minimal';
  const accent = get('--color-accent', FALLBACK.accent);
  const bg = get('--color-bg', FALLBACK.bg);
  const dark = luminance(bg) < 0.35;
  const levels = Array.from({ length: LEVEL_COUNT + 1 }, (_, i) => {
    const hue = get(`--lv${i}`, accent);
    return { hue, ink: get(`--lv${i}-ink`, hue) };
  });
  const topicBg = get('--color-topic-bg', FALLBACK.topicBg);
  const coreBg = get('--color-core-bg', FALLBACK.coreBg);
  return {
    look,
    bg: get('--color-bg', FALLBACK.bg),
    accent,
    level1: get('--color-level1-border', accent),
    selection: get('--color-selection', FALLBACK.selection),
    topicBg,
    topicBorder: get('--color-topic-border', FALLBACK.topicBorder),
    topicText: get('--color-topic-text', FALLBACK.topicText),
    coreBg,
    coreText: get('--color-core-text', FALLBACK.coreText),
    stickerEdge: get('--sticker-edge', FALLBACK.stickerEdge),
    stickerShadow: get('--sticker-shadow', FALLBACK.stickerShadow),
    stickerShadowOpacity:
      Number.parseFloat(get('--sticker-shadow-opacity', '')) || FALLBACK.stickerShadowOpacity,
    stickerFaceBase: get('--sticker-face-base', FALLBACK.stickerFaceBase),
    stickerTint: (Number.parseFloat(get('--sticker-tint', '')) || 12) / 100,
    connector: get('--color-connector', FALLBACK.connector),
    muted: get('--color-text-muted', FALLBACK.muted),
    surface: get('--color-surface', FALLBACK.surface),
    good: dark ? '#69db7c' : '#2b8a3e',
    warn: dark ? '#ffa94d' : '#c2410c',
    info: dark ? '#74c0fc' : '#1c7ed6',
    pending: dark ? '#b197fc' : '#7048e8',
    fontStack: get('--font-map', FALLBACK.fontStack),
    levels,
  };
}

/**
 * `@font-face` rules for the map's font, with the font files inlined, so an exported image or
 * file looks the same on a machine that does not have the font.
 */
export async function embeddedFontCss(fontStack: string): Promise<string> {
  const first =
    fontStack
      .split(',')[0]
      ?.trim()
      .replace(/^['"]|['"]$/g, '') ?? '';
  if (!first || /^(system-ui|-apple-system|ui-)/i.test(first)) return '';
  const wanted = first.toLowerCase();
  const rules: string[] = [];
  const jobs: Array<Promise<void>> = [];

  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(list)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style
        .getPropertyValue('font-family')
        .replace(/['"]/g, '')
        .trim()
        .toLowerCase();
      if (family !== wanted) continue;
      const src = rule.style.getPropertyValue('src');
      const url = /url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/.exec(src)?.[1];
      if (!url) continue;
      const weight = rule.style.getPropertyValue('font-weight') || '400';
      const style = rule.style.getPropertyValue('font-style') || 'normal';
      const index = rules.push('') - 1;
      jobs.push(
        fetch(new URL(url, sheet.href ?? document.baseURI))
          .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`${r.status}`))))
          .then(
            (blob) =>
              new Promise<void>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                  rules[index] =
                    `@font-face{font-family:'${first}';font-weight:${weight};font-style:${style};src:url(${String(reader.result)}) format('woff2');}`;
                  resolve();
                };
                reader.onerror = () => reject(reader.error ?? new Error('read failed'));
                reader.readAsDataURL(blob);
              }),
          )
          .catch(() => {
            // A font that cannot be fetched is left out. Text falls back to the next one in the stack.
          }),
      );
    }
  }
  await Promise.all(jobs);
  return rules.filter(Boolean).join('\n');
}
