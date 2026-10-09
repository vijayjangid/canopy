import {
  computeLayout,
  edgeMidpoint,
  type Box,
  type Layout,
  type LayoutOptions,
  type TopicBox,
} from '../layout';
import {
  ModelError,
  createPeer,
  childrenOf,
  createSubTopic,
  insertBetween,
  type CanopyMap,
  type Flow,
  type TopicId,
} from '../model';
import type { Viewport } from './viewport';

/**
 * Where a new topic can grow from a subject: as its child, as a peer before or after it, or in the
 * line above it. `between` takes the subject down as its child, and `level` does the same for the
 * subject and all its peers.
 */
export type GrowthKind = 'child' | 'before' | 'after' | 'between' | 'level';

export interface GrowthSlot {
  subject: TopicId;
  kind: GrowthKind;
  /** ID the topic will have, so a ghost turns into the real topic without a swap. */
  id: TopicId;
}

/** The kinds that get a handle and can be snapped to. `level` is `between` with Shift held. */
export const GROWTH_KINDS: readonly GrowthKind[] = ['child', 'before', 'after', 'between'];

export function canGrow(map: CanopyMap, subject: TopicId, kind: GrowthKind): boolean {
  const topic = map.topics[subject];
  if (!topic) return false;
  return kind === 'child' || topic.parentId !== null;
}

/** The topic a slot holds still while it is previewed: the parent when a level is inserted. */
function holdOf(map: CanopyMap, slot: GrowthSlot): TopicId {
  const inLine = slot.kind === 'between' || slot.kind === 'level';
  return (inLine && map.topics[slot.subject]?.parentId) || slot.subject;
}

export function applyGrowth(map: CanopyMap, slot: GrowthSlot) {
  const opts = { id: slot.id };
  if (slot.kind === 'between' || slot.kind === 'level') {
    const parentId = map.topics[slot.subject]?.parentId;
    if (!parentId) throw new ModelError('CORE_IMMUTABLE', 'The Core has no line to insert on');
    const moving =
      slot.kind === 'level' ? childrenOf(map, parentId).map((t) => t.id) : [slot.subject];
    return insertBetween(map, parentId, moving, opts);
  }
  return slot.kind === 'child'
    ? createSubTopic(map, slot.subject, opts)
    : createPeer(map, slot.subject, slot.kind, opts);
}

export interface GrowthPreview {
  /** The layout with the new topic in it, held so the subject does not move. */
  layout: Layout;
  ghost: TopicBox;
  /** How far the held layout sits from the layout the map really gets. */
  shift: { x: number; y: number };
}

/** What the map would look like with the new topic added, positioned around the subject. */
export function previewGrowth(
  map: CanopyMap,
  current: Layout,
  slot: GrowthSlot,
  options: LayoutOptions,
): GrowthPreview | null {
  let grown: CanopyMap;
  try {
    grown = applyGrowth(map, slot).map;
  } catch (error) {
    if (error instanceof ModelError) return null;
    throw error;
  }
  const next = computeLayout(grown, options);
  const hold = holdOf(map, slot);
  const before = current.boxes.get(hold);
  const after = next.boxes.get(hold);
  if (!before || !after || !next.boxes.has(slot.id)) return null;

  const shift = { x: before.x - after.x, y: before.y - after.y };
  const boxes = new Map<TopicId, TopicBox>();
  const order = next.order.map((b) => {
    const moved = { ...b, x: b.x + shift.x, y: b.y + shift.y };
    boxes.set(moved.id, moved);
    return moved;
  });
  const ghost = boxes.get(slot.id);
  if (!ghost) return null;
  const bounds: Box = {
    ...next.bounds,
    x: next.bounds.x + shift.x,
    y: next.bounds.y + shift.y,
  };
  return { layout: { boxes, order, bounds }, ghost, shift };
}

/** The point on a topic's edge where a new topic of this kind attaches. */
export function anchorOf(
  box: Box,
  flow: Flow,
  kind: GrowthKind,
  /** The parent's box, which a line needs to find its middle. */
  parent?: Box,
): { x: number; y: number } {
  if (kind === 'between' || kind === 'level') {
    return parent
      ? edgeMidpoint(parent, box, flow)
      : { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  if (flow === 'right') {
    if (kind === 'child') return { x: box.x + box.w, y: cy };
    return { x: cx, y: kind === 'before' ? box.y : box.y + box.h };
  }
  if (kind === 'child') return { x: cx, y: box.y + box.h };
  return { x: kind === 'before' ? box.x : box.x + box.w, y: cy };
}

/** Screen pixels from a topic's edge to the handle centre. Peer handles sit in the gap between peers. */
const HANDLE_GAP = { child: 16, before: 10, after: 10, between: 0, level: 0 } as const;

/** Screen position of a handle, a distance outside the edge that grows with `scale`. */
export function handleCenter(
  box: Box,
  vp: Viewport,
  flow: Flow,
  kind: GrowthKind,
  /** Extra screen pixels for the child handle, to clear a Fold Badge. */
  clearance = 0,
  /** Size of a handle relative to its base size, so handles grow with the map. */
  scale = 1,
  parent?: Box,
) {
  const edge = anchorOf(box, flow, kind, parent);
  const sx = edge.x * vp.k + vp.x;
  const sy = edge.y * vp.k + vp.y;
  const outward =
    flow === 'right'
      ? { child: [1, 0], before: [0, -1], after: [0, 1], between: [0, 0], level: [0, 0] }[kind]
      : { child: [0, 1], before: [-1, 0], after: [1, 0], between: [0, 0], level: [0, 0] }[kind];
  const gap = HANDLE_GAP[kind] * scale + (kind === 'child' ? clearance : 0);
  return { x: sx + (outward[0] ?? 0) * gap, y: sy + (outward[1] ?? 0) * gap };
}

/** The attachment point closest to `point` (layout space), if one is within `maxScreenDistance`. */
export function nearestSlot(
  map: CanopyMap,
  boxes: Iterable<TopicBox>,
  point: { x: number; y: number },
  zoom: number,
  maxScreenDistance = 90,
  kinds: readonly GrowthKind[] = GROWTH_KINDS,
): { subject: TopicId; kind: GrowthKind } | null {
  let best: { subject: TopicId; kind: GrowthKind; distance: number } | null = null;
  const all = [...boxes];
  const byId = new Map(all.map((b) => [b.id, b]));
  for (const box of all) {
    for (const kind of kinds) {
      if (!canGrow(map, box.id, kind)) continue;
      const parent = box.parentId ? byId.get(box.parentId) : undefined;
      if (kind !== 'child' && !box.parentId) continue;
      const anchor = anchorOf(box, map.prefs.flow, kind, parent);
      const distance = Math.hypot(anchor.x - point.x, anchor.y - point.y) * zoom;
      if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
        best = { subject: box.id, kind, distance };
      }
    }
  }
  return best && { subject: best.subject, kind: best.kind };
}
