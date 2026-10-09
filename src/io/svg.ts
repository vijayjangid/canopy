import {
  chipRowWidth,
  firstBaselineOf,
  connectorPath,
  edgeBadgeSize,
  edgeMidpoint,
  LEVEL_FONT_STACK,
  LEVEL_PREFIX_SCALE,
  levelPrefix,
  seedOf,
  textLines,
  typeForDepth,
  topicRows,
  type Layout,
  type TopicBox,
} from '../layout';
import type { ChipContext } from '../canvas/Chips';
import { descendantCounts, planningOf, today, type CanopyMap, type TopicId } from '../model';
import { chipsMarkup, edgeMarkup, stickersMarkup } from './chipsMarkup';
import { levelOf } from '../theme/levels';
import type { ExportTheme } from './exportTheme';

export interface SvgOptions {
  theme: ExportTheme;
  /** Measures text the same way the screen does, so lines wrap identically. */
  textWidth: (text: string, style: ReturnType<typeof typeForDepth>) => number;
  /** Draw stickers on the corners of topics. */
  stickers: boolean;
  /** Draw Properties as chips. */
  chips?: boolean;
  /** Draw no background, for placing the image on another surface. */
  transparent: boolean;
  /** Export only these branches (each with everything under it). Empty exports the whole map. */
  roots?: readonly TopicId[];
  /** `@font-face` rules to put in the file. */
  fontCss?: string;
  margin?: number;
  /**
   * Fit the picture on a page of this size, in pixels, centred and shrunk if need be. The file
   * then has exactly the page's size.
   */
  page?: { width: number; height: number; margin?: number };
}

export interface BuiltSvg {
  svg: string;
  width: number;
  height: number;
  topics: number;
  /** With a page: how much the picture was shrunk to fit it. 1 is full size. */
  scale?: number;
}

const f = (n: number) => String(Math.round(n * 100) / 100);

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface Paint {
  fill: string;
  stroke: string;
  strokeWidth: number;
  text: string;
  weight: number;
}

/** The same rules as the screen: Look and level decide how a topic is drawn. */
function paintFor(theme: ExportTheme, depth: number, baseWeight: number): Paint {
  if (theme.look === 'playful') {
    const level = levelOf(depth);
    return {
      fill: `url(#pg-${level})`,
      stroke: theme.levels[level]?.hue ?? theme.topicBorder,
      strokeWidth: depth === 0 ? 0 : 2.5,
      text: depth === 0 ? theme.coreText : theme.topicText,
      weight: depth <= 1 ? 600 : baseWeight,
    };
  }
  if (depth === 0) {
    return {
      fill: theme.coreBg,
      stroke: theme.coreBg,
      strokeWidth: theme.look === 'contrast' ? 2.5 : 1.5,
      text: theme.coreText,
      weight: baseWeight,
    };
  }
  return {
    fill: theme.topicBg,
    stroke: depth === 1 && theme.look === 'minimal' ? theme.level1 : theme.topicBorder,
    strokeWidth: theme.look === 'contrast' ? 2.5 : 1.5,
    text: theme.topicText,
    weight: theme.look === 'contrast' ? 600 : baseWeight,
  };
}

/** The gradients Playful topics are filled with. */
function playfulDefs(theme: ExportTheme): string {
  const stops = theme.levels
    .map(
      (l, i) =>
        `<linearGradient id="pg-${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l.a}"/><stop offset="1" stop-color="${l.b}"/></linearGradient>`,
    )
    .join('');
  return `<defs>${stops}</defs>`;
}

function cornerRadius(look: ExportTheme['look'], depth: number, height: number): number {
  if (look === 'playful') return Math.min(height / 2, depth === 0 ? 24 : 20);
  if (look === 'contrast') return depth === 0 ? 16 : depth === 1 ? 10 : 2;
  return depth === 0 ? 14 : 10;
}

/** Everything under the given roots, or every box when no roots are given. */
export function pickBoxes(layout: Layout, roots: readonly TopicId[] | undefined): TopicBox[] {
  if (!roots || roots.length === 0) return layout.order;
  const wanted = new Set(roots);
  const keep = new Map<TopicId, boolean>();
  const inside = (box: TopicBox): boolean => {
    const known = keep.get(box.id);
    if (known !== undefined) return known;
    const parent = box.parentId ? layout.boxes.get(box.parentId) : undefined;
    const result = wanted.has(box.id) || (parent ? inside(parent) : false);
    keep.set(box.id, result);
    return result;
  };
  return layout.order.filter(inside);
}

/** A standalone SVG of the map, drawn from the layout. It needs no stylesheet or script. */
export function buildSvg(doc: CanopyMap, layout: Layout, options: SvgOptions): BuiltSvg {
  const { theme, stickers, transparent } = options;
  const margin = options.margin ?? 40;
  const boxes = pickBoxes(layout, options.roots);
  if (boxes.length === 0) return { svg: '', width: 0, height: 0, topics: 0 };

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  // Room for the fold badge and level badge that hang outside a topic. The compact layout
  // draws the fold badge on the topic's corner instead, so it needs none.
  const compact = layout.compact === true;
  const flowRight = doc.prefs.flow === 'right';
  const badgeRoom = compact ? 0 : 36;
  const contentW = x1 - x0;
  const contentH = y1 - y0;
  let width: number;
  let height: number;
  let viewW: number;
  let viewH: number;
  let ox: number;
  let oy: number;
  let scale: number | undefined;
  if (options.page) {
    const { margin: pageMargin = 28 } = options.page;
    width = options.page.width;
    height = options.page.height;
    scale = Math.min(
      1,
      (width - pageMargin * 2) / Math.max(contentW, 1),
      (height - pageMargin * 2) / Math.max(contentH, 1),
    );
    viewW = width / scale;
    viewH = height / scale;
    ox = (viewW - contentW) / 2 - x0;
    oy = (viewH - contentH) / 2 - y0;
  } else {
    width = Math.ceil(contentW + margin * 2 + (flowRight ? badgeRoom : 0));
    height = Math.ceil(contentH + margin * 2 + (flowRight ? 0 : badgeRoom));
    viewW = width;
    viewH = height;
    ox = margin - x0;
    oy = margin - y0;
  }

  const now = new Date();
  const chipContext: ChipContext = {
    statuses: new Map(planningOf(doc).statusSet.map((x) => [x.key, x])),
    tags: new Map(planningOf(doc).tags.map((t) => [t.key, t])),
    today: today(now),
    now,
    theme,
    full: doc.prefs.chips === 'full',
  };
  const included = new Set(boxes.map((b) => b.id));
  const hidden = descendantCounts(doc);
  const out: string[] = [];
  if (theme.look === 'playful') out.push(playfulDefs(theme));
  const font = escapeXml(theme.fontStack);

  const wobble = doc.prefs.voice === 'sketch' ? 4 : 0;
  out.push(`<g fill="none" stroke-linecap="round" transform="translate(${f(ox)} ${f(oy)})">`);
  for (const b of boxes) {
    const parent = b.parentId ? layout.boxes.get(b.parentId) : undefined;
    if (!parent || !included.has(parent.id)) continue;
    const d = connectorPath(parent, b, doc.prefs.flow, {
      attach: b.attach,
      style: doc.prefs.connector,
      wobble,
      seed: seedOf(b.id),
    });
    // Playful lines take the colour of the topic they leave.
    const hue =
      theme.look === 'playful'
        ? (theme.levels[levelOf(parent.depth)]?.hue ?? theme.connector)
        : theme.connector;
    const width = theme.look === 'minimal' ? 1.5 : theme.look === 'contrast' ? 2 : 3;
    out.push(
      doc.prefs.connector === 'tapered'
        ? `<path d="${d}" fill="${hue}" stroke="none"/>`
        : `<path d="${d}" stroke="${hue}" stroke-width="${width}"/>`,
    );
  }
  out.push('</g>');

  if (stickers || boxes.some((b) => doc.topics[b.id]?.edge?.label)) {
    const paint = {
      halo: transparent ? undefined : theme.bg,
      text: theme.muted,
      font: theme.fontStack,
    };
    for (const b of boxes) {
      const parent = b.parentId ? layout.boxes.get(b.parentId) : undefined;
      const edge = doc.topics[b.id]?.edge;
      if (!parent || !edge || !included.has(parent.id)) continue;
      const shown = stickers ? edge : { label: edge.label };
      const size = edgeBadgeSize(shown, options.textWidth);
      if (!size) continue;
      const mid = edgeMidpoint(parent, b, doc.prefs.flow, b.attach);
      out.push(
        `<g transform="translate(${f(ox)} ${f(oy)})">${edgeMarkup(shown, size, mid.x, mid.y, paint)}</g>`,
      );
    }
  }

  for (const b of boxes) {
    const topic = doc.topics[b.id];
    if (!topic) continue;
    const style = typeForDepth(b.depth);
    const paint = paintFor(theme, b.depth, style.weight);
    const rows = topicRows(topic);
    const rowH = rows.total;
    const lines = textLines(topic.title, b.depth, options.textWidth);
    const first = firstBaselineOf(b.h, rowH, lines.length, style.lineHeight);
    const empty = topic.title.trim() === '';
    const radius = cornerRadius(theme.look, b.depth, b.h);

    out.push(`<g transform="translate(${f(b.x + ox)} ${f(b.y + oy)})">`);
    out.push(
      `<rect width="${f(b.w)}" height="${f(b.h)}" rx="${f(radius)}" fill="${paint.fill}" stroke="${paint.stroke}" stroke-width="${paint.strokeWidth}"/>`,
    );
    const tspans = lines
      .map(
        (l, i) =>
          `<tspan x="${f(b.w / 2)}" y="${f(first + i * style.lineHeight)}">${
            i === 0 && doc.prefs.showLevels && b.depth > 0
              ? `<tspan fill="${theme.muted}" fill-opacity="0.75" font-family="${escapeXml(LEVEL_FONT_STACK)}" font-size="${f(style.size * LEVEL_PREFIX_SCALE)}" font-weight="400">${levelPrefix(b.depth, b.position)}</tspan>`
              : ''
          }${escapeXml(l)}</tspan>`,
      )
      .join('');
    out.push(
      `<text text-anchor="middle" dominant-baseline="central" font-size="${f(style.size)}" font-weight="${paint.weight}" fill="${empty ? theme.muted : paint.text}"${empty ? ' font-style="italic"' : ''}>${tspans}</text>`,
    );
    if (options.chips !== false && rows.chips.length > 0) {
      out.push(
        `<g transform="translate(${f((b.w - chipRowWidth(rows.chips)) / 2)} ${f(b.h - rows.total)})">${chipsMarkup(rows.chips, topic, chipContext)}</g>`,
      );
    }
    if (stickers && topic.stickers?.length) {
      out.push(stickersMarkup(topic.stickers, b.w, b.h));
    }
    const folded = topic.folded ? (hidden.get(b.id) ?? 0) : 0;
    if (folded > 0) {
      const label = folded > 99 ? '99+' : String(folded);
      const bw = 14 + label.length * 8;
      const bx = compact ? b.w - bw + 6 : flowRight ? b.w + 6 : b.w / 2 - bw / 2;
      const by = compact ? -10 : flowRight ? b.h / 2 - 10 : b.h + 6;
      out.push(
        `<g transform="translate(${f(bx)} ${f(by)})"><rect width="${bw}" height="20" rx="10" fill="${theme.accent}"/><text x="${bw / 2}" y="10" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${theme.coreText}">${label}</text></g>`,
      );
    }
    out.push('</g>');
  }

  const background = transparent ? '' : `<rect width="100%" height="100%" fill="${theme.bg}"/>`;
  const style = options.fontCss ? `<style>${options.fontCss}</style>` : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${f(viewW)} ${f(viewH)}" font-family="${font}">` +
    `<title>${escapeXml(doc.meta.title || 'Mind map')}</title>${style}${background}${out.join('')}</svg>`;
  return { svg, width, height, topics: boxes.length, scale };
}
