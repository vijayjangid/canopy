import type { EdgeData, Flow, Topic } from '../model';
import type { TextWidth, TypeStyle } from './measure';
import type { Attach, Box } from './types';

/** The size of the badge that sits on the middle of a line. */
export const EDGE_STICKER = 22;
export const EDGE_BADGE_HEIGHT = 26;
const PAD = 10;
const GAP = 4;
/** Longest label drawn on the canvas; the editor and file keep the whole text. */
const SHOWN_CHARS = 32;

export const EDGE_TYPE: TypeStyle = { size: 12, weight: 500, lineHeight: 16 };

export interface EdgeBadgeSize {
  w: number;
  h: number;
  /** Where the label text starts, from the badge's left edge. */
  textX: number;
  textW: number;
  shown: string;
}

export function shownLabel(label: string): string {
  return label.length > SHOWN_CHARS ? `${label.slice(0, SHOWN_CHARS - 1)}\u2026` : label;
}

/** The badge for a line, or null when the line carries nothing. */
export function edgeBadgeSize(
  edge: EdgeData | undefined,
  textWidth: TextWidth,
): EdgeBadgeSize | null {
  const stickers = edge?.stickers?.length ?? 0;
  const label = edge?.label ?? '';
  if (stickers === 0 && label === '') return null;
  const shown = shownLabel(label);
  const textW = shown === '' ? 0 : Math.ceil(textWidth(shown, EDGE_TYPE));
  const stickersW = stickers * EDGE_STICKER + Math.max(0, stickers - 1) * 2;
  const textX = PAD + stickersW + (stickersW > 0 && textW > 0 ? GAP : 0);
  return { w: textX + textW + PAD, h: EDGE_BADGE_HEIGHT, textX, textW, shown };
}

export const EDGE_EDITOR_HEIGHT = 28;

/** Clear line left around a label, in total, along the Flow, so it never looks squeezed. */
const ROOM_ALONG = 104;
const ROOM_ACROSS = 60;

/** Width of the label field in map units, in steps so the map does not shift on every key. */
export function edgeEditorWidth(label: string, textWidth: TextWidth): number {
  const text = label === '' ? 0 : textWidth(label, EDGE_TYPE);
  return Math.max(160, Math.ceil((text + 48) / 40) * 40);
}

/** The middle of the line from a parent to its child, where the badge sits. */
export function edgeMidpoint(
  parent: Box,
  child: Box,
  flow: Flow,
  attach?: Attach,
): { x: number; y: number } {
  if (attach === 'left') {
    return {
      x: (parent.x + child.x + child.w) / 2,
      y: (parent.y + parent.h / 2 + child.y + child.h / 2) / 2,
    };
  }
  if (attach) flow = attach === 'down' ? 'down' : 'right';
  if (flow === 'right') {
    return {
      x: (parent.x + parent.w + child.x) / 2,
      y: (parent.y + parent.h / 2 + child.y + child.h / 2) / 2,
    };
  }
  return {
    x: (parent.x + parent.w / 2 + child.x + child.w / 2) / 2,
    y: (parent.y + parent.h + child.y) / 2,
  };
}

/**
 * Extra room a topic's line needs, so the badge fits between it and its parent.
 * Counted along the Flow, on top of the usual level spacing.
 */
export function edgeGap(
  topic: Topic,
  flow: Flow,
  textWidth: TextWidth,
  /** The label is being typed, so the room needed is the editor's. */
  editing = false,
): number {
  if (editing) {
    return flow === 'right'
      ? edgeEditorWidth(topic.edge?.label ?? '', textWidth) + ROOM_ALONG
      : EDGE_EDITOR_HEIGHT + ROOM_ACROSS;
  }
  const size = edgeBadgeSize(topic.edge, textWidth);
  if (!size) return 0;
  return flow === 'right' ? size.w + ROOM_ALONG : size.h + ROOM_ACROSS;
}
