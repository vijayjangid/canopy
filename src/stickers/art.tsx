import type { ReactElement } from 'react';

/** One drawn part of a sticker, on a 32 by 32 grid. */
type Part =
  | { t: 'path'; d: string; fill?: string; stroke?: string; w?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; w?: number }
  | { t: 'rect'; x: number; y: number; width: number; height: number; rx?: number; fill?: string };

const star = (cx: number, cy: number, outer: number, inner: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    return `${i === 0 ? 'M' : 'L'}${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join('') + 'Z';

const WHITE = '#ffffff';

/** Bold flat artwork. Each sticker gets a white die-cut edge and a soft shadow when drawn. */
export const STICKER_ART: Record<string, Part[]> = {
  star: [{ t: 'path', d: star(16, 16.5, 13, 5.6), fill: '#ffc933' }],
  heart: [
    {
      t: 'path',
      d: 'M16 28C6 20 3 15 3 10.5 3 7 5.8 4.5 9 4.5c3 0 5.5 1.8 7 4.5 1.5-2.7 4-4.5 7-4.5 3.2 0 6 2.5 6 6 0 4.5-3 9.5-13 17.5Z',
      fill: '#ff4d6d',
    },
    { t: 'path', d: 'M8 10c.5-1.5 1.6-2.2 3-2.2', stroke: '#ffd0da', w: 2, fill: 'none' },
  ],
  bolt: [{ t: 'path', d: 'M19 2 7 18h7l-2 12 13-17h-8Z', fill: '#ffd23f' }],
  flag: [
    { t: 'rect', x: 6, y: 3, width: 3, height: 26, rx: 1.5, fill: '#4a4e69' },
    { t: 'path', d: 'M9 5c5-2.5 9 2.5 16 0v11c-7 2.5-11-2.5-16 0Z', fill: '#ef476f' },
  ],
  done: [
    { t: 'circle', cx: 16, cy: 16, r: 13, fill: '#2ecc71' },
    { t: 'path', d: 'm9.5 16.5 4.5 4.5 8.5-9.5', stroke: WHITE, w: 3.5, fill: 'none' },
  ],
  no: [
    { t: 'circle', cx: 16, cy: 16, r: 13, fill: '#ef476f' },
    { t: 'path', d: 'm10.5 10.5 11 11m0-11-11 11', stroke: WHITE, w: 3.5, fill: 'none' },
  ],
  question: [
    { t: 'circle', cx: 16, cy: 16, r: 13, fill: '#4d8dff' },
    {
      t: 'path',
      d: 'M12 12.5c0-2.5 1.8-4 4-4s4 1.5 4 3.5c0 3-4 3.2-4 6',
      stroke: WHITE,
      w: 3,
      fill: 'none',
    },
    { t: 'circle', cx: 16, cy: 23, r: 1.9, fill: WHITE },
  ],
  alert: [
    { t: 'circle', cx: 16, cy: 16, r: 13, fill: '#ff9f1c' },
    { t: 'path', d: 'M16 8.5v9', stroke: WHITE, w: 3.5, fill: 'none' },
    { t: 'circle', cx: 16, cy: 23, r: 2, fill: WHITE },
  ],
  fire: [
    {
      t: 'path',
      d: 'M16 2c1 6.5 8 9.5 8 18 0 5.5-3.5 9-8 9s-8-3.5-8-9c0-4 2-6 3-9 2 2 2.5 3.5 3 4 .5-4 .5-8 2-13Z',
      fill: '#ff7b25',
    },
    {
      t: 'path',
      d: 'M16 18c2.5 2 3.5 4 3.5 6 0 2-1.5 3.5-3.5 3.5S12.5 26 12.5 24c0-2.5 2-3.5 3.5-6Z',
      fill: '#ffd23f',
    },
  ],
  idea: [
    { t: 'circle', cx: 16, cy: 13, r: 10, fill: '#ffd23f' },
    { t: 'rect', x: 11.5, y: 22, width: 9, height: 6, rx: 2, fill: '#8d99ae' },
    { t: 'path', d: 'M12.5 13c0-2 1.5-3.5 3.5-3.5', stroke: '#fff4bf', w: 2, fill: 'none' },
  ],
  rocket: [
    { t: 'path', d: 'M12 17 6 24l6.5-1.5ZM20 17l6 7-6.5-1.5Z', fill: '#ef476f' },
    { t: 'path', d: 'M16 2c5 4 6.5 11 5 19h-10C9.5 13 11 6 16 2Z', fill: '#5b8def' },
    { t: 'circle', cx: 16, cy: 12, r: 3, fill: WHITE },
    { t: 'path', d: 'M13 22l3 8 3-8Z', fill: '#ffb703' },
  ],
  happy: [
    { t: 'circle', cx: 16, cy: 16, r: 13, fill: '#ffd23f' },
    { t: 'circle', cx: 11.5, cy: 13, r: 1.9, fill: '#5a3d00' },
    { t: 'circle', cx: 20.5, cy: 13, r: 1.9, fill: '#5a3d00' },
    { t: 'path', d: 'M9.5 18.5c2 5 11 5 13 0', stroke: '#5a3d00', w: 2.6, fill: 'none' },
  ],
  pin: [
    { t: 'path', d: 'M11 3h10l-1 9 4 4H8l4-4Z', fill: '#ef476f' },
    { t: 'path', d: 'M16 16v13', stroke: '#6b7280', w: 2.6, fill: 'none' },
  ],
  bell: [
    {
      t: 'path',
      d: 'M16 3c-5 0-7.5 4-7.5 9 0 6-2.5 8-2.5 9.5h20c0-1.5-2.5-3.5-2.5-9.5 0-5-2.5-9-7.5-9Z',
      fill: '#ffc933',
    },
    { t: 'circle', cx: 16, cy: 25.5, r: 3, fill: '#ff9f1c' },
  ],
  win: [
    { t: 'path', d: 'M9 3h14v8c0 5-3 8-7 8s-7-3-7-8Z', fill: '#ffc933' },
    {
      t: 'path',
      d: 'M9 6H4.5c0 5 2 7.5 5.5 7.5M23 6h4.5c0 5-2 7.5-5.5 7.5',
      stroke: '#ffc933',
      w: 2.6,
      fill: 'none',
    },
    { t: 'rect', x: 14, y: 19, width: 4, height: 5, fill: '#e0a000' },
    { t: 'rect', x: 9.5, y: 24, width: 13, height: 5, rx: 2, fill: '#ffb703' },
  ],
  cloud: [
    {
      t: 'path',
      d: 'M9 25c-5 0-6.5-5.5-2.5-7.2C6 12.5 12.5 9 15.5 13 17.5 8 26.5 9.5 26.5 16.5c5 .5 5 8.5-1 8.5Z',
      fill: '#8fd0ff',
    },
  ],
  sun: [
    { t: 'circle', cx: 16, cy: 16, r: 7.5, fill: '#ffc933' },
    {
      t: 'path',
      d: 'M16 2.5v4m0 19v4M2.5 16h4m19 0h4M6.5 6.5l2.8 2.8m13.4 13.4 2.8 2.8m0-19-2.8 2.8M9.3 22.7l-2.8 2.8',
      stroke: '#ffb703',
      w: 2.8,
      fill: 'none',
    },
  ],
  sprout: [
    { t: 'path', d: 'M5 27C5 14 13 5 27 5c0 13-8 22-22 22Z', fill: '#43d17a' },
    { t: 'path', d: 'M5 27 18 14', stroke: '#1f9d55', w: 2.2, fill: 'none' },
  ],
  gem: [
    { t: 'path', d: 'M8 5h16l5 7-13 16L3 12Z', fill: '#5ad1e6' },
    { t: 'path', d: 'M3 12h26M12 5l-2 7 6 16 6-16-2-7', stroke: '#ffffff', w: 1.4, fill: 'none' },
  ],
  clock: [
    { t: 'circle', cx: 16, cy: 16, r: 12.5, fill: WHITE, stroke: '#4d5565', w: 3 },
    { t: 'path', d: 'M16 8.5V16l5 3', stroke: '#4d5565', w: 2.8, fill: 'none' },
  ],
  party: [
    { t: 'path', d: 'M4 28 10 11l11 11Z', fill: '#ffb703' },
    { t: 'circle', cx: 21, cy: 8, r: 2.2, fill: '#ef476f' },
    { t: 'circle', cx: 27, cy: 14, r: 2.2, fill: '#4d8dff' },
    { t: 'circle', cx: 15, cy: 4.5, r: 2, fill: '#2ecc71' },
    { t: 'path', d: 'M20 14c3-3 5-3 7-6', stroke: '#c77dff', w: 2, fill: 'none' },
  ],
  bookmark: [{ t: 'path', d: 'M8 3h16v26l-8-6-8 6Z', fill: '#ef476f' }],
  coffee: [
    { t: 'path', d: 'M5 11h17v9c0 4-3 7-7 7h-3c-4 0-7-3-7-7Z', fill: '#b5651d' },
    {
      t: 'path',
      d: 'M22 13h2.5c2.5 0 4 1.5 4 3.5s-1.5 3.5-4 3.5H22',
      stroke: '#b5651d',
      w: 2.8,
      fill: 'none',
    },
    {
      t: 'path',
      d: 'M10 3.5c-1.5 2 1.5 3 0 5M16 3.5c-1.5 2 1.5 3 0 5',
      stroke: '#8d99ae',
      w: 2,
      fill: 'none',
    },
  ],
};

export const STICKER_KEYS = Object.keys(STICKER_ART);

function draw(part: Part, key: number, mode: 'color' | 'edge', edge: string): ReactElement {
  const stroke = part.t === 'rect' ? undefined : part.stroke;
  const width = part.t === 'rect' ? 0 : (part.w ?? 0);
  const common =
    mode === 'edge'
      ? {
          fill: edge,
          stroke: edge,
          strokeWidth: width + 5.5,
          strokeLinejoin: 'round' as const,
          strokeLinecap: 'round' as const,
        }
      : {
          fill: part.t !== 'rect' && part.fill === 'none' ? 'none' : (part.fill ?? 'none'),
          stroke,
          strokeWidth: stroke ? width : undefined,
          strokeLinejoin: 'round' as const,
          strokeLinecap: 'round' as const,
        };
  if (part.t === 'path') return <path key={key} d={part.d} {...common} />;
  if (part.t === 'circle')
    return <circle key={key} cx={part.cx} cy={part.cy} r={part.r} {...common} />;
  return (
    <rect
      key={key}
      x={part.x}
      y={part.y}
      width={part.width}
      height={part.height}
      rx={part.rx}
      {...common}
    />
  );
}

/** A sticker on a 32 by 32 grid: shadow, white edge, then the colours. */
export function StickerArt({ name }: { name: string }) {
  const parts = STICKER_ART[name];
  if (!parts) return null;
  return (
    <g>
      <g transform="translate(0.8 1.6)" opacity={0.3}>
        {parts.map((p, i) => draw(p, i, 'edge', '#000000'))}
      </g>
      {parts.map((p, i) => draw(p, i, 'edge', WHITE))}
      {parts.map((p, i) => draw(p, i, 'color', WHITE))}
    </g>
  );
}
