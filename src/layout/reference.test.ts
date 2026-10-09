import { describe, expect, it } from 'vitest';
import { referenceGeometry } from './connectors';

const box = (x: number, y: number, w = 100, h = 40) => ({ x, y, w, h });

describe('referenceGeometry', () => {
  it('uses the free top and bottom sides in a Right flow, never the sides the connectors use', () => {
    const below = referenceGeometry(box(0, 0), box(300, 200));
    expect(below.d.startsWith('M50 40C')).toBe(true);
    expect(below.d.endsWith(' 350 196')).toBe(true);
    const above = referenceGeometry(box(0, 200), box(300, 0));
    expect(above.d.startsWith('M50 200C')).toBe(true);
    expect(above.d.endsWith(' 350 44')).toBe(true);
  });

  it('dips below topics level with each other, arriving at the bottom middle', () => {
    const { d, mid } = referenceGeometry(box(0, 0), box(300, 0));
    expect(d.startsWith('M50 40C')).toBe(true);
    expect(d.endsWith(' 350 44')).toBe(true);
    expect(mid.y).toBeGreaterThan(40);
  });

  it('bows out to the right for topics stacked in one column, to avoid the ones between', () => {
    const { d, mid } = referenceGeometry(box(0, 100), box(0, 0));
    expect(d.startsWith('M50 100C')).toBe(true);
    expect(d.endsWith(' 50 44')).toBe(true);
    expect(mid.x).toBeGreaterThan(100);
  });

  it('uses the free left and right sides in a Down flow', () => {
    const right = referenceGeometry(box(0, 0), box(300, 200), 'down');
    expect(right.d.startsWith('M100 20C')).toBe(true);
    expect(right.d.endsWith(' 296 220')).toBe(true);
    const left = referenceGeometry(box(300, 0), box(0, 200), 'down');
    expect(left.d.startsWith('M300 20C')).toBe(true);
    expect(left.d.endsWith(' 104 220')).toBe(true);
  });

  it('loops out of the right side for topics in one row of a Down flow', () => {
    const { d } = referenceGeometry(box(0, 0), box(0, 200), 'down');
    expect(d.startsWith('M100 20C')).toBe(true);
  });

  it('puts the midpoint between the two ends', () => {
    const { mid } = referenceGeometry(box(0, 0), box(300, 200));
    expect(mid.x).toBeGreaterThan(50);
    expect(mid.x).toBeLessThan(350);
    expect(mid.y).toBeGreaterThan(40);
    expect(mid.y).toBeLessThan(196);
  });
});
