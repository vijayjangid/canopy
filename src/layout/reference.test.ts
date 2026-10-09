import { describe, expect, it } from 'vitest';
import { referenceGeometry } from './connectors';

const box = (x: number, y: number, w = 100, h = 40) => ({ x, y, w, h });

describe('referenceGeometry', () => {
  it('leaves a side facing the target and ends at the middle of the facing side', () => {
    const { d } = referenceGeometry(box(0, 0), box(300, 10));
    expect(d.startsWith('M100 20C')).toBe(true);
    expect(d.endsWith(' 296 30')).toBe(true);
  });

  it('goes top to bottom when the target lies mostly above or below', () => {
    const below = referenceGeometry(box(0, 0), box(150, 200));
    expect(below.d.startsWith('M50 40C')).toBe(true);
    expect(below.d.endsWith(' 200 196')).toBe(true);
    const above = referenceGeometry(box(0, 200), box(150, 0));
    expect(above.d.startsWith('M50 200C')).toBe(true);
    expect(above.d.endsWith(' 200 44')).toBe(true);
  });

  it('loops out of the side for topics stacked in one column, to avoid crossing the ones between', () => {
    const { d, mid } = referenceGeometry(box(0, 100), box(0, 0));
    expect(d.startsWith('M100 120C')).toBe(true);
    expect(d.endsWith(' 104 20')).toBe(true);
    expect(mid.x).toBeGreaterThan(100);
  });

  it('loops out of the bottom for topics side by side in a Down flow', () => {
    const { d } = referenceGeometry(box(0, 0), box(300, 0), 'down');
    expect(d.startsWith('M50 40C')).toBe(true);
    expect(d.endsWith(' 350 44')).toBe(true);
  });

  it('keeps a direct line between topics in one row in a Right flow', () => {
    const { d } = referenceGeometry(box(0, 0), box(300, 0));
    expect(d.startsWith('M100 20C')).toBe(true);
    expect(d.endsWith(' 296 20')).toBe(true);
  });

  it('puts the midpoint between the two ends', () => {
    const { mid } = referenceGeometry(box(0, 0), box(300, 100));
    expect(mid.x).toBeGreaterThan(100);
    expect(mid.x).toBeLessThan(296);
    expect(mid.y).toBeGreaterThan(20);
    expect(mid.y).toBeLessThan(120);
  });
});
