import {
  chipRowWidth,
  firstBaselineOf,
  IMAGE_PAD,
  imageOffset,
  imageSize,
  connectorPath,
  edgeBadgeSize,
  edgeMidpoint,
  LEVEL_FONT_STACK,
  LEVEL_PREFIX_SCALE,
  levelPrefix,
  STICKER_RIM,
  STICKER_SHADOW_OFFSET,
  stickerBlob,
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
import { mixHex, type ExportTheme } from './exportTheme';
import { levelOf } from '../theme/levels';

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
  /** Playful titles are lettered like stickers, with no box behind them. */
  sticker: boolean;
}

/** The same rules as the screen: the Look and the level decide how a topic is drawn. */
function paintFor(theme: ExportTheme, depth: number, baseWeight: number): Paint {
  if (theme.look === 'playful') {
    return {
      fill: 'none',
      stroke: 'none',
      strokeWidth: 0,
      text: theme.levels[levelOf(depth)]?.ink ?? theme.topicText,
      weight: baseWeight,
      sticker: true,
    };
  }
  if (depth === 0) {
    return {
      fill: theme.coreBg,
      stroke: theme.coreBg,
      strokeWidth: theme.look === 'contrast' ? 2.5 : 1.5,
      text: theme.coreText,
      weight: baseWeight,
      sticker: false,
    };
  }
  return {
    fill: theme.topicBg,
    stroke: depth === 1 && theme.look === 'minimal' ? theme.level1 : theme.topicBorder,
    strokeWidth: theme.look === 'contrast' ? 2.5 : 1.5,
    text: theme.topicText,
    weight: baseWeight,
    sticker: false,
  };
}

/** Sticker lettering: a tinted face and a white rim, both wavy, over a flat shadow. */
function playfulDefs(): string {
  const wiggle = `<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="1" seed="7" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"/>`;
  return `<defs><filter id="sticker-wiggle" x="-20%" y="-60%" width="140%" height="220%">${wiggle}</filter></defs>`;
}

function cornerRadius(look: ExportTheme['look'], depth: number, height: number): number {
  if (look === 'playful') return Math.min(height * 0.4, depth === 0 ? 18 : 16);
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
  if (theme.look === 'playful') out.push(playfulDefs());
  const font = escapeXml(theme.fontStack);

  const wobble = doc.prefs.look === 'playful' ? 4 : 0;
  out.push(`<g fill="none" stroke-linecap="round" transform="translate(${f(ox)} ${f(oy)})">`);
  for (const b of boxes) {
    const parent = b.parentId ? layout.boxes.get(b.parentId) : undefined;
    if (!parent || !included.has(parent.id)) continue;
    const d = connectorPath(parent, b, doc.prefs.flow, {
      attach: b.attach,
      wobble,
      seed: seedOf(b.id),
    });
    const hue = theme.connector;
    const width = theme.look === 'contrast' ? 2.5 : 2;
    out.push(`<path d="${d}" stroke="${hue}" stroke-width="${width}"/>`);
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
    const above = imageOffset(topic);
    const picture = imageSize(topic.image);
    const first = above + firstBaselineOf(b.h - above, rowH, lines.length, style.lineHeight);
    const empty = topic.title.trim() === '';
    const radius = cornerRadius(theme.look, b.depth, b.h);

    out.push(`<g transform="translate(${f(b.x + ox)} ${f(b.y + oy)})">`);
    if (!paint.sticker) {
      out.push(
        `<rect width="${f(b.w)}" height="${f(b.h)}" rx="${f(radius)}" fill="${paint.fill}" stroke="${paint.stroke}" stroke-width="${paint.strokeWidth}"/>`,
      );
    }
    if (picture && topic.image) {
      const px = (b.w - picture.w) / 2;
      const clip = `img-${b.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
      out.push(
        `<clipPath id="${clip}"><rect x="${f(px)}" y="${IMAGE_PAD}" width="${picture.w}" height="${picture.h}" rx="6"/></clipPath>` +
          `<image href="${topic.image.src}" x="${f(px)}" y="${IMAGE_PAD}" width="${picture.w}" height="${picture.h}" preserveAspectRatio="none" clip-path="url(#${clip})">${topic.image.alt ? `<title>${escapeXml(topic.image.alt)}</title>` : ''}</image>`,
      );
    }
    const textLinesShown = picture && empty ? [] : lines;
    const spans = (prefixFill: string, prefixOpacity: string) =>
      textLinesShown
        .map(
          (l, i) =>
            `<tspan x="${f(b.w / 2)}" y="${f(first + i * style.lineHeight)}">${
              i === 0 && doc.prefs.showLevels && b.depth > 0
                ? `<tspan fill="${prefixFill}" fill-opacity="${prefixOpacity}" font-family="${escapeXml(LEVEL_FONT_STACK)}" font-size="${f(style.size * LEVEL_PREFIX_SCALE)}" font-weight="400">${levelPrefix(b.depth, b.position)}</tspan>`
                : ''
            }${escapeXml(l)}</tspan>`,
        )
        .join('');
    const box = `text-anchor="middle" dominant-baseline="central" font-size="${f(style.size)}" font-weight="${paint.weight}"`;
    if (paint.sticker && textLinesShown.length > 0) {
      const blobOf = (grow: number) =>
        stickerBlob(
          textLinesShown,
          b.w / 2,
          first,
          style,
          doc.prefs.showLevels && b.depth > 0 ? levelPrefix(b.depth, b.position) : '',
          options.textWidth,
          grow,
          options.chips !== false && rows.chips.length > 0
            ? { width: chipRowWidth(rows.chips), top: b.h - rows.total, height: rows.total }
            : undefined,
        )
          .map(
            (r) =>
              `<rect x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}" rx="${f(r.r)}"/>`,
          )
          .join('');
      const face = mixHex(paint.text, theme.stickerFaceBase, theme.stickerTint);
      out.push(
        `<g transform="translate(${STICKER_SHADOW_OFFSET.x} ${STICKER_SHADOW_OFFSET.y})" fill="${theme.stickerShadow}" opacity="${theme.stickerShadowOpacity}" filter="url(#sticker-wiggle)">${blobOf(STICKER_RIM)}</g>` +
          `<g fill="${theme.stickerEdge}" filter="url(#sticker-wiggle)">${blobOf(STICKER_RIM)}</g>` +
          `<g fill="${face}" filter="url(#sticker-wiggle)">${blobOf(0)}</g>`,
      );
    }
    out.push(
      `<text ${box} fill="${empty ? theme.muted : paint.text}"${empty ? ' font-style="italic"' : ''}>${spans(theme.muted, '0.75')}</text>`,
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
