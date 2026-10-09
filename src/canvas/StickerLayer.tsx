import type { StickerRef } from '../model';
import { StickerArt } from '../stickers/art';
import { isFresh } from './stampStore';

/** Where each sticker sticks: top right first, then top left, bottom right and bottom left. */
const CORNERS = [
  { right: true, bottom: false, tilt: 11 },
  { right: false, bottom: false, tilt: -12 },
  { right: true, bottom: true, tilt: -9 },
  { right: false, bottom: true, tilt: 10 },
] as const;

export const STICKER_SIZE = 30;

/** A small, steady wobble per sticker, so a row of stickers does not look machine-made. */
function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 9) - 4) * 0.8;
}

/** The press, the ripple and the lines that burst out when a sticker is stamped on. */
export function StampFx() {
  return (
    <g className="stamp-fx" aria-hidden="true" transform="translate(16 16)">
      <circle className="stamp-dent" r="14" />
      <circle className="stamp-ring" r="14" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} className="stamp-ray" y1="-19" y2="-26" transform={`rotate(${i * 45})`} />
      ))}
    </g>
  );
}

/** Stickers stuck to the corners of a topic, drawn over its edge. */
export function StickerLayer({
  stickers,
  w,
  h,
  pop = true,
}: {
  stickers: readonly StickerRef[];
  w: number;
  h: number;
  /** Stamp a new sticker on. Off for exports. */
  pop?: boolean;
}) {
  return (
    <g className="stickers" aria-hidden="true">
      {stickers.slice(0, CORNERS.length).map((sticker, i) => {
        const corner = CORNERS[i];
        if (!corner) return null;
        const cx = corner.right ? w - 3 : 3;
        const cy = corner.bottom ? h - 2 : 2;
        const scale = STICKER_SIZE / 32;
        return (
          <g
            key={sticker.id}
            transform={`translate(${cx} ${cy}) rotate(${corner.tilt + jitter(sticker.id)}) scale(${scale}) translate(-16 -16)`}
          >
            {pop && isFresh(sticker.id) && <StampFx />}
            <g className={pop && isFresh(sticker.id) ? 'sticker-stamp' : undefined}>
              <StickerArt name={sticker.key} />
            </g>
          </g>
        );
      })}
    </g>
  );
}
