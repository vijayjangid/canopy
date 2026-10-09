import { moveBranch } from './ops';
import { ancestorsOf, childrenOf, getTopic, isWithin, subtreeOf } from './tree';
import type { CanopyMap, TopicId } from './types';

/** Where moved branches land: under `subject`, or next to it. */
export interface DropTarget {
  kind: 'child' | 'before' | 'after';
  subject: TopicId;
}

/** The branches among `ids` that are not inside another one, in document order. */
export function movableRoots(map: CanopyMap, ids: readonly TopicId[]): TopicId[] {
  const wanted = new Set(ids.filter((id) => id !== map.coreId && map.topics[id]));
  const order = new Map<TopicId, number>();
  subtreeOf(map, map.coreId).forEach((t, i) => order.set(t.id, i));
  return [...wanted]
    .filter((id) => !ancestorsOf(map, id).some((a) => wanted.has(a.id)))
    .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/** True when the branches can be dropped there: not onto themselves, and never into their own subtree. */
export function canDrop(map: CanopyMap, ids: readonly TopicId[], drop: DropTarget): boolean {
  const roots = movableRoots(map, ids);
  if (roots.length === 0 || !map.topics[drop.subject]) return false;
  if (drop.kind !== 'child' && getTopic(map, drop.subject).parentId === null) return false;
  return roots.every((id) => !isWithin(map, id, drop.subject));
}

/** Moves branches to the drop target, keeping their order. Returns the same map if nothing changes. */
export function moveBranches(map: CanopyMap, ids: readonly TopicId[], drop: DropTarget): CanopyMap {
  if (!canDrop(map, ids, drop)) return map;
  let next = map;
  let reference = drop;
  for (const id of movableRoots(map, ids)) {
    if (reference.kind === 'child') {
      next = moveBranch(next, id, { parentId: reference.subject, index: Number.MAX_SAFE_INTEGER });
      continue;
    }
    const parentId = getTopic(next, reference.subject).parentId;
    if (parentId === null) return map;
    const peers = childrenOf(next, parentId).filter((t) => t.id !== id);
    const at = peers.findIndex((t) => t.id === reference.subject);
    next = moveBranch(next, id, { parentId, index: at + (reference.kind === 'after' ? 1 : 0) });
    // The rest follow it, so the group keeps its order.
    reference = { kind: 'after', subject: id };
  }
  return next;
}
