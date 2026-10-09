import { computeLayout, type Box, type Layout, type LayoutOptions } from '../layout';
import { branchOnly, collapsedAbove, depthOf, type CanopyMap, type TopicId } from '../model';

/** The single dotted stand-in for everything outside the branch being viewed. */
export interface ContextNode {
  box: Box;
  /** Topics it stands for. */
  count: number;
  /** Names of the parents, from the Core down. */
  path: string[];
  /** A short line from the stand-in to the branch's top. */
  link: { x1: number; y1: number; x2: number; y2: number };
}

const CONTEXT = { w: 200, h: 46, gap: 56 };

/**
 * The layout of one branch on its own, with its top where the map's Core would be, plus a
 * stand-in for the rest. Levels keep their real numbers, so type and colour match the full map.
 */
export function branchLayout(
  doc: CanopyMap,
  rootId: TopicId,
  options: LayoutOptions,
): { layout: Layout; context: ContextNode } {
  const offset = depthOf(doc, rootId);
  const raw = computeLayout(branchOnly(doc, rootId), {
    ...options,
    measure: (topic, depth, position) => options.measure(topic, depth + offset, position),
  });
  const boxes = new Map(
    [...raw.boxes].map(([id, b]) => [id, { ...b, depth: b.depth + offset }] as const),
  );
  const order = raw.order.map((b) => boxes.get(b.id) ?? b);
  const root = boxes.get(rootId);
  if (!root) throw new Error('The branch has no top');

  const right = options.flow === 'right';
  const box: Box = right
    ? { x: root.x - CONTEXT.gap - CONTEXT.w, y: root.y + root.h / 2 - CONTEXT.h / 2, ...CONTEXT }
    : { x: root.x + root.w / 2 - CONTEXT.w / 2, y: root.y - CONTEXT.gap - CONTEXT.h, ...CONTEXT };
  const link = right
    ? { x1: box.x + box.w, y1: root.y + root.h / 2, x2: root.x, y2: root.y + root.h / 2 }
    : { x1: root.x + root.w / 2, y1: box.y + box.h, x2: root.x + root.w / 2, y2: root.y };

  const left = Math.min(raw.bounds.x, box.x);
  const top = Math.min(raw.bounds.y, box.y);
  const bounds: Box = {
    x: left,
    y: top,
    w: Math.max(raw.bounds.x + raw.bounds.w, box.x + box.w) - left,
    h: Math.max(raw.bounds.y + raw.bounds.h, box.y + box.h) - top,
  };
  const { count, path } = collapsedAbove(doc, rootId);
  return { layout: { boxes, order, bounds }, context: { box, count, path, link } };
}
