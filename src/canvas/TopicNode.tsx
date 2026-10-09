import { levelOf } from '../theme/levels';
import { memo, useMemo } from 'react';
import {
  CHIP_ROW_HEIGHT,
  chipRowWidth,
  firstBaselineOf,
  IMAGE_PAD,
  imageOffset,
  imageSize,
  levelPrefix,
  STICKER_RIM,
  STICKER_SHADOW_OFFSET,
  stickerBlob,
  textLines,
  typeForDepth,
  type ChipItem,
  type TopicBox,
} from '../layout';
import type { Topic } from '../model';
import { ChipRow, contextOnCore, type ChipContext } from './Chips';
import { StickerLayer } from './StickerLayer';
import { TopicGlyph } from './TopicGlyph';
import type { Look } from '../model';
import { textWidth } from './metrics';

export type Detail = 'full' | 'low';

/** A left curly brace, centred on the origin. Mirrored for the side that holds the sub-topics. */
const BRACE =
  'M2.5 -5.5Q-0.5 -5.5 -0.5 -2.5V-1.5Q-0.5 0 -2.5 0Q-0.5 0 -0.5 1.5V2.5Q-0.5 5.5 2.5 5.5';

/** Playful topics are softly rounded stickers. High Contrast gives each level its own corner, so shape carries meaning. */
export function cornerRadius(look: Look, depth: number, height: number): number {
  if (look === 'playful') return Math.min(height * 0.4, depth === 0 ? 18 : 16);
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
  /** Fold buttons are drawn. Zoomed out they are kept for maps small enough to afford them. */
  controls: boolean;
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

/** Describe and remove buttons on the corner of a picture. The canvas handles the presses. */
function ImageControls({
  id,
  x,
  y,
  hasAlt,
}: {
  id: string;
  x: number;
  y: number;
  hasAlt: boolean;
}) {
  return (
    <g className="image-controls" aria-hidden="true" transform={`translate(${x} ${y})`}>
      <g
        className="image-control"
        data-image-alt={id}
        data-has-alt={hasAlt || undefined}
        data-tip={hasAlt ? 'Edit picture description' : 'Describe picture (alt text)'}
        transform="translate(-26 0)"
      >
        <circle r={11} />
        <text textAnchor="middle" dominantBaseline="central">
          Alt
        </text>
      </g>
      <g className="image-control" data-image-delete={id} data-tip="Remove picture">
        <circle r={11} />
        <path d="M-3.5 -3.5L3.5 3.5M3.5 -3.5L-3.5 3.5" />
      </g>
    </g>
  );
}

/** The picture on a topic, with softly rounded corners. Zoomed far out it is a plain block. */
function TopicPicture({
  id,
  src,
  x,
  y,
  w,
  h,
  full,
  alt,
}: {
  id: string;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  full: boolean;
  alt: string | undefined;
}) {
  if (!full) return <rect className="topic-image-low" x={x} y={y} width={w} height={h} rx={4} />;
  const clip = `topic-image-clip-${id}`;
  return (
    <>
      <clipPath id={clip}>
        <rect x={x} y={y} width={w} height={h} rx={6} />
      </clipPath>
      <image
        className="topic-image"
        href={src}
        x={x}
        y={y}
        width={w}
        height={h}
        preserveAspectRatio="none"
        clipPath={`url(#${clip})`}
      >
        {alt && <title>{alt}</title>}
      </image>
    </>
  );
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
  controls,
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
  const hasImage = topic?.image !== undefined;
  const lines = useMemo(
    () =>
      detail === 'full' && !editing && !(hasImage && title.trim() === '')
        ? textLines(title, depth, textWidth)
        : [],
    // `epoch` is not read inside, but a new font wraps the same title differently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, editing, title, depth, epoch, hasImage],
  );
  const empty = title.trim().length === 0;
  const radius = cornerRadius(look, depth, h);
  const chipsH = chips.length > 0 ? CHIP_ROW_HEIGHT : 0;
  const rowH = chipsH;
  // A picture sits above the title, which is then centred in what is left of the box.
  const above = topic ? imageOffset(topic) : 0;
  const picture = imageSize(topic?.image);
  const firstBaseline = above + firstBaselineOf(h - above, rowH, lines.length, style.lineHeight);
  const real = kind === 'topic';
  const count = hidden > 99 ? '99+' : String(hidden);
  const badgeText = rollup ? `${count} · ${rollup}` : count;
  const badgeW = 14 + badgeText.length * 7.5;
  const badge =
    flow === 'right' ? { x: w + 6, y: h / 2 - 10 } : { x: w / 2 - badgeW / 2, y: h + 6 };
  const titleLines = lines.map((line, i) => (
    <tspan key={i} x={w / 2} y={firstBaseline + i * style.lineHeight}>
      {i === 0 && showLevel && depth > 0 && (
        <tspan className="level-prefix">{levelPrefix(depth, position)}</tspan>
      )}
      {line}
    </tspan>
  ));

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
      {picture && topic?.image && (
        <TopicPicture
          id={box.id}
          src={topic.image.src}
          x={(w - picture.w) / 2}
          y={IMAGE_PAD}
          w={picture.w}
          h={picture.h}
          full={detail === 'full'}
          alt={topic.image.alt}
        />
      )}
      {real && detail === 'full' && picture && topic?.image && (
        <ImageControls
          id={box.id}
          x={(w + picture.w) / 2 - 8}
          y={IMAGE_PAD + 16}
          hasAlt={!!topic.image.alt}
        />
      )}
      {real && detail === 'low' && topic && chipContext && (
        <TopicGlyph topic={topic} depth={depth} w={w} h={h} ctx={chipContext} />
      )}
      {lines.length > 0 && look === 'playful' && (
        <g className="sticker-blob" aria-hidden="true">
          {(['shadow', 'rim', 'face'] as const).map((layer) => (
            <g
              key={layer}
              className={`sticker-${layer}`}
              transform={
                layer === 'shadow'
                  ? `translate(${STICKER_SHADOW_OFFSET.x} ${STICKER_SHADOW_OFFSET.y})`
                  : undefined
              }
            >
              {stickerBlob(
                lines,
                w / 2,
                firstBaseline,
                style,
                showLevel && depth > 0 ? levelPrefix(depth, position) : '',
                textWidth,
                layer === 'face' ? 0 : STICKER_RIM,
                chipsH > 0
                  ? { width: chipRowWidth(chips), top: h - chipsH, height: chipsH }
                  : undefined,
              ).map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r} />
              ))}
            </g>
          ))}
        </g>
      )}
      {lines.length > 0 && (
        <text
          className="topic-text"
          data-empty={empty || undefined}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={style.size}
          fontWeight={style.weight}
        >
          {titleLines}
        </text>
      )}
      {detail === 'full' && chips.length > 0 && topic && chipContext && (
        <g
          className="topic-chips"
          aria-hidden="true"
          transform={`translate(${(w - chipRowWidth(chips)) / 2} ${h - chipsH})`}
        >
          <ChipRow
            items={chips}
            topic={topic}
            ctx={depth === 0 && look !== 'playful' ? contextOnCore(chipContext) : chipContext}
          />
        </g>
      )}
      {real && detail === 'full' && topic?.stickers && (
        <StickerLayer stickers={topic.stickers} w={w} h={h} />
      )}
      {real && controls && expanded === true && (
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
      {real && controls && box.parentId !== null && (
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
