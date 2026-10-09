import type { CanopyMap, Flow, Topic, TopicId } from '../model';
import {
  HANG_INDENT,
  SPACING,
  type Attach,
  type Box,
  type Layout,
  type Size,
  type TopicBox,
} from './types';

export type Orientation = 'auto' | 'portrait' | 'landscape';

/** A4 in CSS pixels (96 per inch), portrait. */
export const A4: Size = { w: 794, h: 1123 };

export interface CompactOptions {
  /** The page, in portrait. */
  page?: Size;
  orientation?: Orientation;
  /** Blank space kept on every side of the page. */
  margin?: number;
  /** Extra room a topic's line needs, so its badge fits, along the given Flow. */
  edgeGap?: (topic: Topic, flow: Flow) => number;
}

export interface CompactResult {
  layout: Layout;
  /** The page as chosen: portrait or landscape. */
  page: Size;
  orientation: 'portrait' | 'landscape';
  /** How much the picture is scaled to fit the page. 1 means full size. */
  scale: number;
}

const { level: LEVEL, sibling: SIBLING } = SPACING.compact;
/** Space between separate branches when several are exported together. */
const UNIT_GAP = 24;
/** Space between a topic and the first child that hangs under it. */
const HANG_GAP = 10;
/** Shapes kept per topic. Each is the smallest height for its width. */
const MAX_SHAPES = 20;
/** Widths or heights tried per topic when it chooses how to arrange its children. */
const MAX_BOUNDS = 14;

type Mode = 'leaf' | 'right' | 'down' | 'hang' | 'both' | 'stack' | 'row';

/** One way to arrange a topic and everything under it inside a rectangle. */
interface Shape {
  w: number;
  h: number;
  /** Where the topic itself sits inside the rectangle. */
  rx: number;
  ry: number;
  mode: Mode;
  /** The shape chosen for each child, as an index into that child's shapes. */
  pick: number[];
  /** Space between the topic and its children. */
  gap: number;
  /** Where the children begin: across the Flow for right and both, along it for down. */
  start: number;
  /** For `both`: how many children go on the right side. */
  split: number;
}

interface Node {
  box: TopicBox;
  kids: Node[];
  shapes: Shape[];
  /** The line to the parent carries a label or sticker, so it needs room. */
  edged: boolean;
  /** Stands in for several exported branches that have no parent. Draws nothing. */
  virtual: boolean;
}

interface Placed {
  box: TopicBox;
  x: number;
  y: number;
  attach: Attach | undefined;
}

const MIRROR: Record<Attach, Attach> = {
  right: 'left',
  left: 'right',
  down: 'down',
  hang: 'hangLeft',
  hangLeft: 'hang',
};

/** Up to `MAX_BOUNDS` distinct values at or above `lo`, spread across the range. */
function sample(values: number[], lo: number): number[] {
  const sorted = [...new Set(values.filter((v) => v >= lo - 1e-9))].sort((a, b) => a - b);
  if (sorted.length <= MAX_BOUNDS) return sorted;
  const out: number[] = [];
  for (let i = 0; i < MAX_BOUNDS; i++) {
    out.push(sorted[Math.round((i * (sorted.length - 1)) / (MAX_BOUNDS - 1))] ?? 0);
  }
  return [...new Set(out)];
}

/** Keeps only shapes no other shape beats on both width and height, thinned to a handful. */
function prune(shapes: Shape[]): Shape[] {
  const sorted = [...shapes].sort((a, b) => a.w - b.w || a.h - b.h);
  const best: Shape[] = [];
  for (const s of sorted) {
    const last = best[best.length - 1];
    if (!last || s.h < last.h - 1e-6) best.push(s);
  }
  if (best.length <= MAX_SHAPES) return best;
  const out: Shape[] = [];
  for (let i = 0; i < MAX_SHAPES; i++) {
    const s = best[Math.round((i * (best.length - 1)) / (MAX_SHAPES - 1))];
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/** The shortest shape no wider than `maxW`. Shapes run from narrow and tall to wide and short. */
function shortest(node: Node, maxW: number, needFlush: boolean): number {
  for (let i = node.shapes.length - 1; i >= 0; i--) {
    const s = node.shapes[i];
    if (s && s.w <= maxW + 1e-6 && (!needFlush || s.rx === 0)) return i;
  }
  return -1;
}

/** The narrowest shape no taller than `maxH`. */
function narrowest(node: Node, maxH: number): number {
  for (let i = 0; i < node.shapes.length; i++) {
    const s = node.shapes[i];
    if (s && s.h <= maxH + 1e-6) return i;
  }
  return -1;
}

/** The narrowest a node can be while its own topic touches the left edge, or Infinity. */
function flushWidth(node: Node): number {
  return node.shapes.find((s) => s.rx === 0)?.w ?? Infinity;
}

function solve(node: Node, edgeGap: (topic: Node, flow: Flow) => number): void {
  const { w: nw, h: nh } = node.box;
  const kids = node.kids;
  const k = kids.length;
  const shape = (partial: Partial<Shape> & Pick<Shape, 'w' | 'h' | 'mode'>): Shape => ({
    rx: 0,
    ry: 0,
    pick: [],
    gap: 0,
    start: 0,
    split: 0,
    ...partial,
  });
  if (k === 0) {
    node.shapes = [shape({ w: nw, h: nh, mode: 'leaf' })];
    return;
  }
  const out: Shape[] = [];
  const spread = SIBLING * (k - 1);

  if (node.virtual) {
    const gap = UNIT_GAP * (k - 1);
    const lo = Math.max(...kids.map((c) => c.shapes[0]?.w ?? 0));
    for (const bound of sample(
      kids.flatMap((c) => c.shapes.map((s) => s.w)),
      lo,
    )) {
      const pick = kids.map((c) => shortest(c, bound, false));
      const used = kids.map((c, i) => c.shapes[pick[i] ?? 0]);
      out.push(
        shape({
          w: Math.max(...used.map((s) => s?.w ?? 0)),
          h: used.reduce((sum, s) => sum + (s?.h ?? 0), 0) + gap,
          mode: 'stack',
          pick,
        }),
      );
    }
    const rowLo = Math.max(...kids.map((c) => c.shapes[c.shapes.length - 1]?.h ?? 0));
    for (const bound of sample(
      kids.flatMap((c) => c.shapes.map((s) => s.h)),
      rowLo,
    )) {
      const pick = kids.map((c) => narrowest(c, bound));
      const used = kids.map((c, i) => c.shapes[pick[i] ?? 0]);
      out.push(
        shape({
          w: used.reduce((sum, s) => sum + (s?.w ?? 0), 0) + gap,
          h: Math.max(...used.map((s) => s?.h ?? 0)),
          mode: 'row',
          pick,
        }),
      );
    }
    node.shapes = prune(out);
    return;
  }

  const flush = Math.max(...kids.map(flushWidth));
  if (Number.isFinite(flush)) {
    const bounds = sample(
      kids.flatMap((c) => c.shapes.filter((s) => s.rx === 0).map((s) => s.w)),
      flush,
    );

    // Children in a column to the right of the topic.
    const gap = LEVEL + Math.max(...kids.map((c) => edgeGap(c, 'right')));
    for (const bound of bounds) {
      const pick = kids.map((c) => shortest(c, bound, true));
      let used = 0;
      let first = 0;
      let last = 0;
      let widest = 0;
      kids.forEach((c, i) => {
        const s = c.shapes[pick[i] ?? 0];
        if (!s) return;
        const centre = used + s.ry + c.box.h / 2;
        if (i === 0) first = centre;
        last = centre;
        used += s.h + (i < k - 1 ? SIBLING : 0);
        widest = Math.max(widest, s.w);
      });
      const y = (first + last) / 2 - nh / 2;
      const top = Math.min(0, y);
      out.push(
        shape({
          w: nw + gap + widest,
          h: Math.max(used, y + nh) - top,
          ry: y - top,
          mode: 'right',
          pick,
          gap,
          start: -top,
        }),
      );
    }

    // Children indented under the topic, like an outline. Needs no room for line badges.
    if (!kids.some((c) => c.edged)) {
      for (const bound of bounds) {
        const pick = kids.map((c) => shortest(c, bound, true));
        let height = 0;
        let widest = 0;
        kids.forEach((c, i) => {
          const s = c.shapes[pick[i] ?? 0];
          height += s?.h ?? 0;
          widest = Math.max(widest, s?.w ?? 0);
        });
        out.push(
          shape({
            w: Math.max(nw, HANG_INDENT + widest),
            h: nh + HANG_GAP + height + spread,
            mode: 'hang',
            pick,
            gap: HANG_GAP,
          }),
        );
      }
    }

    // Children split between both sides of the topic.
    if (k >= 2) {
      for (const bound of bounds) {
        const pick = kids.map((c) => shortest(c, bound, true));
        const heights = kids.map((c, i) => c.shapes[pick[i] ?? 0]?.h ?? 0);
        const total = heights.reduce((a, b) => a + b, 0);
        let best = -1;
        let bestHeight = Infinity;
        let before = 0;
        for (let s = 1; s < k; s++) {
          before += heights[s - 1] ?? 0;
          const right = before + SIBLING * (s - 1);
          const left = total - before + SIBLING * (k - s - 1);
          if (Math.max(right, left) < bestHeight) {
            bestHeight = Math.max(right, left);
            best = s;
          }
        }
        const widthOf = (from: number, to: number) =>
          Math.max(...kids.slice(from, to).map((c, i) => c.shapes[pick[from + i] ?? 0]?.w ?? 0));
        const right = widthOf(0, best);
        const left = widthOf(best, k);
        const h = Math.max(bestHeight, nh);
        out.push(
          shape({
            w: left + gap + nw + gap + right,
            h,
            rx: left + gap,
            ry: (h - nh) / 2,
            mode: 'both',
            pick,
            gap,
            split: best,
          }),
        );
      }
    }
  }

  // Children in a row below the topic.
  const gap = LEVEL + Math.max(...kids.map((c) => edgeGap(c, 'down')));
  const rowLo = Math.max(...kids.map((c) => c.shapes[c.shapes.length - 1]?.h ?? 0));
  for (const bound of sample(
    kids.flatMap((c) => c.shapes.map((s) => s.h)),
    rowLo,
  )) {
    const pick = kids.map((c) => narrowest(c, bound));
    let used = 0;
    let first = 0;
    let last = 0;
    let tallest = 0;
    kids.forEach((c, i) => {
      const s = c.shapes[pick[i] ?? 0];
      if (!s) return;
      const centre = used + s.rx + c.box.w / 2;
      if (i === 0) first = centre;
      last = centre;
      used += s.w + (i < k - 1 ? SIBLING : 0);
      tallest = Math.max(tallest, s.h);
    });
    const x = (first + last) / 2 - nw / 2;
    const left = Math.min(0, x);
    out.push(
      shape({
        w: Math.max(used, x + nw) - left,
        h: nh + gap + tallest,
        rx: x - left,
        mode: 'down',
        pick,
        gap,
        start: -left,
      }),
    );
  }
  node.shapes = prune(out);
}

/** Positions a node and everything under it, with its rectangle's corner at 0, 0. */
function place(node: Node, shapeIndex: number): Placed[] {
  const placed: Placed[] = [];
  const jobs: Array<{ node: Node; index: number; x: number; y: number; attach?: Attach }> = [
    { node, index: shapeIndex, x: 0, y: 0 },
  ];
  while (jobs.length > 0) {
    const job = jobs.pop();
    if (!job) break;
    const n = job.node;
    const s = n.shapes[job.index];
    if (!s) continue;
    const bx = job.x + s.rx;
    const by = job.y + s.ry;
    if (!n.virtual) placed.push({ box: n.box, x: bx, y: by, attach: job.attach });
    const sizeOf = (kid: Node, i: number) => kid.shapes[s.pick[i] ?? 0];
    const kids = n.kids;

    if (s.mode === 'right') {
      let y = job.y + s.start;
      kids.forEach((kid, i) => {
        jobs.push({
          node: kid,
          index: s.pick[i] ?? 0,
          x: job.x + n.box.w + s.gap,
          y,
          attach: 'right',
        });
        y += (sizeOf(kid, i)?.h ?? 0) + SIBLING;
      });
    } else if (s.mode === 'hang') {
      let y = job.y + n.box.h + s.gap;
      kids.forEach((kid, i) => {
        jobs.push({
          node: kid,
          index: s.pick[i] ?? 0,
          x: job.x + HANG_INDENT,
          y,
          attach: 'hang',
        });
        y += (sizeOf(kid, i)?.h ?? 0) + SIBLING;
      });
    } else if (s.mode === 'down' || s.mode === 'row') {
      const row = s.mode === 'down';
      let x = job.x + s.start;
      kids.forEach((kid, i) => {
        jobs.push({
          node: kid,
          index: s.pick[i] ?? 0,
          x,
          y: row ? job.y + n.box.h + s.gap : job.y,
          attach: row ? 'down' : undefined,
        });
        x += (sizeOf(kid, i)?.w ?? 0) + (row ? SIBLING : UNIT_GAP);
      });
    } else if (s.mode === 'stack') {
      let y = job.y;
      kids.forEach((kid, i) => {
        jobs.push({ node: kid, index: s.pick[i] ?? 0, x: job.x, y });
        y += (sizeOf(kid, i)?.h ?? 0) + UNIT_GAP;
      });
    } else if (s.mode === 'both') {
      const columnHeight = (list: Node[], from: number) =>
        list.reduce((sum, kid, i) => sum + (sizeOf(kid, from + i)?.h ?? 0), 0) +
        SIBLING * Math.max(0, list.length - 1);
      const rightKids = kids.slice(0, s.split);
      const leftKids = kids.slice(s.split);
      let y = job.y + (s.h - columnHeight(rightKids, 0)) / 2;
      rightKids.forEach((kid, i) => {
        jobs.push({
          node: kid,
          index: s.pick[i] ?? 0,
          x: bx + n.box.w + s.gap,
          y,
          attach: 'right',
        });
        y += (sizeOf(kid, i)?.h ?? 0) + SIBLING;
      });
      // The left side reads upwards, so the order carries on round the topic.
      y = job.y + (s.h - columnHeight(leftKids, s.split)) / 2;
      for (let i = kids.length - 1; i >= s.split; i--) {
        const kid = kids[i];
        if (!kid) continue;
        const index = s.pick[i] ?? 0;
        for (const p of place(kid, index)) {
          placed.push({
            box: p.box,
            x: bx - s.gap - p.x - p.box.w,
            y: y + p.y,
            attach: p.attach ? MIRROR[p.attach] : 'left',
          });
        }
        y += (sizeOf(kid, i)?.h ?? 0) + SIBLING;
      }
    }
  }
  return placed;
}

function boundsOf(boxes: Box[]): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const b of boxes) {
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function layoutOf(boxes: TopicBox[], compact: boolean): Layout {
  return {
    boxes: new Map(boxes.map((b) => [b.id, b])),
    order: boxes,
    bounds: boxes.length > 0 ? boundsOf(boxes) : { x: 0, y: 0, w: 0, h: 0 },
    compact: compact || undefined,
  };
}

interface Fit {
  scale: number;
  page: Size;
  orientation: 'portrait' | 'landscape';
}

/** The page that shows a picture of this size largest, never enlarging it past full size. */
function fitTo(w: number, h: number, page: Size, margin: number, want: Orientation): Fit {
  const options: Fit[] = [];
  if (want !== 'landscape') options.push({ scale: 0, page, orientation: 'portrait' });
  if (want !== 'portrait')
    options.push({ scale: 0, page: { w: page.h, h: page.w }, orientation: 'landscape' });
  for (const o of options) {
    o.scale = Math.min(
      (o.page.w - margin * 2) / Math.max(w, 1),
      (o.page.h - margin * 2) / Math.max(h, 1),
    );
  }
  return options.reduce((a, b) => (b.scale > a.scale ? b : a));
}

const capped = (fit: Fit) => Math.min(fit.scale, 1);

/**
 * Moves topics around so the map fills a page. Each branch picks the way of arranging its
 * children that wastes least room: in a column beside it, in a row under it, indented under it
 * like an outline, and (for the top topic) split between both sides. The arrangement of the
 * whole map that scales up largest on the page wins.
 *
 * `boxes` are the topics to draw in preorder, with their sizes. Anything already readable at
 * full size is left as it is.
 */
export function compactLayout(
  map: CanopyMap,
  boxes: readonly TopicBox[],
  options: CompactOptions = {},
): CompactResult {
  const page = options.page ?? A4;
  const margin = options.margin ?? 28;
  const want = options.orientation ?? 'auto';
  const gapOf = options.edgeGap ?? (() => 0);

  const standard = layoutOf([...boxes], false);
  const standardFit = fitTo(standard.bounds.w, standard.bounds.h, page, margin, want);
  if (boxes.length === 0 || standardFit.scale >= 1) {
    return {
      layout: standard,
      page: standardFit.page,
      orientation: standardFit.orientation,
      scale: Math.min(1, standardFit.scale),
    };
  }

  const nodes = new Map<TopicId, Node>();
  const tops: Node[] = [];
  for (const box of boxes) {
    const edge = map.topics[box.id]?.edge;
    const node: Node = {
      box,
      kids: [],
      shapes: [],
      edged: Boolean(edge?.label || edge?.stickers?.length),
      virtual: false,
    };
    nodes.set(box.id, node);
    const parent = box.parentId ? nodes.get(box.parentId) : undefined;
    if (parent) parent.kids.push(node);
    else tops.push(node);
  }
  const edgeGap = (n: Node, flow: Flow) => {
    const topic = map.topics[n.box.id];
    return topic ? gapOf(topic, flow) : 0;
  };

  // Children follow their parent in preorder, so walking backwards solves children first.
  const list = [...nodes.values()];
  for (let i = list.length - 1; i >= 0; i--) {
    const node = list[i];
    if (node) solve(node, edgeGap);
  }
  let root = tops[0];
  if (tops.length > 1 || !root) {
    root = {
      box: { id: '', parentId: null, depth: 0, position: 1, x: 0, y: 0, w: 0, h: 0 },
      kids: tops,
      shapes: [],
      edged: false,
      virtual: true,
    };
    solve(root, edgeGap);
  }

  let chosen = 0;
  let chosenFit: Fit | undefined;
  root.shapes.forEach((s, i) => {
    const fit = fitTo(s.w, s.h, page, margin, want);
    if (
      !chosenFit ||
      capped(fit) > capped(chosenFit) + 1e-9 ||
      (Math.abs(capped(fit) - capped(chosenFit)) <= 1e-9 && fit.scale > chosenFit.scale)
    ) {
      chosen = i;
      chosenFit = fit;
    }
  });
  if (!chosenFit || capped(standardFit) > capped(chosenFit) + 1e-9) {
    return {
      layout: standard,
      page: standardFit.page,
      orientation: standardFit.orientation,
      scale: standardFit.scale,
    };
  }

  const where = new Map(place(root, chosen).map((p) => [p.box.id, p]));
  const moved = boxes.map((b): TopicBox => {
    const p = where.get(b.id);
    return p ? { ...b, x: p.x, y: p.y, attach: p.attach } : b;
  });
  return {
    layout: layoutOf(moved, true),
    page: chosenFit.page,
    orientation: chosenFit.orientation,
    scale: Math.min(1, chosenFit.scale),
  };
}
