import { describe, expect, it } from 'vitest';
import { fitSide } from './imageImport';

describe('fitSide', () => {
  it('scales the longest side down and keeps the shape', () => {
    expect(fitSide(2560, 1280, 1280)).toEqual({ w: 1280, h: 640 });
    expect(fitSide(1000, 4000, 1000)).toEqual({ w: 250, h: 1000 });
  });

  it('never makes a picture larger, or empty', () => {
    expect(fitSide(300, 200, 1280)).toEqual({ w: 300, h: 200 });
    expect(fitSide(10000, 1, 100)).toEqual({ w: 100, h: 1 });
  });
});
