import { levelOf } from '../theme/levels';
import { memo, useMemo } from 'react';
import {
  CHIP_ROW_HEIGHT,
  chipRowWidth,
  firstBaselineOf,
  levelPrefix,
  textLines,
  typeForDepth,
  type ChipItem,
  type TopicBox,
} from '../layout';
import type { Topic } from '../model';
import { ChipRow, type ChipContext } from './Chips';
import { StickerLayer } from './StickerLayer';
import type { Look } from '../model';
import { textWidth } from './metrics';

export type Detail = 'full' | 'low';

/** A left curly brace, centred on the origin. Mirrored for the side that holds the sub-topics. */
const BRACE =
  'M2.5 -5.5Q-0.5 -5.5 -0.5 -2.5V-1.5Q-0.5 0 -2.5 0Q-0.5 0 -0.5 1.5V2.5Q-0.5 5.5 2.5 5.5';

/** Playful topics are pills. High Contrast gives each level its own corner, so shape carries meaning. */
export function cornerRadius(look: Look, depth: number, height: number): number {
  if (look === 'playful') return Math.min(height / 2, depth === 0 ? 24 : 20);
  if (look === 'contrast') return depth === 0 ? 16 : depth === 1 ? 10 : 2;
  return depth === 0 ? 14 : 10;
}

/** A ghost previews a topic that does not exist yet. A leaving topic is fading out. */
export type NodeKind = 'topic' | 'ghost' | 'leaving';

interface Props {
  box: TopicBox;
  title: string;
  kind: NodeKind;
  selected: boolean;
  focused: boolean;
  /** True while the title is being edited in the overlay, which draws the text itself. */
  editing: boolean;
  /** Undefined for topics without sub-topics. */
  expanded: boolean | undefined;
  position: number;
  siblings: number;
  opacity: number;
  /** How many topics a folded topic hides. Zero draws no badge. */
  hidden: number;
  flow: 'right' | 'down';
  look: Look;
  /** Show the level as a dim number before the title. */
  showLevel: boolean;
  detail: Detail;
  chips: readonly ChipItem[];
  /** The topic itself, which chips read their values from. */
  topic: Topic | undefined;
  chipContext: ChipContext | undefined;
  /** Fades the topic when a Filter does not pick it out. */
  dim: boolean;
  /** Lies on the way from the focused topic up to the Core. */
  trail: boolean;
  /** Roll-up shown on a folded topic, such as "3/7". */
  rollup: string | undefined;
  /** Spoken after the title, such as "has a note, status Done". */
  summary: string;
  /** Changes with the font, so lines are wrapped again even when the box stays the same. */
  epoch: number;
}

export const TopicNode = memo(function TopicNode({
  box,
  title,
  kind,
  selected,
  focused,
  editing,
  expanded,
  position,
  siblings,
  opacity,
  hidden,
  flow,
  look,
  showLevel,
  detail,
  chips,
  topic,
  chipContext,
  dim,
  trail,
  rollup,
  summary,
  epoch,
}: Props) {
  const { w, h, depth } = box;
  const style = typeForDepth(depth);
  const lines = useMemo(
    () => (detail === 'full' && !editing ? textLines(title, depth, textWidth) : []),
    // `epoch` is not read inside, but a new font wraps the same title differently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, editing, title, depth, epoch],
  );
  const empty = title.trim().length === 0;
  const radius = cornerRadius(look, depth, h);
  const chipsH = chips.length > 0 ? CHIP_ROW_HEIGHT : 0;
  const rowH = chipsH;
  const firstBaseline = firstBaselineOf(h, rowH, lines.length, style.lineHeight);
  const real = kind === 'topic';
  const count = hidden > 99 ? '99+' : String(hidden);
  const badgeText = rollup ? `${count} · ${rollup}` : count;
  const badgeW = 14 + badgeText.length * 7.5;
  const badge =
    flow === 'right' ? { x: w + 6, y: h / 2 - 10 } : { x: w / 2 - badgeW / 2, y: h + 6 };

  return (
    <g
      id={real ? `topic-${box.id}` : undefined}
      className="topic"
      role={real ? 'treeitem' : undefined}
      aria-hidden={real ? undefined : true}
      aria-level={real ? depth + 1 : undefined}
      aria-posinset={real ? position : undefined}
      aria-setsize={real ? siblings : undefined}
      aria-selected={real ? selected : undefined}
      aria-expanded={real ? expanded : undefined}
      aria-label={
        real ? [title.trim() || 'Empty topic', summary].filter(Boolean).join(', ') : undefined
      }
      data-topic-id={real ? box.id : undefined}
      data-kind={kind}
      data-depth={Math.min(depth, 3)}
      data-level={levelOf(depth)}
      data-selected={selected || undefined}
      data-dim={dim || undefined}
      data-trail={trail || undefined}
      data-focused={focused || undefined}
      opacity={opacity < 1 ? opacity : undefined}
      transform={`translate(${box.x} ${box.y})`}
    >
      {selected && (
        <rect className="topic-ring" x={-4} y={-4} width={w + 8} height={h + 8} rx={radius + 4} />
      )}
      {real && detail === 'full' && (
        <rect className="topic-shadow" y={2} width={w} height={h} rx={radius} />
      )}
      <rect className="topic-box" width={w} height={h} rx={radius} />
      {selected && <rect className="topic-wash" width={w} height={h} rx={radius} />}
      {lines.length > 0 && (
        <text
          className="topic-text"
          data-empty={empty || undefined}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={style.size}
          fontWeight={style.weight}
        >
          {lines.map((line, i) => (
            <tspan key={i} x={w / 2} y={firstBaseline + i * style.lineHeight}>
              {i === 0 && showLevel && depth > 0 && (
                <tspan className="level-prefix">{levelPrefix(depth, position)}</tspan>
              )}
              {line}
            </tspan>
          ))}
        </text>
      )}
      {detail === 'full' && chips.length > 0 && topic && chipContext && (
        <g
          className="topic-chips"
          aria-hidden="true"
          transform={`translate(${(w - chipRowWidth(chips)) / 2} ${h - chipsH})`}
        >
          <ChipRow items={chips} topic={topic} ctx={chipContext} />
        </g>
      )}
      {real && detail === 'full' && topic?.stickers && (
        <StickerLayer stickers={topic.stickers} w={w} h={h} />
      )}
      {real && detail === 'full' && expanded === true && (
        <g
          className="fold-toggle"
          data-fold-toggle=""
          data-tip="Fold (])"
          aria-hidden="true"
          transform={flow === 'right' ? `translate(${w} ${h / 2})` : `translate(${w / 2} ${h})`}
        >
          <g className="fold-toggle-body">
            <circle className="fold-toggle-hit" r={15} />
            <circle r={9} />
            <path d={BRACE} transform={`${flow === 'down' ? 'rotate(90) ' : ''}scale(-1 1)`} />
          </g>
        </g>
      )}
      {real && detail === 'full' && box.parentId !== null && (
        <g
          className="fold-toggle"
          data-parent-toggle=""
          data-tip="Fold everything above ([)"
          aria-hidden="true"
          transform={flow === 'right' ? `translate(0 ${h / 2})` : `translate(${w / 2} 0)`}
        >
          <g className="fold-toggle-body">
            <circle className="fold-toggle-hit" r={15} />
            <circle r={9} />
            <path d={BRACE} transform={flow === 'down' ? 'rotate(90)' : undefined} />
          </g>
        </g>
      )}
      {real && hidden > 0 && (
        <g
          className="fold-badge"
          data-fold-badge=""
          aria-hidden="true"
          transform={`translate(${badge.x} ${badge.y})`}
        >
          <rect width={badgeW} height={20} rx={10} />
          <text x={badgeW / 2} y={10} textAnchor="middle" dominantBaseline="central">
            {badgeText}
          </text>
        </g>
      )}
    </g>
  );
});
