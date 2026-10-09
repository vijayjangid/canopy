import { describe, expect, it } from 'vitest';
import { computeLayout, type LayoutOptions, type Measure } from '../layout';
import { createMap, createSubTopic, type CanopyMap, type Flow } from '../model';
import { blendLayouts, createLayoutAnimator, sameTopics } from './animator';
import {
  anchorOf,
  applyGrowth,
  canGrow,
  handleCenter,
  nearestSlot,
  previewGrowth,
  type GrowthSlot,
} from './growth';
import { createGrowthStore } from './growthStore';

const measure: Measure = () => ({ w: 100, h: 40 });

function sample(flow: Flow = 'right'): CanopyMap {
  let map = createMap({ coreId: 'core' });
  for (const id of ['a', 'b', 'c']) map = createSubTopic(map, 'core', { id, title: id }).map;
  map = createSubTopic(map, 'a', { id: 'a1' }).map;
  return { ...map, prefs: { ...map.prefs, flow } };
}

const optionsFor = (map: CanopyMap): LayoutOptions => ({
  flow: map.prefs.flow,
  density: 'comfortable',
  measure,
});

describe('previewGrowth', () => {
  const slotOf = (subject: string, kind: GrowthSlot['kind']): GrowthSlot => ({
    subject,
    kind,
    id: 'ghost',
  });

  it('adds the ghost and keeps the subject where it is', () => {
    for (const kind of ['child', 'before', 'after'] as const) {
      const map = sample();
      const current = computeLayout(map, optionsFor(map));
      const preview = previewGrowth(map, current, slotOf('b', kind), optionsFor(map));
      expect(preview?.layout.boxes.has('ghost')).toBe(true);
      expect(preview?.layout.boxes.get('b')).toMatchObject({
        x: current.boxes.get('b')?.x,
        y: current.boxes.get('b')?.y,
      });
      expect(preview?.layout.order).toHaveLength(current.order.length + 1);
    }
  });

  it('puts the ghost on the right side of the subject', () => {
    const map = sample();
    const current = computeLayout(map, optionsFor(map));
    const child = previewGrowth(map, current, slotOf('b', 'child'), optionsFor(map));
    const before = previewGrowth(map, current, slotOf('b', 'before'), optionsFor(map));
    const after = previewGrowth(map, current, slotOf('b', 'after'), optionsFor(map));
    const b = current.boxes.get('b');
    expect(child?.ghost.x).toBeGreaterThan((b?.x ?? 0) + (b?.w ?? 0));
    expect(before?.ghost.y).toBeLessThan(b?.y ?? 0);
    expect(after?.ghost.y).toBeGreaterThan(b?.y ?? 0);
  });

  it('never overlaps other topics', () => {
    const map = sample();
    const current = computeLayout(map, optionsFor(map));
    const preview = previewGrowth(map, current, slotOf('a', 'after'), optionsFor(map));
    const boxes = preview?.layout.order ?? [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (!a || !b) continue;
        expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(
          false,
        );
      }
    }
  });

  it('reports how far the held layout sits from the real one', () => {
    const map = sample();
    const current = computeLayout(map, optionsFor(map));
    const slot = slotOf('b', 'after');
    const preview = previewGrowth(map, current, slot, optionsFor(map));
    const real = computeLayout(applyGrowth(map, slot).map, optionsFor(map));
    const heldB = preview?.layout.boxes.get('b');
    const realB = real.boxes.get('b');
    expect((realB?.x ?? 0) + (preview?.shift.x ?? 0)).toBeCloseTo(heldB?.x ?? 0);
    expect((realB?.y ?? 0) + (preview?.shift.y ?? 0)).toBeCloseTo(heldB?.y ?? 0);
  });

  it('gives no preview for impossible slots', () => {
    const map = sample();
    const current = computeLayout(map, optionsFor(map));
    expect(previewGrowth(map, current, slotOf('core', 'after'), optionsFor(map))).toBeNull();
    expect(
      previewGrowth(map, current, { subject: 'a', kind: 'child', id: 'b' }, optionsFor(map)),
    ).toBeNull();
  });
});

describe('slots and handles', () => {
  it('only lets peers grow from non-Core topics', () => {
    const map = sample();
    expect(canGrow(map, 'core', 'child')).toBe(true);
    expect(canGrow(map, 'core', 'before')).toBe(false);
    expect(canGrow(map, 'a', 'after')).toBe(true);
    expect(canGrow(map, 'missing', 'child')).toBe(false);
  });

  it('finds anchors on the right edges for each Flow', () => {
    const box = { x: 0, y: 0, w: 100, h: 40 };
    expect(anchorOf(box, 'right', 'child')).toEqual({ x: 100, y: 20 });
    expect(anchorOf(box, 'right', 'after')).toEqual({ x: 50, y: 40 });
    expect(anchorOf(box, 'down', 'child')).toEqual({ x: 50, y: 40 });
    expect(anchorOf(box, 'down', 'before')).toEqual({ x: 0, y: 20 });
  });

  it('keeps handles a distance away that grows with their scale', () => {
    const box = { x: 0, y: 0, w: 100, h: 40 };
    const a = handleCenter(box, { x: 0, y: 0, k: 1 }, 'right', 'child');
    const b = handleCenter(box, { x: 0, y: 0, k: 2 }, 'right', 'child', 0, 2);
    expect(a.x - 100).toBe(16);
    expect(b.x - 200).toBe(32);
  });

  it('puts a topic in the line above a subject, or above all its peers', () => {
    const map = sample();
    const one = applyGrowth(map, { subject: 'b', kind: 'between', id: 'n' }).map;
    expect(one.topics['b']?.parentId).toBe('n');
    expect(one.topics['c']?.parentId).toBe('core');
    const all = applyGrowth(map, { subject: 'b', kind: 'level', id: 'm' }).map;
    expect(['a', 'b', 'c'].map((id) => all.topics[id]?.parentId)).toEqual(['m', 'm', 'm']);
    expect(() => applyGrowth(map, { subject: 'core', kind: 'between', id: 'x' })).toThrow();
  });

  it('holds the parent still while a level is previewed, and snaps to the middle of a line', () => {
    const map = sample();
    const current = computeLayout(map, optionsFor(map));
    const preview = previewGrowth(
      map,
      current,
      { subject: 'b', kind: 'between', id: 'g' },
      optionsFor(map),
    );
    expect(preview?.layout.boxes.get('core')).toMatchObject({
      x: current.boxes.get('core')?.x,
      y: current.boxes.get('core')?.y,
    });
    expect(preview?.layout.boxes.get('g')?.parentId).toBe('core');
    expect(preview?.layout.boxes.get('b')?.parentId).toBe('g');

    const core = current.boxes.get('core');
    const b = current.boxes.get('b');
    if (!core || !b) throw new Error('missing boxes');
    const middle = anchorOf(b, 'right', 'between', core);
    expect(middle.x).toBe((core.x + core.w + b.x) / 2);
    expect(nearestSlot(map, current.order, middle, 1)).toEqual({ subject: 'b', kind: 'between' });
  });

  it('snaps to the nearest attachment point within reach', () => {
    const map = sample();
    const layout = computeLayout(map, optionsFor(map));
    const c = layout.boxes.get('c');
    const point = { x: (c?.x ?? 0) + (c?.w ?? 0) + 10, y: (c?.y ?? 0) + (c?.h ?? 0) / 2 };
    expect(nearestSlot(map, layout.order, point, 1)).toEqual({ subject: 'c', kind: 'child' });
    expect(nearestSlot(map, layout.order, { x: 5000, y: 5000 }, 1)).toBeNull();
  });
});

describe('growth store', () => {
  it('keeps one pending id for a hover session and marks it as a ghost', () => {
    const store = createGrowthStore();
    store.getState().setSlot('a', 'child');
    const first = store.getState().slot?.id;
    store.getState().setSlot('a', 'after');
    expect(store.getState().slot?.id).toBe(first);
    expect(store.getState().ghostIds.has(first ?? '')).toBe(true);
    store.getState().committed();
    expect(store.getState().slot).toBeNull();
    expect(store.getState().ghostIds.has(first ?? '')).toBe(false);
    store.getState().setSlot('a', 'child');
    expect(store.getState().slot?.id).not.toBe(first);
  });

  it('leaves the hovered topic after a grace period', async () => {
    const store = createGrowthStore();
    store.getState().setHover('a');
    store.getState().leave();
    store.getState().keepAlive();
    await new Promise((r) => setTimeout(r, 260));
    expect(store.getState().hoverId).toBe('a');
    store.getState().leave();
    await new Promise((r) => setTimeout(r, 260));
    expect(store.getState().hoverId).toBeNull();
  });
});

describe('layout animator', () => {
  const layoutOf = (map: CanopyMap) => computeLayout(map, optionsFor(map));

  function manual() {
    let time = 0;
    const frames: Array<() => void> = [];
    const animator = createLayoutAnimator({
      duration: 100,
      now: () => time,
      requestFrame: (cb) => frames.push(cb),
      cancelFrame: () => {},
    });
    const advance = (ms: number) => {
      time += ms;
      const due = frames.splice(0);
      due.forEach((cb) => cb());
    };
    return { animator, advance };
  }

  it('jumps to the first layout and when asked not to animate', () => {
    const { animator } = manual();
    const map = sample();
    const layout = layoutOf(map);
    animator.setTarget(layout, true);
    expect(animator.store.getState().view.layout).toBe(layout);
    const grown = layoutOf(applyGrowth(map, { subject: 'a', kind: 'child', id: 'x' }).map);
    animator.setTarget(grown, false);
    expect(animator.store.getState().view.layout).toBe(grown);
  });

  it('moves new topics out of their parent, then settles on the exact layout', () => {
    const { animator, advance } = manual();
    const map = sample();
    animator.setTarget(layoutOf(map), false);
    const grown = layoutOf(applyGrowth(map, { subject: 'b', kind: 'child', id: 'x' }).map);
    animator.setTarget(grown, true);

    let view = animator.store.getState().view;
    expect(view.layout.boxes.has('x')).toBe(true);
    expect(view.fade.get('x')).toBe(0);

    advance(50);
    view = animator.store.getState().view;
    const parent = grown.boxes.get('b');
    const mid = view.layout.boxes.get('x');
    const end = grown.boxes.get('x');
    expect(mid?.x).toBeGreaterThan(parent?.x ?? 0);
    expect(mid?.x).toBeLessThan(end?.x ?? 0);
    expect(view.fade.get('x')).toBeGreaterThan(0);

    advance(100);
    view = animator.store.getState().view;
    expect(view.layout).toBe(grown);
    expect(view.fade.size).toBe(0);
  });

  it('keeps removed topics around while they fade into their parent', () => {
    const { animator, advance } = manual();
    const map = sample();
    const full = layoutOf(map);
    animator.setTarget(full, false);
    const fewer = { ...map, topics: { ...map.topics } };
    delete fewer.topics['a1'];
    animator.setTarget(layoutOf(fewer), true);
    advance(40);
    const view = animator.store.getState().view;
    expect(view.layout.boxes.has('a1')).toBe(true);
    expect(view.fade.get('a1') ?? 1).toBeLessThan(1);
    advance(100);
    expect(animator.store.getState().view.layout.boxes.has('a1')).toBe(false);
  });

  it('shifts what is shown, to match a pan in the other direction', () => {
    const { animator } = manual();
    const layout = layoutOf(sample());
    animator.setTarget(layout, false);
    const before = layout.boxes.get('a');
    animator.shiftView(10, -5);
    const after = animator.store.getState().view.layout.boxes.get('a');
    expect(after?.x).toBe((before?.x ?? 0) + 10);
    expect(after?.y).toBe((before?.y ?? 0) - 5);
  });

  it('blends sizes and compares topic sets', () => {
    const map = sample();
    const a = layoutOf(map);
    expect(sameTopics(a, a)).toBe(true);
    const view = { layout: a, fade: new Map<string, number>() };
    expect(blendLayouts(view, a, 1).layout).toBe(a);
  });
});
