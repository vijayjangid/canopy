import { describe, expect, it } from 'vitest';
import { createMap, createSubTopic } from '../model';
import { computeLayout, type Measure } from '../layout';
import { cullLayout } from './cull';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  containsRect,
  fitBounds,
  inflateRect,
  intersectsRect,
  visibleRect,
  zoomAt,
} from './viewport';
import { createViewportStore } from './viewportStore';

describe('viewport math', () => {
  it('keeps the point under the cursor fixed when zooming', () => {
    const vp = { x: 30, y: -20, k: 1 };
    const next = zoomAt(vp, 2, 200, 150);
    const layoutBefore = { x: (200 - vp.x) / vp.k, y: (150 - vp.y) / vp.k };
    const layoutAfter = { x: (200 - next.x) / next.k, y: (150 - next.y) / next.k };
    expect(layoutAfter.x).toBeCloseTo(layoutBefore.x);
    expect(layoutAfter.y).toBeCloseTo(layoutBefore.y);
  });

  it('clamps the zoom range', () => {
    expect(zoomAt({ x: 0, y: 0, k: 1 }, 1000, 0, 0).k).toBe(MAX_ZOOM);
    expect(zoomAt({ x: 0, y: 0, k: 1 }, 0.0001, 0, 0).k).toBe(MIN_ZOOM);
  });

  it('fits bounds in view, centred, without zooming in past 100%', () => {
    const size = { w: 800, h: 600 };
    const big = fitBounds({ x: -500, y: -500, w: 2000, h: 1000 }, size);
    expect(big.k).toBeLessThan(1);
    const rect = visibleRect(big, size);
    expect(containsRect(rect, { x: -500, y: -500, w: 2000, h: 1000 })).toBe(true);
    const small = fitBounds({ x: 0, y: 0, w: 100, h: 50 }, size);
    expect(small.k).toBe(1);
    expect(small.x + 50).toBeCloseTo(400);
    expect(small.y + 25).toBeCloseTo(300);
  });

  it('computes visible rectangles and overlaps', () => {
    expect(visibleRect({ x: 100, y: 50, k: 2 }, { w: 400, h: 200 })).toEqual({
      x: -50,
      y: -25,
      w: 200,
      h: 100,
    });
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(intersectsRect(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(intersectsRect(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(inflateRect(a, 0.5)).toEqual({ x: -5, y: -5, w: 20, h: 20 });
  });
});

describe('viewport store', () => {
  it('pans, zooms around the centre and fits', () => {
    const store = createViewportStore();
    store.getState().setSize({ w: 400, h: 300 });
    store.getState().panBy(10, 20);
    expect(store.getState().vp).toMatchObject({ x: 10, y: 20, k: 1 });
    store.getState().zoom(2);
    expect(store.getState().vp.k).toBe(2);
    store.getState().fit({ x: 0, y: 0, w: 200, h: 100 });
    expect(store.getState().vp.k).toBeLessThanOrEqual(1);
  });
});

describe('cullLayout', () => {
  const measure: Measure = () => ({ w: 100, h: 40 });

  it('keeps only topics and connectors that touch the region', () => {
    let map = createMap({ coreId: 'core' });
    for (let i = 0; i < 30; i++) map = createSubTopic(map, 'core', { id: `c${i}` }).map;
    const layout = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    const all = cullLayout(layout, 'right', inflateRect(layout.bounds, 1));
    expect(all.topics).toHaveLength(31);
    expect(all.links).toHaveLength(30);

    const top = cullLayout(layout, 'right', {
      x: layout.bounds.x - 10,
      y: layout.bounds.y,
      w: layout.bounds.w + 20,
      h: 120,
    });
    expect(top.topics.length).toBeLessThan(31);
    expect(top.topics.length).toBeGreaterThan(0);
    expect(top.links.length).toBeLessThan(30);
  });
});
