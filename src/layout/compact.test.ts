import { describe, expect, it } from 'vitest';
import { createMap, createSubTopic, type CanopyMap } from '../model';
import { A4, compactLayout } from './compact';
import { connectorPath } from './connectors';
import { computeLayout } from './tree-layout';
import type { Box, Measure, TopicBox } from './types';

const measure: Measure = (topic, depth) => ({
  w: 60 + topic.title.length * 7 + (depth === 0 ? 20 : 0),
  h: 30 + (topic.title.length % 3) * 8,
});

/** Builds a tree where each entry is [parent index into the ids so far, title]. */
function build(parents: number[], titles: string[] = []): CanopyMap {
  let map = createMap({ coreId: 'core' });
  const ids = ['core'];
  parents.forEach((pick, i) => {
    const id = `t${i}`;
    map = createSubTopic(map, ids[pick % ids.length] as string, {
      id,
      title: titles[i] ?? 'x'.repeat(4 + ((i * 7) % 19)),
    }).map;
    ids.push(id);
  });
  return map;
}

const standard = (map: CanopyMap, flow: 'right' | 'down' = 'right') =>
  computeLayout(map, { flow, density: 'comfortable', measure });

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w - 1e-6 &&
  b.x < a.x + a.w - 1e-6 &&
  a.y < b.y + b.h - 1e-6 &&
  b.y < a.y + a.h - 1e-6;

function expectNoOverlap(boxes: TopicBox[]) {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a && b && overlaps(a, b)) throw new Error(`${a.id} overlaps ${b.id}`);
    }
  }
}

const scaleOf = (box: Box, page = A4, margin = 28) =>
  Math.min((page.w - margin * 2) / box.w, (page.h - margin * 2) / box.h);

/** A wide, bushy map: many branches, each with a few children and a couple of levels. */
const bushy = () => {
  const parents: number[] = [];
  for (let i = 0; i < 8; i++) parents.push(0);
  for (let i = 0; i < 40; i++) parents.push(1 + (i % 8));
  for (let i = 0; i < 40; i++) parents.push(9 + (i % 40));
  return build(parents);
};

describe('compactLayout', () => {
  it('leaves a map that already fits at full size as it is', () => {
    const map = build([0, 0, 1]);
    const base = standard(map);
    const result = compactLayout(map, base.order);
    expect(result.layout.compact).toBeUndefined();
    expect(result.scale).toBe(1);
    expect(result.layout.order).toEqual(base.order);
  });

  it('fits a large map larger on the page than the tidy tree does, without overlaps', () => {
    const map = bushy();
    const base = standard(map);
    const result = compactLayout(map, base.order);
    expect(result.layout.compact).toBe(true);
    expectNoOverlap(result.layout.order);
    const before = Math.max(scaleOf(base.bounds, A4), scaleOf(base.bounds, { w: A4.h, h: A4.w }));
    expect(result.scale).toBeGreaterThan(before * 1.2);
    expect(result.layout.bounds.w).toBeLessThanOrEqual(
      (result.orientation === 'portrait' ? A4.w : A4.h) / result.scale,
    );
  });

  it('keeps every topic, its level and its place among peers', () => {
    const map = bushy();
    const base = standard(map);
    const result = compactLayout(map, base.order);
    expect(result.layout.order.map((b) => b.id)).toEqual(base.order.map((b) => b.id));
    for (const b of base.order) {
      const moved = result.layout.boxes.get(b.id);
      expect(moved).toMatchObject({ w: b.w, h: b.h, depth: b.depth, position: b.position });
    }
  });

  it('honours the page orientation', () => {
    const map = bushy();
    const base = standard(map);
    expect(compactLayout(map, base.order, { orientation: 'portrait' }).orientation).toBe(
      'portrait',
    );
    const wide = compactLayout(map, base.order, { orientation: 'landscape' });
    expect(wide.orientation).toBe('landscape');
    expect(wide.page).toEqual({ w: A4.h, h: A4.w });
  });

  it('gives every child a line that starts at its parent', () => {
    const map = bushy();
    const result = compactLayout(map, standard(map).order);
    for (const b of result.layout.order) {
      if (!b.parentId) continue;
      expect(b.attach).toBeDefined();
      const parent = result.layout.boxes.get(b.parentId);
      expect(parent).toBeDefined();
    }
  });

  it('packs several chosen branches together without overlap', () => {
    const map = bushy();
    const base = standard(map);
    const picked = base.order.filter((b) => b.depth >= 1 && b.id !== 't0').slice(0, 60);
    const roots = new Set(picked.filter((b) => !picked.some((p) => p.id === b.parentId)));
    expect(roots.size).toBeGreaterThan(1);
    const result = compactLayout(map, picked);
    expectNoOverlap(result.layout.order);
    expect(result.layout.order).toHaveLength(picked.length);
  });

  it('leaves room for a label on a line', () => {
    let map = bushy();
    map = {
      ...map,
      topics: { ...map.topics, t3: { ...map.topics['t3']!, edge: { label: 'depends on' } } },
    };
    const result = compactLayout(map, standard(map).order, {
      edgeGap: (topic) => (topic.edge?.label ? 120 : 0),
    });
    expectNoOverlap(result.layout.order);
    const box = result.layout.boxes.get('t3');
    expect(box?.attach).not.toBe('hang');
  });
});

describe('connectors for moved topics', () => {
  const parent: Box = { x: 100, y: 100, w: 80, h: 30 };

  it('leaves a parent on its left side for a topic placed to the left', () => {
    const child: Box = { x: 0, y: 200, w: 60, h: 30 };
    const d = connectorPath(parent, child, 'right', { attach: 'left' });
    expect(d.startsWith('M100 115')).toBe(true);
    expect(d.endsWith('60 215')).toBe(true);
  });

  it('drops from under the parent and turns into a hanging child', () => {
    const child: Box = { x: 128, y: 140, w: 60, h: 30 };
    const d = connectorPath(parent, child, 'right', { attach: 'hang', style: 'elbow' });
    expect(d.startsWith('M114 130L114')).toBe(true);
    expect(d.endsWith('L128 155')).toBe(true);
  });

  it('is unchanged when no side is given', () => {
    const child: Box = { x: 200, y: 160, w: 60, h: 30 };
    expect(connectorPath(parent, child, 'right')).toBe(
      connectorPath(parent, child, 'right', { attach: 'right' }),
    );
  });
});
