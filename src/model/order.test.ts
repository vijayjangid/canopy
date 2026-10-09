import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isValidKey, keyBetween, spreadKeys } from './order';

describe('keyBetween', () => {
  it('returns a valid first key', () => {
    expect(isValidKey(keyBetween(null, null))).toBe(true);
  });

  it('orders keys before, after and between', () => {
    const mid = keyBetween(null, null);
    const before = keyBetween(null, mid);
    const after = keyBetween(mid, null);
    expect(before < mid && mid < after).toBe(true);
    const between = keyBetween(mid, after);
    expect(mid < between && between < after).toBe(true);
  });

  it('rejects keys that are out of order', () => {
    expect(() => keyBetween('b', 'a')).toThrow();
    expect(() => keyBetween('a', 'a')).toThrow();
  });

  it('always fits between two neighbours, however many inserts happen', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(), { minLength: 1, maxLength: 200 }), (picks) => {
        const keys: string[] = [];
        for (const pick of picks) {
          const at = keys.length === 0 ? 0 : pick % (keys.length + 1);
          const key = keyBetween(keys[at - 1] ?? null, keys[at] ?? null);
          expect(isValidKey(key)).toBe(true);
          keys.splice(at, 0, key);
        }
        const sorted = [...keys].sort();
        expect(keys).toEqual(sorted);
        expect(new Set(keys).size).toBe(keys.length);
      }),
    );
  });
});

describe('spreadKeys', () => {
  it('returns sorted, unique, valid keys with room to insert between them', () => {
    for (const count of [0, 1, 2, 61, 62, 63, 500, 4000]) {
      const keys = spreadKeys(count);
      expect(keys).toHaveLength(count);
      expect(keys).toEqual([...keys].sort());
      expect(new Set(keys).size).toBe(count);
      expect(keys.every(isValidKey)).toBe(true);
      const [a, b] = keys;
      if (a !== undefined && b !== undefined) {
        const mid = keyBetween(a, b);
        expect(a < mid && mid < b).toBe(true);
      }
    }
  });
});
