import { describe, expect, it } from 'vitest';
import { referenceGeometry } from './connectors';

const box = (x: number, y: number, w = 100, h = 40) => ({ x, y, w, h });

/** The numbers in a path: start, control and end of its one curve. */
function points(d: string): { start: number[]; control: number[]; end: number[] } {
  const n = d.match(/-?[\d.]+/g)?.map(Number) ?? [];
  return { start: n.slice(0, 2), control: n.slice(2, 4), end: n.slice(4, 6) };
}

const onEdge = (b: { x: number; y: number; w: number; h: number }, p: number[], gap: number) => {
  const [x = 0, y = 0] = p;
  const left = Math.abs(x - (b.x - gap)) < 0.6;
  const right = Math.abs(x - (b.x + b.w + gap)) < 0.6;
  const top = Math.abs(y - (b.y - gap)) < 0.6;
  const bottom = Math.abs(y - (b.y + b.h + gap)) < 0.6;
  return left || right || top || bottom;
};

describe('referenceGeometry', () => {
  it('is one single curve, whatever the topics', () => {
    for (const [a, b] of [
      [box(0, 0), box(300, 200)],
      [box(0, 200), box(300, 0)],
      [box(0, 0), box(300, 0)],
      [box(0, 100), box(0, 0)],
      [box(300, 0), box(0, 200)],
    ] as const) {
      const { d } = referenceGeometry(a, b);
      expect(d.match(/[MQCLSTAZ]/gi)).toEqual(['M', 'Q']);
    }
  });

  it('leaves one topic and reaches the other at their edges, never inside them', () => {
    const source = box(0, 0);
    const target = box(300, 200);
    const { start, end } = points(referenceGeometry(source, target).d);
    expect(onEdge(source, start, 2)).toBe(true);
    expect(onEdge(target, end, 6)).toBe(true);
  });

  it('heads from one topic toward the other, so the line is direct', () => {
    const across = points(referenceGeometry(box(0, 0), box(400, 0)).d);
    expect(across.start[0]).toBeGreaterThan(50);
    expect(across.end[0]).toBeLessThan(450);
    const down = points(referenceGeometry(box(0, 0), box(0, 300)).d);
    expect(down.start[1]).toBeGreaterThan(20);
    expect(down.end[1]).toBeLessThan(320);
  });

  it('is the shortest curve: it bows only a little, and never wanders', () => {
    for (const gap of [150, 400, 900, 3000]) {
      const { mid } = referenceGeometry(box(0, 0), box(gap, 0));
      // Never further from the straight line than a modest bow.
      expect(Math.abs(mid.y - 20)).toBeLessThanOrEqual(70);
      expect(Math.abs(mid.y - 20)).toBeGreaterThanOrEqual(10);
    }
  });

  it('bows to the left of its way, so two references between a pair do not overlap', () => {
    const there = referenceGeometry(box(0, 0), box(400, 0));
    const back = referenceGeometry(box(400, 0), box(0, 0));
    expect(there.mid.y).toBeLessThan(20);
    expect(back.mid.y).toBeGreaterThan(20);
  });

  it('ends going into the target, not along its edge', () => {
    const target = box(300, 200);
    const { control, end } = points(referenceGeometry(box(0, 0), target).d);
    const [cx = 0, cy = 0] = control;
    const [ex = 0, ey = 0] = end;
    const heading = Math.atan2(ey - cy, ex - cx);
    const toTarget = Math.atan2(target.y + target.h / 2 - ey, target.x + target.w / 2 - ex);
    let diff = Math.abs(heading - toTarget);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    expect(diff).toBeLessThan(Math.PI / 3);
  });

  it('puts the midpoint between the two ends', () => {
    const { d, mid } = referenceGeometry(box(0, 0), box(300, 200));
    const { start, end } = points(d);
    expect(mid.x).toBeGreaterThan(Math.min(start[0] ?? 0, end[0] ?? 0) - 40);
    expect(mid.x).toBeLessThan(Math.max(start[0] ?? 0, end[0] ?? 0) + 40);
  });

  it('copes with topics that touch, and with topics on top of each other', () => {
    for (const [a, b] of [
      [box(0, 0), box(100, 0)],
      [box(0, 0), box(0, 0)],
    ] as const) {
      const { d, mid } = referenceGeometry(a, b);
      expect(d.startsWith('M')).toBe(true);
      expect(d).not.toMatch(/NaN/);
      expect(Number.isFinite(mid.x + mid.y)).toBe(true);
    }
  });

  it('is cheap: thousands of lines take a fraction of a second', () => {
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) referenceGeometry(box(i, 0), box(i + 300, i % 200));
    expect(performance.now() - t0).toBeLessThan(500);
  });
});
