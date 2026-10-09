import { IMAGE_PAD, imageOffset, imageSize } from '../layout';
import type { Topic } from '../model';
import { StatusMark, type ChipContext } from './Chips';

/** A house, for the Core. The door is cut out. */
const HOME = 'M0 -8.5L9.5 -0.2H7V8.5H-7V-0.2H-9.5ZM-2.2 8.5V2.6H2.2V8.5Z';
/** A picture frame with a sun and hills. */
const PICTURE = 'M-9 -7H9V7H-9ZM-9 7L-3 0.5L1 4.5L4 1.5L9 7';
/** A page with a folded corner and two lines of text. */
const NOTE = 'M-6 -8.5H2.5L6.5 -4.5V8.5H-6ZM2.5 -8.5V-4.5H6.5M-3 0H3.5M-3 3.8H3.5';
/** The letter T, for a topic that is only text. */
const TEXT = 'M-6.5 -6H6.5M0 -6V7';

/** The room one glyph is drawn in: its drawings are about 20 units across. */
const CELL = 20;
/** Height kept under the main glyph for the row of small marks. */
const MARKS_ROW = 14;

type Mark = { kind: 'tag'; color: string } | { kind: 'due'; late: boolean } | { kind: 'note' };

/** Small marks for what the main glyph does not show: tags, a due date, a note. */
function marksOf(topic: Topic, ctx: ChipContext, noteIsMain: boolean): Mark[] {
  const marks: Mark[] = [];
  for (const key of (topic.props?.tags ?? []).slice(0, 3)) {
    marks.push({ kind: 'tag', color: ctx.tags.get(key)?.color ?? ctx.theme.accent });
  }
  const due = topic.props?.due?.end ?? topic.props?.due?.start;
  if (due) {
    const category = topic.props?.status
      ? ctx.statuses.get(topic.props.status)?.category
      : undefined;
    const finished = category === 'complete' || category === 'canceled';
    marks.push({ kind: 'due', late: due < ctx.today && !finished });
  }
  if (topic.note && !noteIsMain) marks.push({ kind: 'note' });
  return marks;
}

function Glyph({ d, size, fill }: { d: string; size: number; fill?: boolean }) {
  const s = size / CELL;
  return (
    <path
      className="topic-glyph-shape"
      d={d}
      transform={`scale(${s})`}
      fill={fill ? 'currentColor' : 'none'}
      fillRule="evenodd"
      stroke="currentColor"
      strokeWidth={fill ? 0.6 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="none"
    />
  );
}

/**
 * What a topic shows when the map is zoomed out too far to read: an icon for what it holds.
 * The Core is a house. Under a picture there is a picture mark. Then, in order: its status, a note
 * mark, or a T when it is only text. Tags, a due date and a note appear as small marks below.
 */
export function TopicGlyph({
  topic,
  depth,
  w,
  h,
  ctx,
}: {
  topic: Topic;
  depth: number;
  w: number;
  h: number;
  ctx: ChipContext;
}) {
  const core = depth === 0;
  const picture = imageSize(topic.image);
  const above = imageOffset(topic);
  const status = topic.props?.status ? ctx.statuses.get(topic.props.status) : undefined;
  const hasStatus = topic.props?.status !== undefined;
  const hasTitle = topic.title.trim() !== '';
  const noteIsMain = !core && !hasStatus && !!topic.note;
  const marks = marksOf(topic, ctx, noteIsMain);
  const marksH = marks.length > 0 ? MARKS_ROW : 0;

  // Under a picture a topic with no title and no status has nothing more to say.
  const showMain = core || hasStatus || noteIsMain || hasTitle;
  const room = h - above - marksH;
  const size = Math.max(12, Math.min(room * 0.7, 28));
  const cx = w / 2;
  const cy = above + room / 2;

  const gap = 10;
  const rowWidth = (marks.length - 1) * gap;

  return (
    <g className="topic-glyph" aria-hidden="true">
      {picture && topic.image && (
        <g
          className="topic-glyph-picture"
          data-glyph="picture"
          transform={`translate(${w / 2} ${IMAGE_PAD + picture.h / 2})`}
        >
          <Glyph d={PICTURE} size={Math.max(14, Math.min(picture.w, picture.h) * 0.5)} />
        </g>
      )}
      {showMain && (
        <g
          data-glyph={core ? 'home' : hasStatus ? 'status' : noteIsMain ? 'note' : 'text'}
          transform={`translate(${cx} ${cy})`}
        >
          {core ? (
            <Glyph d={HOME} size={size} fill />
          ) : hasStatus ? (
            <g
              transform={`translate(${-8 * (size / 16)} ${-10 * (size / 16)}) scale(${size / 16})`}
            >
              <StatusMark def={status} theme={ctx.theme} x={0} />
            </g>
          ) : noteIsMain ? (
            <Glyph d={NOTE} size={size} />
          ) : (
            <Glyph d={TEXT} size={size} />
          )}
        </g>
      )}
      {marks.map((mark, i) => (
        <g
          key={i}
          data-mark={mark.kind}
          transform={`translate(${cx - rowWidth / 2 + i * gap} ${h - MARKS_ROW / 2 - 1})`}
        >
          {mark.kind === 'tag' ? (
            <circle r={3.4} fill={mark.color} />
          ) : mark.kind === 'due' ? (
            <rect
              x={-3.4}
              y={-3.4}
              width={6.8}
              height={6.8}
              rx={1.4}
              fill={mark.late ? ctx.theme.warn : ctx.theme.info}
            />
          ) : (
            <Glyph d={NOTE} size={9} />
          )}
        </g>
      ))}
    </g>
  );
}
