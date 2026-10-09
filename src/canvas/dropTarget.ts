import type { Layout } from '../layout';
import { canDrop, type CanopyMap, type DropTarget, type TopicId } from '../model';
import { nearestSlot, type GrowthKind } from './growth';

/** Moving topics lands them beside or inside others, never in a line. */
const MOVE_KINDS: readonly GrowthKind[] = ['child', 'before', 'after'];

/** Share of a topic's height (or width) at each end that means "next to it" rather than "inside it". */
const EDGE_BAND = 0.28;
/** How far from an attachment point, in screen pixels, a drop still snaps to it. */
const SNAP_DISTANCE = 56;

/** Where branches would land if released at `point` (layout space), or null if nowhere valid. */
export function findDrop(
  map: CanopyMap,
  layout: Layout,
  roots: readonly TopicId[],
  hidden: ReadonlySet<TopicId>,
  point: { x: number; y: number },
  zoom: number,
): DropTarget | null {
  const horizontal = map.prefs.flow === 'right';
  const candidates = layout.order.filter((b) => !hidden.has(b.id));

  for (const box of candidates) {
    const inside =
      point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h;
    if (!inside) continue;
    const across = horizontal ? (point.y - box.y) / box.h : (point.x - box.x) / box.w;
    const peers = box.parentId !== null;
    const kind =
      peers && across < EDGE_BAND ? 'before' : peers && across > 1 - EDGE_BAND ? 'after' : 'child';
    const drop = { kind, subject: box.id } as const;
    if (canDrop(map, roots, drop)) return drop;
  }

  const near = nearestSlot(map, candidates, point, zoom, SNAP_DISTANCE, MOVE_KINDS);
  const drop = near && { kind: near.kind as DropTarget['kind'], subject: near.subject };
  return drop && canDrop(map, roots, drop) ? drop : null;
}
