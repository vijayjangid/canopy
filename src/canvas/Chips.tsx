import { CHIP_ROW_HEIGHT, type ChipItem } from '../layout';
import { formatDate, type StatusDef, type TagDef, type Topic } from '../model';
import { legibleOn, readableOn, type ExportTheme } from '../io/exportTheme';

/** What chips need to look things up. Built once per map and theme, so memoized topics stay still. */
export interface ChipContext {
  statuses: ReadonlyMap<string, StatusDef>;
  tags: ReadonlyMap<string, TagDef>;
  today: string;
  now: Date;
  theme: ExportTheme;
  /** Show status names next to their marks. */
  full: boolean;
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
  const status = p?.status ? ctx.statuses.get(p.status) : undefined;
  if (status) parts.push(`status ${status.label}${status.flagged ? ' (flagged)' : ''}`);
  const due = p?.due?.end ?? p?.due?.start;
  if (due) {
    const finished = status?.category === 'complete' || status?.category === 'canceled';
    parts.push(`due ${shortDate(due, ctx.now)}${due < ctx.today && !finished ? ', overdue' : ''}`);
  }
  if (p?.tags?.length)
    parts.push(`tags ${p.tags.map((t) => ctx.tags.get(t)?.label ?? t).join(', ')}`);
  if (topic.note) parts.push('has a note');
  return parts.join(', ');
}

export function StatusMark({
  def,
  theme,
  x,
}: {
  def: StatusDef | undefined;
  theme: ExportTheme;
  x: number;
}) {
  const cx = x + 8;
  const stroke = { fill: 'none', stroke: theme.muted, strokeWidth: 1.6 };
  if (!def) {
    return <circle cx={cx} cy={CY} r={5} {...stroke} strokeDasharray="2 2" />;
  }
  if (def.flagged) {
    // A triangle with a bar: flagged work stands out by shape as well as by colour.
    return (
      <g>
        <path
          d={`M${cx} ${CY - 6.5}L${cx + 6.5} ${CY + 5}H${cx - 6.5}Z`}
          fill={theme.warn}
          stroke={theme.warn}
          strokeLinejoin="round"
          strokeWidth={1.5}
        />
        <path
          d={`M${cx} ${CY - 2.5}V${CY + 1.5}`}
          stroke={readableOn(theme.warn)}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </g>
    );
  }
  // In review waits for someone's approval, so it gets a shield instead of the progress circle.
  if (def.key === 'review') {
    return (
      <g>
        <path
          d={`M${cx} ${CY - 7}L${cx + 6} ${CY - 4.8}V${CY + 0.5}C${cx + 6} ${CY + 4} ${cx + 3} ${CY + 6} ${cx} ${CY + 7}C${cx - 3} ${CY + 6} ${cx - 6} ${CY + 4} ${cx - 6} ${CY + 0.5}V${CY - 4.8}Z`}
          fill={theme.pending}
          stroke={theme.pending}
          strokeLinejoin="round"
          strokeWidth={1}
        />
        <path
          d={`M${cx - 2.6} ${CY + 0.2}l2 2.2L${cx + 2.8} ${CY - 2.4}`}
          fill="none"
          stroke={readableOn(theme.pending)}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }
  switch (def.category) {
    case 'complete':
      return (
        <g>
          <circle cx={cx} cy={CY} r={6} fill={theme.good} />
          <path
            d={`M${cx - 3} ${CY}l2.2 2.4L${cx + 3.2} ${CY - 2.2}`}
            fill="none"
            stroke={readableOn(theme.good)}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'active':
      return (
        <g>
          <circle cx={cx} cy={CY} r={5.2} {...stroke} stroke={theme.info} />
          <path d={`M${cx} ${CY - 5.2}A5.2 5.2 0 0 1 ${cx} ${CY + 5.2}Z`} fill={theme.info} />
        </g>
      );
    case 'canceled':
      return (
        <g>
          <circle cx={cx} cy={CY} r={5.2} {...stroke} />
          <path
            d={`M${cx - 3.5} ${CY + 3.5}L${cx + 3.5} ${CY - 3.5}`}
            stroke={theme.muted}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </g>
      );
    default:
      return <circle cx={cx} cy={CY} r={5.2} {...stroke} />;
  }
}

/** The status mark as it is drawn on a topic, for use outside the map. */
export function StatusIcon({ def, theme }: { def: StatusDef | undefined; theme: ExportTheme }) {
  return (
    <svg
      className="status-icon"
      viewBox={`0 ${CY - 8} 16 16`}
      width="16"
      height="16"
      aria-hidden="true"
    >
      <StatusMark def={def} theme={theme} x={0} />
    </svg>
  );
}

function Chip({ item, topic, ctx }: { item: ChipItem; topic: Topic; ctx: ChipContext }) {
  const { theme } = ctx;
  const text = { fontSize: 11, fill: theme.topicText } as const;
  switch (item.kind) {
    case 'status': {
      const def = ctx.statuses.get(item.key);
      return (
        <g transform={`translate(${item.x} 0)`}>
          <StatusMark def={def} theme={ctx.theme} x={0} />
          {ctx.full && (
            <text
              x={20}
              y={CY}
              dominantBaseline="central"
              {...text}
              textDecoration={def?.category === 'canceled' ? 'line-through' : undefined}
            >
              {clip(def?.label ?? item.key, 11)}
            </text>
          )}
        </g>
      );
    }
    case 'due': {
      const status = topic.props?.status ? ctx.statuses.get(topic.props.status) : undefined;
      const finished = status?.category === 'complete' || status?.category === 'canceled';
      const late = item.date < ctx.today && !finished;
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
              return <circle key={key} cx={i * 14 + 5} cy={CY} r={5} fill={colour} />;
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
    case 'note':
      return (
        <g transform={`translate(${item.x} ${CY - 7})`}>
          <title>
            {clip(
              (topic.note ?? '')
                .replace(/[#*_`>~]/g, '')
                .replace(/\s+/g, ' ')
                .trim(),
              240,
            )}
          </title>
          <rect width={14} height={14} fill="transparent" />
          <path
            d="M2 1h7l3 3v9H2zM4.500 7h5M4.500 10h5"
            fill="none"
            stroke={theme.muted}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
