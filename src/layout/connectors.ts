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
const REFERENCE_TIP_GAP = 6;
/** Gap between a reference line's start and the topic it leaves. */
const REFERENCE_START_GAP = 2;
/** How far the line bows from the straight way between two topics, as a share of that distance. */
const REFERENCE_BOW = 0.12;
const REFERENCE_BOW_MIN = 14;
const REFERENCE_BOW_MAX = 70;

type Point = { x: number; y: number };

const centreOf = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

const inside = (b: Box, p: Point, margin: number): boolean =>
  p.x > b.x - margin && p.x < b.x + b.w + margin && p.y > b.y - margin && p.y < b.y + b.h + margin;

const quad = (p0: Point, c: Point, p2: Point, t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y,
  };
};

/** The `t` where the curve, starting inside `box`, crosses its edge, found by halving. */
function leaves(box: Box, margin: number, at: (t: number) => Point): number {
  let lo = 0; // inside the box
  let hi = 0.5; // outside the box
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (inside(box, at(mid), margin)) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * A reference line: the shortest sensible curve between two topics, like a flight path. It is one
 * gentle arc between their middles, trimmed to where it leaves `source` and where it reaches
 * `target`, so it never skims along an edge. It bows to the left of the way it travels, so two
 * topics that point at each other do not draw over one another. Also gives the point halfway along
 * the line, for the delete icon.
 */
export function referenceGeometry(source: Box, target: Box): { d: string; mid: Point } {
  const p0 = centreOf(source);
  const p2 = centreOf(target);
  const dx = p2.x - p0.x;
  const dy = p2.y - p0.y;
  const length = Math.hypot(dx, dy) || 1;
  const bow = Math.min(REFERENCE_BOW_MAX, Math.max(REFERENCE_BOW_MIN, length * REFERENCE_BOW));
  // To the left of the way it travels, on screen where y runs down. A quadratic curve's middle is
  // half as far from the chord as its control point.
  const c: Point = {
    x: (p0.x + p2.x) / 2 + (dy / length) * bow * 2,
    y: (p0.y + p2.y) / 2 - (dx / length) * bow * 2,
  };

  const at = (t: number) => quad(p0, c, p2, t);
  let a = leaves(source, REFERENCE_START_GAP, at);
  let b = 1 - leaves(target, REFERENCE_TIP_GAP, (t) => at(1 - t));
  // Topics that touch leave no room for a line between them, so show a short one between the middles.
  if (a >= b) [a, b] = [0.4, 0.6];

  // The part of the curve from `a` to `b` is itself a quadratic curve.
  const w = { p0: (1 - a) * (1 - b), c: a * (1 - b) + b * (1 - a), p2: a * b };
  const q0 = at(a);
  const q2 = at(b);
  const qc: Point = {
    x: w.p0 * p0.x + w.c * c.x + w.p2 * p2.x,
    y: w.p0 * p0.y + w.c * c.y + w.p2 * p2.y,
  };
  return {
    d: `M${f(q0.x)} ${f(q0.y)}Q${f(qc.x)} ${f(qc.y)} ${f(q2.x)} ${f(q2.y)}`,
    mid: quad(q0, qc, q2, 0.5),
  };
}

export const referencePath = (source: Box, target: Box): string =>
  referenceGeometry(source, target).d;
