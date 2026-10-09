import type { Obstacle } from './viewport';

/** A panel's rectangle in canvas coordinates, or null when it is not on screen (hidden in Zen, closed). */
function rectOf(host: HTMLElement, selector: string): Obstacle | null {
  const el = host.parentElement?.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  const area = host.getBoundingClientRect();
  return { x: r.left - area.left, y: r.top - area.top, w: r.width, h: r.height };
}

/** The open panels, which a topic must not be left behind. The collapsed tab strip is not one. */
export function panelObstacles(host: HTMLElement | null): Obstacle[] {
  if (!host) return [];
  return [rectOf(host, '.panel-left:not(.panel-strip)'), rectOf(host, '.panel-right')].filter(
    (r): r is Obstacle => r !== null,
  );
}

/** How far the open panels reach into the canvas from each side, for centring things between them. */
export function panelInsets(host: HTMLElement | null): { left: number; right: number } {
  const [left, right] = [
    host ? rectOf(host, '.panel-left:not(.panel-strip)') : null,
    host ? rectOf(host, '.panel-right') : null,
  ];
  const width = host?.getBoundingClientRect().width ?? 0;
  return {
    left: left ? left.x + left.w : 0,
    right: right ? Math.max(0, width - right.x) : 0,
  };
}
