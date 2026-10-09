import { childrenOf, getTopic, type CanopyMap } from '../model';
import { SPACING, type Box, type Layout, type LayoutOptions, type TopicBox } from './types';

/**
 * Tidy tree for variable-size topics. Each branch gets its own band across the Flow, so
 * branches never overlap. Parents sit centred on their children.
 * Right Flow: levels run along x and peers stack along y. Down Flow swaps the axes.
 */
export function computeLayout(map: CanopyMap, opts: LayoutOptions): Layout {
  const { flow, density, measure, edgeGap } = opts;
  const spacing = SPACING[density];
  const horizontal = flow === 'right';

  // Visible topics in preorder, with child lists as indexes.
  const ids: string[] = [];
  const depths: number[] = [];
  const parents: number[] = [];
  const positions: number[] = [];
  const kids: number[][] = [];
  const stack: Array<{ id: string; depth: number; parent: number }> = [
    { id: map.coreId, depth: 0, parent: -1 },
  ];
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) break;
    const at = ids.length;
    ids.push(item.id);
    depths.push(item.depth);
    parents.push(item.parent);
    kids.push([]);
    if (item.parent >= 0) kids[item.parent]?.push(at);
    positions.push(item.parent >= 0 ? (kids[item.parent]?.length ?? 1) : 1);
    const topic = getTopic(map, item.id);
    if (topic.folded) continue;
    const children = childrenOf(map, item.id);
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      if (child) stack.push({ id: child.id, depth: item.depth + 1, parent: at });
    }
  }

  const count = ids.length;
  const along = new Float64Array(count); // extent along the Flow (levels)
  const across = new Float64Array(count); // extent across the Flow (peers)
  const widths = new Float64Array(count);
  const heights = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const topic = getTopic(map, ids[i] ?? '');
    const size = measure(topic, depths[i] ?? 0, positions[i] ?? 1);
    widths[i] = size.w;
    heights[i] = size.h;
    along[i] = horizontal ? size.w : size.h;
    across[i] = horizontal ? size.h : size.w;
  }

  // Band size of each subtree. Children come after parents in preorder, so walk backwards.
  const band = new Float64Array(count);
  const kidsSpan = new Float64Array(count);
  for (let i = count - 1; i >= 0; i--) {
    const list = kids[i] ?? [];
    let total = 0;
    for (const k of list) total += band[k] ?? 0;
    if (list.length > 1) total += spacing.sibling * (list.length - 1);
    kidsSpan[i] = total;
    band[i] = Math.max(across[i] ?? 0, total);
  }

  const bandStart = new Float64Array(count);
  const center = new Float64Array(count);
  const main = new Float64Array(count);
  bandStart[0] = -(band[0] ?? 0) / 2;
  for (let i = 0; i < count; i++) {
    const list = kids[i] ?? [];
    const start = bandStart[i] ?? 0;
    const size = band[i] ?? 0;
    const own = across[i] ?? 0;

    if (list.length === 0) {
      center[i] = start + size / 2;
    } else {
      let cursor = start + (size - (kidsSpan[i] ?? 0)) / 2;
      // Siblings share one column, so the widest label sets the gap for all.
      let level = spacing.level;
      if (edgeGap) {
        for (const k of list) level = Math.max(level, edgeGap(getTopic(map, ids[k] ?? '')));
      }
      for (const k of list) {
        bandStart[k] = cursor;
        cursor += (band[k] ?? 0) + spacing.sibling;
        main[k] = (main[i] ?? 0) + (along[i] ?? 0) + level;
      }
      const first = list[0] ?? 0;
      const last = list[list.length - 1] ?? 0;
      const firstCenter = (bandStart[first] ?? 0) + (band[first] ?? 0) / 2;
      const lastCenter = (bandStart[last] ?? 0) + (band[last] ?? 0) / 2;
      const wanted = (firstCenter + lastCenter) / 2;
      center[i] = Math.min(Math.max(wanted, start + own / 2), start + size - own / 2);
    }
  }

  const boxes = new Map<string, TopicBox>();
  const order: TopicBox[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const w = widths[i] ?? 0;
    const h = heights[i] ?? 0;
    const x = horizontal ? (main[i] ?? 0) : (center[i] ?? 0) - w / 2;
    const y = horizontal ? (center[i] ?? 0) - h / 2 : (main[i] ?? 0);
    const parentIndex = parents[i] ?? -1;
    const box: TopicBox = {
      id: ids[i] ?? '',
      parentId: parentIndex >= 0 ? (ids[parentIndex] ?? null) : null,
      depth: depths[i] ?? 0,
      position: positions[i] ?? 1,
      x,
      y,
      w,
      h,
    };
    boxes.set(box.id, box);
    order.push(box);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }

  const bounds: Box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  return { boxes, order, bounds };
}
