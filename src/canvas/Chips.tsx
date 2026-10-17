import { CHIP_ROW_HEIGHT, type ChipItem } from '../layout';
import { formatDate, type TagDef, type Topic } from '../model';
import { legibleOn, mixHex, type ExportTheme } from '../io/exportTheme';

/** What chips need to look things up. Built once per map and theme, so memoized topics stay still. */
export interface ChipContext {
  tags: ReadonlyMap<string, TagDef>;
  today: string;
  now: Date;
  theme: ExportTheme;
  /** Show tag names next to their marks. */
  full: boolean;
  /** The chips sit on the solid Core, so they read against its colour instead of a plain topic's. */
  onCore?: boolean;
}

/** The same context, with colours that read on the solid Core. */
export function contextOnCore(ctx: ChipContext): ChipContext {
  const { theme } = ctx;
  return {
    ...ctx,
    onCore: true,
    theme: {
      ...theme,
      topicBg: theme.coreBg,
      topicText: theme.coreText,
      muted: mixHex(theme.coreText, theme.coreBg, 0.78),
    },
  };
}

const CY = CHIP_ROW_HEIGHT / 2;

const shortDate = (iso: string, now: Date) => {
  const text = formatDate(iso, now);
  // Another year gets a short suffix instead of the full year, to keep chips narrow.
  return /\d{4}$/.test(text)
    ? text.replace(/,?\s*(\d{4})$/, (_m, y: string) => ` ’${y.slice(2)}`)
    : text;
};

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/** One sentence-like description of a topic's Properties, for assistive technology. */
export function describeProps(topic: Topic, ctx: ChipContext): string {
  const p = topic.props;
  const parts: string[] = [];
  const due = p?.due?.end ?? p?.due?.start;
  if (due) parts.push(`due ${shortDate(due, ctx.now)}${due < ctx.today ? ', overdue' : ''}`);
  if (p?.tags?.length)
    parts.push(`tags ${p.tags.map((t) => ctx.tags.get(t)?.label ?? t).join(', ')}`);
  return parts.join(', ');
}

function Chip({ item, topic, ctx }: { item: ChipItem; topic: Topic; ctx: ChipContext }) {
  const { theme } = ctx;
  const text = { fontSize: 11, fill: theme.topicText } as const;
  switch (item.kind) {
    case 'due': {
      const late = item.date < ctx.today;
      return (
        <g transform={`translate(${item.x} 0)`}>
          <text
            x={0}
            y={CY}
            dominantBaseline="central"
            {...text}
            fill={late ? theme.warn : theme.topicText}
            fontWeight={late ? 700 : 500}
            textDecoration={late ? 'underline' : undefined}
          >
            {shortDate(item.date, ctx.now)}
          </text>
        </g>
      );
    }
    case 'tags':
      return (
        <g transform={`translate(${item.x} 0)`}>
          <title>
            {(topic.props?.tags ?? []).map((k) => ctx.tags.get(k)?.label ?? k).join(', ')}
          </title>
          {item.keys.map((key, i) => {
            const tag = ctx.tags.get(key);
            const colour = tag?.color ?? theme.muted;
            if (!ctx.full) {
              return (
                <circle
                  key={key}
                  cx={i * 14 + 5}
                  cy={CY}
                  r={5}
                  fill={colour}
                  stroke={ctx.onCore ? theme.topicText : undefined}
                  strokeWidth={ctx.onCore ? 1.2 : undefined}
                />
              );
            }
            return (
              <text
                key={key}
                x={i * 62}
                y={CY}
                dominantBaseline="central"
                fontSize={9.5}
                fontWeight={500}
                fill={legibleOn(colour, theme.topicBg, theme.topicText)}
              >
                #{clip(tag?.label ?? key, 8)}
              </text>
            );
          })}
          {item.more > 0 && (
            <text
              x={item.keys.length * 62}
              y={CY}
              dominantBaseline="central"
              fontSize={10}
              fontWeight={600}
              fill={theme.muted}
            >
              +{item.more} more
            </text>
          )}
        </g>
      );
  }
}

/** The row of chips. Used on the canvas and, rendered to markup, in exports. */
export function ChipRow({
  items,
  topic,
  ctx,
}: {
  items: readonly ChipItem[];
  topic: Topic;
  ctx: ChipContext;
}) {
  return (
    <>
      {items.map((item) => (
        <Chip key={item.kind} item={item} topic={topic} ctx={ctx} />
      ))}
    </>
  );
}
