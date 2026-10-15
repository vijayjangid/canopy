import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  addTopicTask,
  createMap,
  createSubTopic,
  setFolded,
  type CanopyMap,
  type Density,
} from '../model';
import { connectorPath } from './connectors';
import { imageOffset, imageSize } from './image';
import {
  createTopicMeasurer,
  TASK_ROW_RIGHT_PADDING,
  TASK_TEXT_INSET,
  textLines,
  TOPIC_PADDING,
  wrapLines,
} from './measure';
import { computeLayout, STICKER_CLEARANCE } from './tree-layout';
import { SPACING, type Box, type Measure } from './types';

const measure: Measure = (topic, depth) => ({
  w: 40 + topic.title.length * 7 + (depth === 0 ? 20 : 0),
  h: 24 + (topic.title.length % 3) * 10,
});

function build(parents: number[], titles: string[] = []): CanopyMap {
  let map = createMap({ coreId: 'core' });
  parents.forEach((pick, i) => {
    const ids = Object.keys(map.topics).sort();
    map = createSubTopic(map, ids[pick % ids.length] as string, {
      id: `t${i}`,
      title: titles[i] ?? 'x'.repeat((i * 7) % 23),
    }).map;
  });
  return map;
}

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.w - 1e-6 &&
  b.x < a.x + a.w - 1e-6 &&
  a.y < b.y + b.h - 1e-6 &&
  b.y < a.y + a.h - 1e-6;

describe('computeLayout', () => {
  for (const flow of ['right', 'down'] as const) {
    it(`never overlaps topics (${flow})`, () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat(500), { maxLength: 70 }),
          fc.constantFrom<Density>('compact', 'comfortable', 'airy'),
          (parents, density) => {
            const layout = computeLayout(build(parents), { flow, density, measure });
            for (let i = 0; i < layout.order.length; i++) {
              for (let j = i + 1; j < layout.order.length; j++) {
                const a = layout.order[i];
                const b = layout.order[j];
                if (a && b) expect(intersects(a, b)).toBe(false);
              }
            }
          },
        ),
        { numRuns: 60 },
      );
    });
  }

  it('places children after their parent along the Flow, with the level gap', () => {
    const map = build([0, 0, 1, 1]);
    const gap = SPACING.comfortable.level;
    const right = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    const down = computeLayout(map, { flow: 'down', density: 'comfortable', measure });
    for (const box of right.order) {
      const parent = box.parentId ? right.boxes.get(box.parentId) : undefined;
      if (parent) {
        const parentHasStickers = Boolean(map.topics[parent.id]?.stickers?.length);
        const boxHasStickers = Boolean(map.topics[box.id]?.stickers?.length);
        const stickerGap =
          (parentHasStickers ? STICKER_CLEARANCE : 0) + (boxHasStickers ? STICKER_CLEARANCE : 0);
        expect(box.x).toBeCloseTo(parent.x + parent.w + gap + stickerGap);
      }
    }
    for (const box of down.order) {
      const parent = box.parentId ? down.boxes.get(box.parentId) : undefined;
      if (parent) {
        const parentHasStickers = Boolean(map.topics[parent.id]?.stickers?.length);
        const boxHasStickers = Boolean(map.topics[box.id]?.stickers?.length);
        const stickerGap =
          (parentHasStickers ? STICKER_CLEARANCE : 0) + (boxHasStickers ? STICKER_CLEARANCE : 0);
        expect(box.y).toBeCloseTo(parent.y + parent.h + gap + stickerGap);
      }
    }
  });

  it('reserves space for stickers between peers and along the Flow', () => {
    const peers = build([0, 0]);
    const stickeredPeers: CanopyMap = {
      ...peers,
      topics: {
        ...peers.topics,
        t0: { ...peers.topics.t0!, stickers: [{ id: 'st0', key: 'check' }] },
        t1: { ...peers.topics.t1!, stickers: [{ id: 'st1', key: 'cross' }] },
      },
    };
    const pair = build([0]);
    const stickeredPair: CanopyMap = {
      ...pair,
      topics: {
        ...pair.topics,
        core: { ...pair.topics.core!, stickers: [{ id: 'sc', key: 'warning' }] },
        t0: { ...pair.topics.t0!, stickers: [{ id: 'st0', key: 'question' }] },
      },
    };
    const clearance = STICKER_CLEARANCE;

    for (const flow of ['right', 'down'] as const) {
      const siblings = computeLayout(stickeredPeers, { flow, density: 'comfortable', measure });
      const first = siblings.boxes.get('t0');
      const second = siblings.boxes.get('t1');
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      const peerGap =
        flow === 'right'
          ? (second?.y ?? 0) - ((first?.y ?? 0) + (first?.h ?? 0))
          : (second?.x ?? 0) - ((first?.x ?? 0) + (first?.w ?? 0));
      expect(peerGap).toBeGreaterThanOrEqual(SPACING.comfortable.sibling + clearance * 2);

      const parentChild = computeLayout(stickeredPair, {
        flow,
        density: 'comfortable',
        measure,
      });
      const parent = parentChild.boxes.get('core');
      const child = parentChild.boxes.get('t0');
      expect(parent).toBeDefined();
      expect(child).toBeDefined();
      const levelGap =
        flow === 'right'
          ? (child?.x ?? 0) - ((parent?.x ?? 0) + (parent?.w ?? 0))
          : (child?.y ?? 0) - ((parent?.y ?? 0) + (parent?.h ?? 0));
      expect(levelGap).toBeGreaterThanOrEqual(SPACING.comfortable.level + clearance * 2);
    }
  });

  it('centres a parent between its first and last child', () => {
    const map = build([0, 0, 0], ['A', 'B', 'C']);
    const layout = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    const mid = (id: string) => {
      const b = layout.boxes.get(id);
      return (b?.y ?? 0) + (b?.h ?? 0) / 2;
    };
    expect(mid('core')).toBeCloseTo((mid('t0') + mid('t2')) / 2);
  });

  it('keeps peers in display order across the Flow', () => {
    const map = build([0, 0, 0]);
    const layout = computeLayout(map, { flow: 'right', density: 'compact', measure });
    const ys = ['t0', 't1', 't2'].map((id) => layout.boxes.get(id)?.y ?? 0);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it('leaves out everything below a folded topic', () => {
    const map = setFolded(build([0, 1, 2]), 't0', true);
    const layout = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    expect([...layout.boxes.keys()].sort()).toEqual(['core', 't0']);
  });

  it('handles a lone Core and is deterministic', () => {
    const map = createMap({ coreId: 'core' });
    const opts = { flow: 'down', density: 'airy', measure } as const;
    const a = computeLayout(map, opts);
    expect(a.order).toHaveLength(1);
    expect(computeLayout(map, opts).bounds).toEqual(a.bounds);
  });

  it('measures each task row without reserving space for node-side controls', () => {
    let map = createMap({ coreId: 'core' });
    map = addTopicTask(map, 'core', 'First task');
    const oneTask = createTopicMeasurer((text) => text.length * 7)(map.topics.core!, 0);
    map = addTopicTask(map, 'core', 'A much longer second task that wraps onto another line');
    const twoTasks = createTopicMeasurer((text) => text.length * 7)(map.topics.core!, 0);

    expect(twoTasks.h).toBeGreaterThan(oneTask.h);
    expect(twoTasks.w).toBeGreaterThan(oneTask.w);
  });

  it('leaves extra right padding after task text', () => {
    let map = createSubTopic(createMap({ coreId: 'core' }), 'core', {
      id: 'node',
      title: 'x',
    }).map;
    map = addTopicTask(map, 'node', 'First task');
    const width = createTopicMeasurer((text) => text.length * 7)(map.topics.node!, 1).w;

    expect(width).toBe(
      TASK_TEXT_INSET + 'First task'.length * 7 + TOPIC_PADDING.x + TASK_ROW_RIGHT_PADDING,
    );
  });

  it('reports bounds that contain every topic', () => {
    const layout = computeLayout(build([0, 0, 1, 2, 2, 3]), {
      flow: 'right',
      density: 'comfortable',
      measure,
    });
    for (const b of layout.order) {
      expect(b.x).toBeGreaterThanOrEqual(layout.bounds.x);
      expect(b.y + b.h).toBeLessThanOrEqual(layout.bounds.y + layout.bounds.h + 1e-6);
    }
  });

  it('lays out 5,000 topics quickly', () => {
    // A wide, bushy tree: each topic has up to eight children.
    let map = createMap({ coreId: 'core' });
    const topics = { ...map.topics };
    const ids: string[] = ['core'];
    let orderKey = 0;
    for (let i = 1; i < 5000; i++) {
      const parentId = ids[Math.floor((i - 1) / 8)] as string;
      const id = `n${i}`;
      topics[id] = {
        id,
        parentId,
        orderKey: String(orderKey++).padStart(6, '0') + 'V',
        title: `Topic ${i}`,
        folded: false,
      };
      ids.push(id);
    }
    map = { ...map, topics };
    const start = performance.now();
    const layout = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    const ms = performance.now() - start;
    console.log(`5,000-topic layout: ${ms.toFixed(1)} ms`);
    expect(layout.order).toHaveLength(5000);
    expect(ms).toBeLessThan(500);
  });
});

describe('connectorPath', () => {
  const parent = { x: 0, y: 0, w: 100, h: 40 };
  const child = { x: 150, y: 60, w: 80, h: 30 };

  it('leaves the right edge in a Right Flow and the bottom edge in a Down Flow', () => {
    expect(connectorPath(parent, child, 'right')).toBe('M100 20C125 20 125 75 150 75');
    expect(connectorPath(parent, { ...child, x: 10, y: 100 }, 'down')).toBe(
      'M50 40C50 70 50 70 50 100',
    );
    expect(connectorPath(parent, child, 'right', 'straight')).toBe('M100 20L150 75');
  });
});

describe('text measuring', () => {
  const width = (s: string) => s.length * 10;

  it('wraps on words and splits very long words', () => {
    expect(wrapLines('one two three', 80, width)).toEqual(['one two', 'three']);
    expect(wrapLines('abcdefghij', 40, width)).toEqual(['abcd', 'efgh', 'ij']);
    expect(wrapLines('   ', 80, width)).toEqual(['']);
  });

  it('measures a topic once per object and level', () => {
    let calls = 0;
    const measurer = createTopicMeasurer((s) => {
      calls++;
      return s.length * 8;
    });
    const topic = { id: 'a', parentId: 'core', orderKey: 'V', title: 'Hello world', folded: false };
    const first = measurer(topic, 1);
    const used = calls;
    expect(measurer(topic, 1)).toBe(first);
    expect(calls).toBe(used);
    expect(measurer({ ...topic }, 1)).toEqual(first);
    expect(calls).toBeGreaterThan(used);
    measurer.invalidate();
    measurer(topic, 1);
    expect(calls).toBeGreaterThan(used * 2 - 1);
  });

  it('gives empty titles a placeholder size', () => {
    const measurer = createTopicMeasurer((s) => s.length * 8);
    const size = measurer(
      { id: 'a', parentId: 'core', orderKey: 'V', title: '', folded: false },
      2,
    );
    expect(size.w).toBeGreaterThanOrEqual(72);
  });
});

describe('line breaks in titles', () => {
  it('start a new line, and each paragraph wraps on its own', () => {
    const width = (s: string) => s.length * 8;
    expect(textLines('Design\nReview', 1, width)).toEqual(['Design', 'Review']);
    expect(textLines('One\n\nThree', 1, width)).toEqual(['One', '', 'Three']);
  });
});

describe('pictures on topics', () => {
  const topic = (image?: { src: string; w: number; h: number }) =>
    ({ id: 't', parentId: 'c', orderKey: 'V', title: 'Hello', folded: false, image }) as const;
  const measure = createTopicMeasurer((s) => s.length * 8);

  it('keeps a small picture at its own size and grows the topic to hold it', () => {
    const plain = measure(topic(), 1);
    const withImage = measure(topic({ src: 'x', w: 120, h: 80 }), 1);
    expect(withImage.h).toBe(plain.h + 8 + 80);
    expect(withImage.w).toBeGreaterThanOrEqual(120 + 16);
  });

  it('scales a big picture down to the maximum, keeping its shape', () => {
    expect(imageSize({ w: 2000, h: 500 })).toEqual({ w: 280, h: 70 });
    expect(imageSize({ w: 500, h: 2000 })).toEqual({ w: 50, h: 200 });
    expect(imageSize({ w: 100, h: 100 })).toEqual({ w: 100, h: 100 });
    const huge = measure(topic({ src: 'x', w: 4000, h: 3000 }), 1);
    expect(huge.w).toBeLessThanOrEqual(280 + 16 + 40);
    expect(huge.h).toBeLessThanOrEqual(200 + 8 + 60);
  });

  it('adds no space without a picture', () => {
    expect(imageOffset(topic())).toBe(0);
    expect(imageSize(undefined)).toBeNull();
  });
});
