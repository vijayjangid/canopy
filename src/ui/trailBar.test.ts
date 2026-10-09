import { describe, expect, it } from 'vitest';
import { levelsToShow } from './TrailBar';

const widths = [60, 80, 90, 70, 100, 110]; // 510 in all
const GAP = 20;

describe('levelsToShow', () => {
  it('shows the whole path whenever it fits, however long it is', () => {
    expect(levelsToShow(widths, GAP, 510)).toBeNull();
    expect(levelsToShow(widths, GAP, 900)).toBeNull();
    expect(
      levelsToShow(
        Array.from({ length: 20 }, () => 30),
        GAP,
        600,
      ),
    ).toBeNull();
  });

  it('shows short paths whole, since there is nothing to fold', () => {
    expect(levelsToShow([300, 300], GAP, 100)).toBeNull();
    expect(levelsToShow([300], GAP, 100)).toBeNull();
  });

  it('folds as few levels as it has to, keeping the first and the most recent', () => {
    // First (60) + gap (20) + the last four (90+70+100+110 = 370) = 450 fits in 450.
    expect(levelsToShow(widths, GAP, 450)).toBe(4);
    // One pixel less, and the third-from-last level has to go too.
    expect(levelsToShow(widths, GAP, 449)).toBe(3);
    expect(levelsToShow(widths, GAP, 509)).toBe(4);
  });

  it('always keeps at least the current topic beside the first level and the ellipsis', () => {
    expect(levelsToShow(widths, GAP, 150)).toBe(1);
    expect(levelsToShow(widths, GAP, 10)).toBe(1);
  });

  it('never folds away all of the middle when there is just one level between', () => {
    // Three levels: folding the one in the middle is allowed, nothing more.
    expect(levelsToShow([100, 100, 100], GAP, 250)).toBe(1);
  });
});
