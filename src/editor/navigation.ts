import type { Layout } from '../layout';
import { hasChildren, type CanopyMap, type Flow, type TopicId } from '../model';

export type Arrow = 'up' | 'down' | 'left' | 'right';
export type Move = { type: 'go'; id: TopicId } | { type: 'unfold' } | null;

type Relation = 'parent' | 'child' | 'previous' | 'next';

/** Which way along the tree each arrow leads depends on the Flow. */
function relationFor(arrow: Arrow, flow: Flow): Relation {
  if (flow === 'right') {
    return { right: 'child', left: 'parent', up: 'previous', down: 'next' }[arrow] as Relation;
  }
  return { down: 'child', up: 'parent', left: 'previous', right: 'next' }[arrow] as Relation;
}

/** Where an arrow key takes the focus. Peers on the same level are visited in on-screen order. */
export function navigate(map: CanopyMap, layout: Layout, id: TopicId, arrow: Arrow): Move {
  const box = layout.boxes.get(id);
  if (!box) return null;
  const relation = relationFor(arrow, map.prefs.flow);

  if (relation === 'parent') return box.parentId ? { type: 'go', id: box.parentId } : null;

  if (relation === 'child') {
    const first = layout.order.find((b) => b.parentId === id);
    if (first) return { type: 'go', id: first.id };
    return map.topics[id]?.folded && hasChildren(map, id) ? { type: 'unfold' } : null;
  }

  // Preorder keeps topics of one level in cross-axis order, so neighbours are list neighbours.
  const level = layout.order.filter((b) => b.depth === box.depth);
  const at = level.findIndex((b) => b.id === id);
  const target = level[at + (relation === 'next' ? 1 : -1)];
  return target ? { type: 'go', id: target.id } : null;
}
