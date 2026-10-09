import type { Box, Size } from '../layout';

/** Screen position = layout position * k + (x, y). */
export interface Viewport {
  x: number;
  y: number;
  k: number;
}

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 4;

export const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

export function panBy(vp: Viewport, dx: number, dy: number): Viewport {
  return { ...vp, x: vp.x + dx, y: vp.y + dy };
}

/** Zooms by `factor` while keeping the layout point under (px, py) where it is on screen. */
export function zoomAt(vp: Viewport, factor: number, px: number, py: number): Viewport {
  const k = clampZoom(vp.k * factor);
  const ratio = k / vp.k;
  return { k, x: px - (px - vp.x) * ratio, y: py - (py - vp.y) * ratio };
}

/** Scales and centres `bounds` in the view. Never zooms in past `maxZoom`. */
export function fitBounds(bounds: Box, size: Size, padding = 56, maxZoom = 1): Viewport {
  const availableW = Math.max(1, size.w - padding * 2);
  const availableH = Math.max(1, size.h - padding * 2);
  const k = clampZoom(
    Math.min(maxZoom, availableW / Math.max(1, bounds.w), availableH / Math.max(1, bounds.h)),
  );
  return {
    k,
    x: (size.w - bounds.w * k) / 2 - bounds.x * k,
    y: (size.h - bounds.h * k) / 2 - bounds.y * k,
  };
}

/** The part of layout space currently on screen. */
export function visibleRect(vp: Viewport, size: Size): Box {
  return { x: -vp.x / vp.k, y: -vp.y / vp.k, w: size.w / vp.k, h: size.h / vp.k };
}

export function containsRect(outer: Box, inner: Box): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

export function intersectsRect(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Grows a rectangle by `ratio` of its own size on every side. */
export function inflateRect(rect: Box, ratio: number): Box {
  const dx = rect.w * ratio;
  const dy = rect.h * ratio;
  return { x: rect.x - dx, y: rect.y - dy, w: rect.w + dx * 2, h: rect.h + dy * 2 };
}

/** A screen rectangle a revealed box must stay clear of, such as an open panel. */
export type Obstacle = Box;

/**
 * The smallest pan (in screen pixels) that keeps `box` fully in view and clear of the obstacles,
 * or none when it already is. Only a box that is outside the view, or close enough to touch a
 * panel, moves. Panels are walls: a box they cover is pushed sideways out from under them.
 */
export function revealDelta(
  vp: Viewport,
  size: Size,
  box: Box,
  padding = 48,
  obstacles: readonly Obstacle[] = [],
): { dx: number; dy: number } {
  const axis = (lo: number, extent: number, available: number) => {
    const hi = lo + extent;
    let delta = 0;
    if (hi > available - padding) delta = available - padding - hi;
    if (lo + delta < padding) delta = padding - lo;
    return delta;
  };
  const w = box.w * vp.k;
  const h = box.h * vp.k;
  let dx = axis(box.x * vp.k + vp.x, w, size.w);
  const dy = axis(box.y * vp.k + vp.y, h, size.h);

  for (const o of obstacles) {
    const left = box.x * vp.k + vp.x + dx;
    const top = box.y * vp.k + vp.y + dy;
    const touches =
      left < o.x + o.w + padding &&
      left + w > o.x - padding &&
      top < o.y + o.h + padding &&
      top + h > o.y - padding;
    if (!touches) continue;
    // Move away from the panel, toward the side of the view it is not on.
    if (o.x + o.w / 2 < size.w / 2) dx += o.x + o.w + padding - left;
    else dx -= left + w - (o.x - padding);
  }
  return { dx, dy };
}
