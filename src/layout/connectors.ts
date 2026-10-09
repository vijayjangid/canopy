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
    const t = 1.6;
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
    const a = 3.2;
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
/** How far a loop between topics in one column or row swings out past them. */
const REFERENCE_LOOP = 56;

/**
 * A curved, non-hierarchical link from the middle of one side of `source` to the middle of the
 * facing side of `target`, and the point halfway along it. The sides are picked by which way the
 * target lies, comparing distance with the size of the boxes so wide topics still pick well.
 * Topics lined up across the Flow (stacked in Right, side by side in Down) get a loop out of the
 * side, so the arrow does not run over the topics between them.
 */
export function referenceGeometry(
  source: Box,
  target: Box,
  flow: Flow = 'right',
): { d: string; mid: { x: number; y: number } } {
  const dx = target.x + target.w / 2 - (source.x + source.w / 2);
  const dy = target.y + target.h / 2 - (source.y + source.h / 2);
  const horizontal =
    Math.abs(dx) / ((source.w + target.w) / 2) >= Math.abs(dy) / ((source.h + target.h) / 2);

  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;
  let c1: { x: number; y: number };
  let c2: { x: number; y: number };
  const alignedColumn = source.x < target.x + target.w && target.x < source.x + source.w;
  const alignedRow = source.y < target.y + target.h && target.y < source.y + source.h;
  if (flow === 'right' && !horizontal && alignedColumn) {
    // Stacked topics: loop out of the right side so the arrow does not cross topics in between.
    const edge = Math.max(source.x + source.w, target.x + target.w);
    x1 = source.x + source.w;
    y1 = source.y + source.h / 2;
    x2 = target.x + target.w + REFERENCE_TIP_GAP;
    y2 = target.y + target.h / 2;
    c1 = { x: edge + REFERENCE_LOOP, y: y1 };
    c2 = { x: edge + REFERENCE_LOOP, y: y2 };
  } else if (flow === 'down' && horizontal && alignedRow) {
    // Side by side in one row: loop out of the bottom.
    const edge = Math.max(source.y + source.h, target.y + target.h);
    x1 = source.x + source.w / 2;
    y1 = source.y + source.h;
    x2 = target.x + target.w / 2;
    y2 = target.y + target.h + REFERENCE_TIP_GAP;
    c1 = { x: x1, y: edge + REFERENCE_LOOP };
    c2 = { x: x2, y: edge + REFERENCE_LOOP };
  } else if (horizontal) {
    const s = dx >= 0 ? 1 : -1;
    x1 = s > 0 ? source.x + source.w : source.x;
    y1 = source.y + source.h / 2;
    x2 = (s > 0 ? target.x : target.x + target.w) - s * REFERENCE_TIP_GAP;
    y2 = target.y + target.h / 2;
    const k = Math.max(32, Math.abs(x2 - x1) / 2);
    c1 = { x: x1 + s * k, y: y1 };
    c2 = { x: x2 - s * k, y: y2 };
  } else {
    const s = dy >= 0 ? 1 : -1;
    x1 = source.x + source.w / 2;
    y1 = s > 0 ? source.y + source.h : source.y;
    x2 = target.x + target.w / 2;
    y2 = (s > 0 ? target.y : target.y + target.h) - s * REFERENCE_TIP_GAP;
    const k = Math.max(32, Math.abs(y2 - y1) / 2);
    c1 = { x: x1, y: y1 + s * k };
    c2 = { x: x2, y: y2 - s * k };
  }
  return {
    d: `M${f(x1)} ${f(y1)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(x2)} ${f(y2)}`,
    // Middle of a cubic curve.
    mid: { x: (x1 + 3 * c1.x + 3 * c2.x + x2) / 8, y: (y1 + 3 * c1.y + 3 * c2.y + y2) / 8 },
  };
}

export const referencePath = (source: Box, target: Box, flow: Flow = 'right'): string =>
  referenceGeometry(source, target, flow).d;
