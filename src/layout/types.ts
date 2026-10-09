import type { Density, Flow, Topic, TopicId } from '../model';

export interface Size {
  w: number;
  h: number;
}

export interface Box extends Size {
  x: number;
  y: number;
}

/**
 * How a topic hangs off its parent. Only the compact layout sets it, because there topics can
 * sit to the left, below or indented under the parent instead of always following the Flow.
 */
export type Attach = 'right' | 'left' | 'down' | 'hang' | 'hangLeft';

/** Where an indented ("hanging") child sits from its parent's edge, and where its line drops. */
export const HANG_INDENT = 28;
export const HANG_LINE = 14;

export interface TopicBox extends Box {
  id: TopicId;
  parentId: TopicId | null;
  /** Level: the Core is 0. */
  depth: number;
  /** Place among its peers, from 1. The Core is 1. */
  position: number;
  attach?: Attach;
}

export interface Layout {
  /** Visible topics only. Everything below a folded topic is left out. */
  boxes: Map<TopicId, TopicBox>;
  /** The same boxes in preorder (parents before children, peers in display order). */
  order: TopicBox[];
  bounds: Box;
  /** Set when topics were moved around to use space well, so Flow no longer says where children are. */
  compact?: boolean;
}

export type Measure = (topic: Topic, depth: number, position?: number) => Size;

export interface LayoutOptions {
  flow: Flow;
  density: Density;
  measure: Measure;
  /** Extra space a topic's line to its parent needs, along the Flow. */
  edgeGap?: (topic: Topic) => number;
}

export interface Spacing {
  /** Space between a topic and its children, along the Flow. */
  level: number;
  /** Space between peers, across the Flow. */
  sibling: number;
}

export const SPACING: Record<Density, Spacing> = {
  compact: { level: 28, sibling: 8 },
  comfortable: { level: 44, sibling: 14 },
  airy: { level: 64, sibling: 22 },
};
