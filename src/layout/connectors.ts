import type { ConnectorStyle, Flow } from '../model';
import { HANG_LINE, type Attach, type Box } from './types';

const f = (n: number) => Math.round(n * 100) / 100;

export interface ConnectorOptions {
  style?: ConnectorStyle;
  /** Pixels of hand-drawn wobble. A fixed seed per connector keeps it from shimmering. */
  wobble?: number;
  seed?: number;
  /** Which side of the parent the child is on, when that is not simply along the Flow. */
  attach?: Attach;
}

/** A number from -1 to 1 that depends only on `seed` and `salt`. */
function noise(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Hash of an ID into a stable seed. */
export function seedOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

/** A line that drops from under the parent along its left (or right) side, then turns into the child. */
function hangPath(parent: Box, child: Box, attach: Attach, style: ConnectorStyle): string {
  const left = attach === 'hangLeft';
  const sx = left ? parent.x + parent.w - HANG_LINE : parent.x + HANG_LINE;
  const sy = parent.y + parent.h;
  const ex = left ? child.x + child.w : child.x;
  const ey = child.y + child.h / 2;
  if (style === 'straight') return `M${f(sx)} ${f(sy)}L${f(ex)} ${f(ey)}`;
  const dir = left ? -1 : 1;
  const r = Math.max(0, Math.min(10, ey - sy, Math.abs(ex - sx)));
  if (style === 'tapered') {
    const t = 1.8;
    return (
      `M${f(sx - t)} ${f(sy)}L${f(sx - t)} ${f(ey - r)}` +
      `Q${f(sx - t)} ${f(ey + t)} ${f(sx + dir * r)} ${f(ey + t)}L${f(ex)} ${f(ey + t * 0.5)}` +
      `L${f(ex)} ${f(ey - t * 0.5)}L${f(sx + dir * r)} ${f(ey - t)}` +
      `Q${f(sx + t)} ${f(ey - t)} ${f(sx + t)} ${f(ey - r)}L${f(sx + t)} ${f(sy)}Z`
    );
  }
  return (
    `M${f(sx)} ${f(sy)}L${f(sx)} ${f(ey - r)}Q${f(sx)} ${f(ey)} ${f(sx + dir * r)} ${f(ey)}` +
    `L${f(ex)} ${f(ey)}`
  );
}

/**
 * SVG path from a parent's edge to a child's edge, leaving along the Flow.
 * Drawn in (along, across) coordinates and mapped back, so both Flows share one shape.
 */
export function connectorPath(
  parent: Box,
  child: Box,
  flow: Flow,
  options: ConnectorOptions | ConnectorStyle = {},
): string {
  const {
    style = 'curved',
    wobble = 0,
    seed = 0,
    attach,
  } = typeof options === 'string' ? { style: options } : options;
  if (attach === 'hang' || attach === 'hangLeft') return hangPath(parent, child, attach, style);
  const horizontal = attach ? attach === 'right' || attach === 'left' : flow === 'right';
  const at = (u: number, v: number) => (horizontal ? `${f(u)} ${f(v)}` : `${f(v)} ${f(u)}`);

  const backwards = attach === 'left';
  const u1 = horizontal ? (backwards ? parent.x : parent.x + parent.w) : parent.y + parent.h;
  const v1 = horizontal ? parent.y + parent.h / 2 : parent.x + parent.w / 2;
  const u2 = horizontal ? (backwards ? child.x + child.w : child.x) : child.y;
  const v2 = horizontal ? child.y + child.h / 2 : child.x + child.w / 2;

  if (style === 'straight') return `M${at(u1, v1)}L${at(u2, v2)}`;

  const mid = (u1 + u2) / 2;
  if (style === 'elbow') {
    const dv = v2 - v1;
    const r = Math.min(10, Math.abs(dv) / 2, Math.abs(u2 - u1) / 2);
    if (r < 1) return `M${at(u1, v1)}L${at(u2, v2)}`;
    const s = Math.sign(dv);
    const d = Math.sign(u2 - u1);
    return (
      `M${at(u1, v1)}L${at(mid - d * r, v1)}Q${at(mid, v1)} ${at(mid, v1 + s * r)}` +
      `L${at(mid, v2 - s * r)}Q${at(mid, v2)} ${at(mid + d * r, v2)}L${at(u2, v2)}`
    );
  }

  const c1v = v1 + noise(seed, 1) * wobble;
  const c2v = v2 + noise(seed, 2) * wobble;
  if (style === 'tapered') {
    const a = 3.6;
    const b = 0.9;
    return (
      `M${at(u1, v1 - a)}C${at(mid, c1v - a)} ${at(mid, c2v - b)} ${at(u2, v2 - b)}` +
      `L${at(u2, v2 + b)}C${at(mid, c2v + b)} ${at(mid, c1v + a)} ${at(u1, v1 + a)}Z`
    );
  }
  return `M${at(u1, v1)}C${at(mid, c1v)} ${at(mid, c2v)} ${at(u2, v2)}`;
}

/** Gap between a reference arrow's tip and the topic it points at, so the tip is never hidden. */
const REFERENCE_TIP_GAP = 4;
/** How far a loop between topics in one row or column swings out past them. */
const REFERENCE_LOOP = 56;

type Point = { x: number; y: number };

const transpose = (b: Box): Box => ({ x: b.y, y: b.x, w: b.h, h: b.w });
const swap = (p: Point): Point => ({ x: p.y, y: p.x });

/**
 * The geometry for a Right flow, where the hierarchy uses the left and right sides of a topic and
 * the reference uses the middle of its free top or bottom side. A Down flow is this, transposed.
 */
function referenceRight(source: Box, target: Box): { p1: Point; c1: Point; c2: Point; p2: Point } {
  const sourceMid = source.x + source.w / 2;
  const targetMid = target.x + target.w / 2;
  const below = target.y >= source.y + source.h;
  const above = target.y + target.h <= source.y;

  if (!below && !above) {
    // Level with each other: leave and arrive by the bottom sides, dipping below both.
    const edge = Math.max(source.y + source.h, target.y + target.h);
    return {
      p1: { x: sourceMid, y: source.y + source.h },
      c1: { x: sourceMid, y: edge + REFERENCE_LOOP },
      c2: { x: targetMid, y: edge + REFERENCE_LOOP },
      p2: { x: targetMid, y: target.y + target.h + REFERENCE_TIP_GAP },
    };
  }

  const s = below ? 1 : -1;
  const p1 = { x: sourceMid, y: below ? source.y + source.h : source.y };
  const p2 = { x: targetMid, y: (below ? target.y : target.y + target.h) - s * REFERENCE_TIP_GAP };
  const k = Math.max(32, Math.abs(p2.y - p1.y) / 2);
  // Stacked in one column: bow out to the right, so the arrow does not run over the topics between.
  const stacked = source.x < target.x + target.w && target.x < source.x + source.w;
  const bow = stacked ? Math.max(source.w, target.w) / 2 + REFERENCE_LOOP / 2 : 0;
  return {
    p1,
    c1: { x: p1.x + bow, y: p1.y + s * k },
    c2: { x: p2.x + bow, y: p2.y - s * k },
    p2,
  };
}

/**
 * A curved, non-hierarchical link from the middle of the free side of `source` to the middle of
 * the free side of `target`, and the point halfway along it. Those are the sides the connectors
 * leave alone: top and bottom in a Right flow, left and right in a Down flow.
 */
export function referenceGeometry(
  source: Box,
  target: Box,
  flow: Flow = 'right',
): { d: string; mid: Point } {
  const down = flow === 'down';
  const g = down
    ? referenceRight(transpose(source), transpose(target))
    : referenceRight(source, target);
  const [p1, c1, c2, p2] = down
    ? [swap(g.p1), swap(g.c1), swap(g.c2), swap(g.p2)]
    : [g.p1, g.c1, g.c2, g.p2];
  return {
    d: `M${f(p1.x)} ${f(p1.y)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`,
    // Middle of a cubic curve.
    mid: { x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8, y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8 },
  };
}

export const referencePath = (source: Box, target: Box, flow: Flow = 'right'): string =>
  referenceGeometry(source, target, flow).d;
