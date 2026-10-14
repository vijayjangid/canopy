import { useId, type ReactElement } from 'react';

/** One drawn part of a sticker, on a 32 by 32 grid. */
type Part = (
  | { t: 'path'; d: string; fill?: string; stroke?: string; w?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; w?: number }
  | { t: 'rect'; x: number; y: number; width: number; height: number; rx?: number; fill?: string }
  | {
      t: 'text';
      x: number;
      y: number;
      value: string;
      size: number;
      fontWeight: number;
      fontFamily?: string;
      stroke?: string;
      w?: number;
      scaleX?: number;
      scaleY?: number;
      fill?: string;
    }
) & { cutout?: boolean; gradient?: readonly [string, string, string] };

const WHITE = '#ffffff';
const STROKE_WIDTH = 2;
const SYMBOL_STROKE_WIDTH = 2.5;
const DIE_CUT_OUTLINE_WIDTH = 5.5;
const HANDWRITTEN_FONT = "'Kalam', 'Comic Sans MS', cursive";
const COLORS = {
  yellow: '#ffc857',
  yellowLight: '#fff4bf',
  coral: '#ef476f',
  coralLight: '#ffd6de',
  orange: '#ff8c42',
  blue: '#4d8dff',
  blueLight: '#eaf3ff',
  blueDark: '#315a9b',
  green: '#2ecc71',
  purple: '#8b5cf6',
  slate: '#627386',
  ink: '#4a4e69',
  brown: '#8d5a3b',
} as const;
const WEEKDAY_GRADIENTS = {
  monday: ['#39c6ff', '#4d8dff', '#875cf6'],
  tuesday: ['#35b9f4', '#5286ee', '#945ceb'],
  wednesday: ['#4cabeb', '#5d84f0', '#a15de5'],
  thursday: ['#5b9fe4', '#667fe7', '#a961db'],
  friday: ['#6a95db', '#6e7fde', '#b662d1'],
  saturday: ['#7a8bd2', '#7778d5', '#c067c8'],
  sunday: ['#8b80c8', '#806fca', '#c66bbf'],
} as const;

const dieCutText = (label: string, color: string, size = 20): Part[] => [
  {
    t: 'text',
    x: 16,
    y: 16,
    value: label,
    size,
    fontWeight: 900,
    fontFamily: HANDWRITTEN_FONT,
    stroke: color,
    w: 0.8,
    fill: color,
  },
];

const dieCutGradientText = (
  label: string,
  gradient: readonly [string, string, string],
  size = 16,
): Part[] => [
  {
    t: 'text',
    x: 16,
    y: 16,
    value: label,
    size,
    fontWeight: 900,
    fontFamily: HANDWRITTEN_FONT,
    w: 0.8,
    scaleX: 0.8,
    scaleY: 1.25,
    gradient,
  },
];

/** Original flat artwork with a white die-cut edge and soft shadow. */
export const STICKER_ART: Record<string, Part[]> = {
  love: [
    {
      t: 'path',
      d: 'M16 28C6 20 3 15 3 10.5 3 7 5.8 4.5 9 4.5c3 0 5.5 1.8 7 4.5 1.5-2.7 4-4.5 7-4.5 3.2 0 6 2.5 6 6 0 4.5-3 9.5-13 17.5Z',
      fill: COLORS.coral,
    },
    {
      t: 'path',
      d: 'M8 10c.7-1.7 2-2.3 3.6-2.3',
      stroke: COLORS.coralLight,
      w: STROKE_WIDTH,
      fill: 'none',
    },
  ],
  bug: [
    {
      t: 'path',
      d: 'M13 8 11 4m8 4 2-4M10 13l-4-2m3 7H4m6 5-4 3m16-13 4-2m-3 7h5m-6 5 4 3',
      stroke: COLORS.ink,
      w: STROKE_WIDTH,
      fill: 'none',
    },
    {
      t: 'path',
      d: 'M16 7c6 0 9 5 9 12s-4 11-9 11-9-4-9-11 3-12 9-12Z',
      fill: COLORS.coral,
    },
    { t: 'path', d: 'M16 10v18', stroke: COLORS.ink, w: STROKE_WIDTH, fill: 'none' },
    { t: 'circle', cx: 16, cy: 7, r: 3.6, fill: COLORS.ink },
    { t: 'circle', cx: 14.7, cy: 6.5, r: 0.8, fill: WHITE },
    { t: 'circle', cx: 17.3, cy: 6.5, r: 0.8, fill: WHITE },
    { t: 'circle', cx: 12, cy: 15, r: 1.4, fill: WHITE },
    { t: 'circle', cx: 20, cy: 15, r: 1.4, fill: WHITE },
    { t: 'circle', cx: 12, cy: 22, r: 1.4, fill: WHITE },
    { t: 'circle', cx: 20, cy: 22, r: 1.4, fill: WHITE },
  ],
  idea: [
    { t: 'circle', cx: 16, cy: 13, r: 10, fill: COLORS.yellow },
    { t: 'rect', x: 11.5, y: 22, width: 9, height: 6, rx: 2, fill: COLORS.slate },
    {
      t: 'path',
      d: 'M12.5 13c0-2 1.5-3.5 3.5-3.5',
      stroke: COLORS.yellowLight,
      w: STROKE_WIDTH,
      fill: 'none',
    },
    { t: 'path', d: 'M12.5 25h7', stroke: COLORS.ink, w: STROKE_WIDTH, fill: 'none' },
  ],
  celebrate: [
    { t: 'path', d: 'M10 5h12v7c0 5-2.5 8-6 8s-6-3-6-8Z', fill: COLORS.yellow },
    {
      t: 'path',
      d: 'M10 7H5c0 4 2 6 5.5 6m11.5-6h5c0 4-2 6-5.5 6',
      stroke: COLORS.orange,
      w: STROKE_WIDTH,
      fill: 'none',
    },
    { t: 'rect', x: 14, y: 20, width: 4, height: 4, fill: COLORS.orange },
    { t: 'rect', x: 10, y: 24, width: 12, height: 4, rx: 1.5, fill: COLORS.yellow },
    {
      t: 'path',
      d: 'm5 3 1.2 2.5L9 6l-2.8 1L5 10 4 7l-3-1 3-.5Zm21 10 1.1 2.4L30 16l-2.9 1-1.1 2.5-1-2.5-3-1 3-.6Z',
      fill: COLORS.blue,
    },
  ],
  check: [
    { t: 'rect', x: 4.5, y: 5, width: 23, height: 22, rx: 4.5, fill: COLORS.green },
    {
      t: 'path',
      d: 'M10.5 16.2 14 19.7 21.5 12',
      stroke: WHITE,
      w: SYMBOL_STROKE_WIDTH,
      fill: 'none',
      cutout: false,
    },
  ],
  cross: [
    { t: 'circle', cx: 16, cy: 16, r: 13, fill: COLORS.coral },
    {
      t: 'path',
      d: 'm11 11 10 10m0-10L11 21',
      stroke: WHITE,
      w: SYMBOL_STROKE_WIDTH,
      fill: 'none',
      cutout: false,
    },
  ],
  question: [
    {
      t: 'path',
      d: 'M16 2.5C8.5 2.5 3 7.6 3 14.2c0 4.9 3.1 9 7.8 10.7l-.4 1.6c-.2.7.5 1.2 1.1.7l3.5-2.4c.3.1.7.2 1 .2 7.6 0 13-4.9 13-11.2C29 7.4 23.6 2.5 16 2.5Z',
      fill: COLORS.blue,
    },
    {
      t: 'path',
      d: 'M13.2 11.7c0-2.1 1.4-3.5 3.5-3.5s3.5 1.4 3.5 3.5c0 1.8-1.1 2.8-2.1 3.6-1 .8-1.4 1.5-1.4 2.8',
      stroke: WHITE,
      w: SYMBOL_STROKE_WIDTH,
      fill: 'none',
      cutout: false,
    },
    { t: 'circle', cx: 16.7, cy: 21.8, r: 1.05, fill: WHITE, cutout: false },
  ],
  warning: [
    {
      t: 'path',
      d: 'M13.2 4.8c1.2-2.1 4.4-2.1 5.6 0l10 18c1.2 2.1-.3 4.7-2.8 4.7H6c-2.5 0-4-2.6-2.8-4.7Z',
      fill: COLORS.yellow,
      stroke: COLORS.orange,
      w: STROKE_WIDTH,
    },
    {
      t: 'path',
      d: 'M16 13v5.5',
      stroke: COLORS.ink,
      w: SYMBOL_STROKE_WIDTH,
      fill: 'none',
      cutout: false,
    },
    { t: 'circle', cx: 16, cy: 22.3, r: 1.25, fill: COLORS.ink, cutout: false },
  ],
  flag: [
    { t: 'rect', x: 6, y: 3, width: 3, height: 26, rx: 1.5, fill: COLORS.ink },
    { t: 'path', d: 'M9 5c5-2.5 9 2.5 16 0v11c-7 2.5-11-2.5-16 0Z', fill: COLORS.coral },
    {
      t: 'path',
      d: 'M12 7c3-1 5 .6 7 1',
      stroke: COLORS.coralLight,
      w: STROKE_WIDTH,
      fill: 'none',
    },
  ],
  pin: [
    {
      t: 'path',
      d: 'M16 29s-10-10.5-10-17a10 10 0 1 1 20 0c0 6.5-10 17-10 17Z',
      fill: COLORS.coral,
    },
    { t: 'circle', cx: 16, cy: 12, r: 4, fill: COLORS.yellow },
    { t: 'circle', cx: 16, cy: 12, r: 1.5, fill: COLORS.yellowLight },
  ],
  delay: [
    {
      t: 'path',
      d: 'M4 9h5m-7 5h5m-5 5h5',
      stroke: COLORS.blue,
      w: STROKE_WIDTH,
      fill: 'none',
    },
    { t: 'circle', cx: 19, cy: 16, r: 12, fill: COLORS.blue },
    { t: 'circle', cx: 19, cy: 16, r: 8.5, fill: COLORS.blueLight },
    {
      t: 'path',
      d: 'M19 10.5V16l4 2.5',
      stroke: COLORS.blueDark,
      w: STROKE_WIDTH,
      fill: 'none',
    },
  ],
  'arrow-up': [{ t: 'path', d: 'M16 3 4 15h6.5v14h11V15H28L16 3Z', fill: COLORS.green }],
  'arrow-down': [{ t: 'path', d: 'M16 29 28 17h-6.5V3h-11v14H4L16 29Z', fill: COLORS.coral }],
  p1: dieCutText('P1', COLORS.coral),
  p2: dieCutText('P2', COLORS.orange),
  p3: dieCutText('P3', COLORS.blue),
  p4: dieCutText('P4', COLORS.purple),
  monday: dieCutGradientText('MON', WEEKDAY_GRADIENTS.monday),
  tuesday: dieCutGradientText('TUE', WEEKDAY_GRADIENTS.tuesday),
  wednesday: dieCutGradientText('WED', WEEKDAY_GRADIENTS.wednesday),
  thursday: dieCutGradientText('THU', WEEKDAY_GRADIENTS.thursday),
  friday: dieCutGradientText('FRI', WEEKDAY_GRADIENTS.friday),
  saturday: dieCutGradientText('SAT', WEEKDAY_GRADIENTS.saturday),
  sunday: dieCutGradientText('SUN', WEEKDAY_GRADIENTS.sunday),
  'thumbs-up': [
    {
      t: 'path',
      d: 'M12 14 17 4c2-1 4 .5 3.5 3l-1 5h6c2 0 3 1.5 2.5 3.2l-2.5 9c-.4 1.2-1.4 1.8-2.7 1.8H12Z',
      fill: COLORS.yellow,
    },
    { t: 'rect', x: 4, y: 13, width: 7, height: 14, rx: 2, fill: COLORS.blue },
    { t: 'circle', cx: 7.5, cy: 16, r: 1, fill: COLORS.blueLight },
  ],
  'thumbs-down': [
    {
      t: 'path',
      d: 'M12 18 17 28c2 1 4-.5 3.5-3l-1-5h6c2 0 3-1.5 2.5-3.2l-2.5-9C27.1 6.6 26.1 6 24.8 6H12Z',
      fill: COLORS.coral,
    },
    { t: 'rect', x: 4, y: 5, width: 7, height: 14, rx: 2, fill: COLORS.slate },
    { t: 'circle', cx: 7.5, cy: 16, r: 1, fill: COLORS.blueLight },
  ],
  pause: [
    { t: 'circle', cx: 16, cy: 16, r: 13, fill: COLORS.purple },
    { t: 'rect', x: 10, y: 9, width: 4, height: 14, rx: 2, fill: WHITE, cutout: false },
    { t: 'rect', x: 18, y: 9, width: 4, height: 14, rx: 2, fill: WHITE, cutout: false },
  ],
  home: [
    { t: 'path', d: 'M3 15 16 4l13 11-2.5 3L16 9.5 5.5 18Z', fill: COLORS.coral },
    { t: 'path', d: 'M7 15.5 16 8l9 7.5V28H7Z', fill: COLORS.yellow },
    { t: 'rect', x: 13, y: 19, width: 6, height: 9, rx: 1, fill: COLORS.brown },
    { t: 'rect', x: 9, y: 17, width: 3, height: 3, rx: 0.5, fill: COLORS.blueLight },
    { t: 'rect', x: 20, y: 17, width: 3, height: 3, rx: 0.5, fill: COLORS.blueLight },
  ],
};

export const STICKER_KEYS = Object.keys(STICKER_ART);

function draw(
  part: Part,
  key: number,
  mode: 'color' | 'edge',
  edge: string,
  gradientId: string,
): ReactElement {
  const stroke =
    part.t === 'rect'
      ? undefined
      : part.t === 'text' && part.gradient && mode === 'color'
        ? `url(#${gradientId})`
        : part.stroke;
  const width = part.t === 'rect' ? 0 : (part.w ?? 0);
  const common =
    mode === 'edge'
      ? {
          fill: part.t !== 'rect' && part.t !== 'text' && part.fill === 'none' ? 'none' : edge,
          stroke: edge,
          strokeWidth: width + DIE_CUT_OUTLINE_WIDTH,
          strokeLinejoin: 'round' as const,
          strokeLinecap: 'round' as const,
        }
      : {
          fill:
            part.t !== 'rect' && part.t !== 'text' && part.fill === 'none'
              ? 'none'
              : part.gradient
                ? `url(#${gradientId})`
                : (part.fill ?? 'none'),
          stroke,
          strokeWidth: stroke ? width : undefined,
          strokeLinejoin: 'round' as const,
          strokeLinecap: 'round' as const,
        };
  if (part.t === 'path') return <path key={key} d={part.d} {...common} />;
  if (part.t === 'circle')
    return <circle key={key} cx={part.cx} cy={part.cy} r={part.r} {...common} />;
  if (part.t === 'rect')
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
  return (
    <text
      key={key}
      x={part.x}
      y={part.y}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily={part.fontFamily ?? 'system-ui, sans-serif'}
      fontSize={part.size}
      fontWeight={part.fontWeight}
      paintOrder="stroke"
      transform={
        part.scaleX !== undefined || part.scaleY !== undefined
          ? `translate(${part.x} ${part.y}) scale(${part.scaleX ?? 1} ${part.scaleY ?? 1}) translate(${-part.x} ${-part.y})`
          : undefined
      }
      {...common}
    >
      {part.value}
    </text>
  );
}

/** A sticker on a 32 by 32 grid: shadow, white edge, then the colours. */
export function StickerArt({ name }: { name: string }) {
  const instanceId = useId().replace(/:/g, '');
  const parts = STICKER_ART[name];
  if (!parts) return null;
  const cutoutParts = parts.filter((part) => part.cutout !== false);
  return (
    <g>
      <defs>
        {parts.map((part, i) =>
          part.gradient ? (
            <linearGradient
              key={i}
              id={`${instanceId}-${name}-${i}`}
              x1="0%"
              y1="100%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={part.gradient[0]} />
              <stop offset="50%" stopColor={part.gradient[1]} />
              <stop offset="100%" stopColor={part.gradient[2]} />
            </linearGradient>
          ) : null,
        )}
      </defs>
      <g transform="translate(0.8 1.6)" opacity={0.3}>
        {cutoutParts.map((p, i) => draw(p, i, 'edge', '#000000', `${instanceId}-${name}-${i}`))}
      </g>
      {cutoutParts.map((p, i) => draw(p, i, 'edge', WHITE, `${instanceId}-${name}-${i}`))}
      {parts.map((p, i) => draw(p, i, 'color', WHITE, `${instanceId}-${name}-${i}`))}
    </g>
  );
}
