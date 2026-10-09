import { EDGE_STICKER, EDGE_TYPE, type EdgeBadgeSize } from '../layout';
import type { EdgeData } from '../model';
import { StickerArt } from '../stickers/art';
import { StampFx } from './StickerLayer';
import { isFresh } from './stampStore';

/** Colours for places with no stylesheet, such as an exported file. */
export interface EdgePaint {
  /** Colour around the text that breaks the line behind it. None when the background is clear. */
  halo?: string;
  text: string;
  font: string;
}

/**
 * The label and stickers on the middle of a line, as plain text with no box.
 * `cx` and `cy` are the middle of the line in map coordinates.
 */
export function EdgeBadge({
  edge,
  size,
  cx,
  cy,
  paint,
  stamp = false,
}: {
  edge: EdgeData;
  size: EdgeBadgeSize;
  cx: number;
  cy: number;
  paint?: EdgePaint;
  /** Stamp new stickers on. Off for exports. */
  stamp?: boolean;
}) {
  const stickers = edge.stickers ?? [];
  return (
    <g
      className="edge-badge"
      transform={`translate(${cx - size.w / 2} ${cy - size.h / 2})`}
      data-has-label={size.shown !== '' || undefined}
    >
      <rect className="edge-hit" width={size.w} height={size.h} />
      {stickers.map((s, i) => (
        <g
          key={s.id}
          className="edge-sticker"
          transform={`translate(${10 + i * (EDGE_STICKER + 2) + EDGE_STICKER / 2} ${size.h / 2}) scale(${EDGE_STICKER / 32}) translate(-16 -16)`}
        >
          {stamp && isFresh(s.id) && <StampFx />}
          <g className={stamp && isFresh(s.id) ? 'sticker-stamp' : undefined}>
            <StickerArt name={s.key} />
          </g>
        </g>
      ))}
      {size.shown !== '' && (
        <text
          className="edge-text"
          x={size.textX}
          y={size.h / 2}
          dominantBaseline="central"
          fontSize={EDGE_TYPE.size}
          fontWeight={EDGE_TYPE.weight}
          fill={paint?.text}
          stroke={paint?.halo}
          strokeWidth={paint?.halo ? 6 : undefined}
          strokeLinejoin={paint?.halo ? 'round' : undefined}
          paintOrder={paint?.halo ? 'stroke' : undefined}
          fontFamily={paint?.font}
        >
          {size.shown}
        </text>
      )}
    </g>
  );
}
