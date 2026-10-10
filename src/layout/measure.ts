import type { Topic } from '../model';
import { chipRowWidth, topicRows } from './chips';
import { IMAGE_PAD, imageOffset, imageSize } from './image';
import type { Measure, Size } from './types';

export interface TypeStyle {
  size: number;
  weight: number;
  lineHeight: number;
}

/** Every topic title uses one weight; level is shown by size, not boldness. */
const TOPIC_WEIGHT = 500;

/** Handwritten faces run small, so a Voice can scale all type. Set before measuring. */
let typeScale = 1;

export function setTypeScale(scale: number): void {
  typeScale = scale;
}

/** Playful titles are sticker lettering: a little larger. Set before measuring. */
const STICKER_SCALE = 1.05;
let stickerType = false;

export function setStickerType(on: boolean): void {
  stickerType = on;
}

/** Type by level. The renderer reads the same values so text always fits its box. */
export function typeForDepth(depth: number): TypeStyle {
  const weight = TOPIC_WEIGHT;
  const base =
    depth === 0
      ? { size: 18, weight, lineHeight: 24 }
      : depth === 1
        ? { size: 15, weight, lineHeight: 20 }
        : { size: 14, weight, lineHeight: 20 };
  const scale = stickerType ? typeScale * STICKER_SCALE : typeScale;
  if (scale === 1) return base;
  return {
    ...base,
    size: base.size * scale,
    lineHeight: Math.round(base.lineHeight * scale),
  };
}

let levelNumbers = false;

/** Whether topics show their level before the title. Callers must measure again after changing it. */
export function setLevelNumbers(on: boolean): void {
  levelNumbers = on;
}

/** The dim number before a title: level, then place among peers, such as "2.3". The Core has none. */
export function levelPrefix(depth: number, position: number): string {
  return depth > 0 ? `${depth}.${position}\u2005` : '';
}

/** The level number is set smaller, in a monospace face, so its width is worked out from the grid. */
export const LEVEL_PREFIX_SCALE = 0.58;
const MONO_ADVANCE = 0.6;
export const LEVEL_FONT_STACK = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

function prefixWidth(prefix: string, style: TypeStyle): number {
  return prefix.length * style.size * LEVEL_PREFIX_SCALE * MONO_ADVANCE;
}

/** How far the tinted rim of a sticker reaches past its white face, in px. */
export const STICKER_RIM = 3.5;

/** The flat shadow under a sticker, like the sticker set's: the same shape, nudged down and right. */
export const STICKER_SHADOW_OFFSET = { x: 0.8, y: 1.6 };

/** Titles and chips start `x` from a topic's left edge. */
export const TOPIC_PADDING = { x: 14, y: 9 };
export const TOPIC_MIN = { w: 72, h: 36 };
export const TOPIC_MAX_TEXT_WIDTH = 220;
/** Space between the title and the chips under it, and below the chips. */
const CHIPS_GAP = 2;
const CHIPS_BOTTOM = 3;

/** Where the first line of a title is centred: at the top when chips follow it, else in the middle. */
export function firstBaselineOf(
  h: number,
  rowH: number,
  lineCount: number,
  lineHeight: number,
): number {
  return rowH > 0
    ? TOPIC_PADDING.y + lineHeight / 2
    : (h - lineCount * lineHeight) / 2 + lineHeight / 2;
}
export const EMPTY_TITLE_LABEL = 'New topic';

export type TextWidth = (text: string, style: TypeStyle) => number;

/** Greedy word wrap. Words wider than the line are split between characters. */
export function wrapLines(text: string, maxWidth: number, width: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const push = () => {
    if (line) lines.push(line);
    line = '';
  };
  for (const word of words) {
    const joined = line ? `${line} ${word}` : word;
    if (width(joined) <= maxWidth) {
      line = joined;
      continue;
    }
    push();
    if (width(word) <= maxWidth) {
      line = word;
      continue;
    }
    for (const char of word) {
      if (line && width(line + char) > maxWidth) push();
      line += char;
    }
  }
  push();
  return lines.length > 0 ? lines : [''];
}

/** Lines of text a topic shows, and the box that holds them. */
export function textLines(title: string, depth: number, textWidth: TextWidth): string[] {
  const style = typeForDepth(depth);
  const text = title.trim() || EMPTY_TITLE_LABEL;
  // A line break typed in the title starts a new line, and each paragraph wraps on its own.
  return text
    .split(/\r?\n/)
    .flatMap((paragraph) => wrapLines(paragraph, TOPIC_MAX_TEXT_WIDTH, (s) => textWidth(s, style)));
}

export function createTopicMeasurer(textWidth: TextWidth): Measure & { invalidate: () => void } {
  // Topics are immutable, so the same object at the same level always measures the same.
  let cache = new WeakMap<Topic, Map<string, Size>>();
  const measure = (topic: Topic, depth: number, position = 1): Size => {
    // Only the number of digits in the place changes the width.
    const key = `${depth}/${levelNumbers ? String(position).length : 0}`;
    let byDepth = cache.get(topic);
    const hit = byDepth?.get(key);
    if (hit) return hit;
    const style = typeForDepth(depth);
    const lines = textLines(topic.title, depth, textWidth);
    const prefix = levelNumbers ? levelPrefix(depth, position) : '';
    const widest = Math.max(
      ...lines.map((l, i) => textWidth(l, style) + (i === 0 ? prefixWidth(prefix, style) : 0)),
    );
    const { chips, total: rows } = topicRows(topic);
    const rowWidth = chipRowWidth(chips);
    // Stickers hang off the corners, so give them room to sit beside the text.
    const stickers = topic.stickers?.length ?? 0;
    const picture = imageSize(topic.image);
    const above = imageOffset(topic);
    const size: Size = {
      w:
        Math.max(
          picture ? picture.w + IMAGE_PAD * 2 : 0,
          TOPIC_MIN.w,
          Math.ceil(widest) + 2 + TOPIC_PADDING.x * 2,
          rowWidth > 0 ? rowWidth + TOPIC_PADDING.x * 2 : 0,
        ) +
        Math.min(stickers, 2) * 14,
      h:
        above +
        (rows > 0
          ? // With a row of chips the title sits at the top, and the chips close to it.
            Math.max(
              TOPIC_PADDING.y + lines.length * style.lineHeight + CHIPS_GAP + rows + CHIPS_BOTTOM,
              stickers >= 3 ? 52 : 0,
            )
          : Math.max(
              TOPIC_MIN.h,
              lines.length * style.lineHeight + TOPIC_PADDING.y * 2,
              stickers >= 3 ? 52 : 0,
            )),
    };
    if (!byDepth) {
      byDepth = new Map();
      cache.set(topic, byDepth);
    }
    byDepth.set(key, size);
    return size;
  };
  measure.invalidate = () => {
    cache = new WeakMap();
  };
  return measure;
}

/** Real text widths from a canvas, or a rough estimate where no canvas exists (tests, SSR). */
export function createCanvasTextWidth(getFontFamily: () => string): TextWidth {
  let context: { font: string; measureText(text: string): { width: number } } | null | undefined;
  const getContext = () => {
    if (context !== undefined) return context;
    try {
      context =
        typeof OffscreenCanvas !== 'undefined'
          ? new OffscreenCanvas(1, 1).getContext('2d')
          : typeof document !== 'undefined'
            ? document.createElement('canvas').getContext('2d')
            : null;
    } catch {
      context = null;
    }
    return context;
  };
  return (text, style) => {
    const ctx = getContext();
    if (!ctx) return text.length * style.size * 0.55;
    ctx.font = `${style.weight} ${style.size}px ${getFontFamily()}`;
    return ctx.measureText(text).width;
  };
}
