import { renderToStaticMarkup } from 'react-dom/server';
import { ChipRow, type ChipContext } from '../canvas/Chips';
import type { ChipItem } from '../layout';
import { EdgeBadge, type EdgePaint } from '../canvas/EdgeBadge';
import { StickerLayer } from '../canvas/StickerLayer';
import type { EdgeBadgeSize } from '../layout';
import type { EdgeData, StickerRef, Topic } from '../model';

/** SVG markup for a topic's chips, drawn by the same component the canvas uses. */
export function chipsMarkup(items: readonly ChipItem[], topic: Topic, ctx: ChipContext): string {
  return renderToStaticMarkup(<ChipRow items={items} topic={topic} ctx={ctx} />);
}

/** SVG markup for the stickers on a topic of size `w` by `h`. */
export function stickersMarkup(stickers: readonly StickerRef[], w: number, h: number): string {
  return renderToStaticMarkup(<StickerLayer stickers={stickers} w={w} h={h} pop={false} />);
}

/** SVG markup for the label and stickers on a line, centred on `cx`, `cy`. */
export function edgeMarkup(
  edge: EdgeData,
  size: EdgeBadgeSize,
  cx: number,
  cy: number,
  paint: EdgePaint,
): string {
  return renderToStaticMarkup(<EdgeBadge edge={edge} size={size} cx={cx} cy={cy} paint={paint} />);
}
