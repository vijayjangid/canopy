import { describe, expect, it } from 'vitest';
import { revealDelta } from './viewport';

const vp = { x: 0, y: 0, k: 1 };
const size = { w: 1000, h: 600 };

describe('revealDelta', () => {
  it('does nothing for a box well inside the view', () => {
    expect(revealDelta(vp, size, { x: 400, y: 250, w: 100, h: 40 })).toEqual({ dx: 0, dy: 0 });
  });

  it('moves a box that is about to leave the view, by just enough', () => {
    expect(revealDelta(vp, size, { x: 920, y: 250, w: 100, h: 40 }, 40)).toEqual({
      dx: -60,
      dy: 0,
    });
    expect(revealDelta(vp, size, { x: 10, y: 250, w: 100, h: 40 }, 40)).toEqual({ dx: 30, dy: 0 });
  });

  it('treats a panel as a wall, and pushes a box out from under it', () => {
    const right = { x: 700, y: 0, w: 300, h: 600 };
    const covered = revealDelta(vp, size, { x: 750, y: 250, w: 100, h: 40 }, 20, [right]);
    // The box ends clear of the panel's edge, with the padding to spare.
    expect(750 + covered.dx + 100).toBeLessThanOrEqual(700 - 20);

    const left = { x: 0, y: 0, w: 300, h: 600 };
    const behind = revealDelta(vp, size, { x: 100, y: 250, w: 100, h: 40 }, 20, [left]);
    expect(100 + behind.dx).toBeGreaterThanOrEqual(300 + 20);
  });

  it('leaves a box alone when it is away from the panel, even level with it', () => {
    const left = { x: 0, y: 0, w: 300, h: 200 };
    expect(revealDelta(vp, size, { x: 100, y: 400, w: 100, h: 40 }, 20, [left])).toEqual({
      dx: 0,
      dy: 0,
    });
    expect(revealDelta(vp, size, { x: 500, y: 100, w: 100, h: 40 }, 20, [left])).toEqual({
      dx: 0,
      dy: 0,
    });
  });
});
