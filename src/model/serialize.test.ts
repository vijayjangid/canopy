import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createMap, createPeer, createSubTopic, setFolded } from './ops';
import { parseFile, parseJson, stringifyFile, toFile } from './serialize';
import { childrenOf } from './tree';
import type { CanopyMap } from './types';
import { validateMap } from './validate';

function sample(): CanopyMap {
  let map = createMap({ coreId: 'core', title: 'Plan', now: '2026-01-01T00:00:00.000Z' });
  map = createSubTopic(map, 'core', { id: 'a', title: 'A' }).map;
  map = createSubTopic(map, 'core', { id: 'b', title: 'B' }).map;
  map = createPeer(map, 'a', 'after', { id: 'mid', title: 'Between' }).map;
  map = createSubTopic(map, 'a', { id: 'a1', title: 'A1' }).map;
  return setFolded(map, 'a', true);
}

/** Ids in display order, which is what a round trip has to preserve. */
function shape(map: CanopyMap, id = map.coreId): unknown {
  const topic = map.topics[id];
  return {
    title: topic?.title,
    folded: topic?.folded,
    children: childrenOf(map, id).map((t) => shape(map, t.id)),
  };
}

describe('file format', () => {
  it('nests children in display order', () => {
    const file = toFile(sample());
    expect(file.schema).toBe('canopy/1');
    expect(file.core.children.map((c) => c.title)).toEqual(['A', 'Between', 'B']);
    expect(file.core.children[0]?.folded).toBe(true);
    expect(file.core.children[1]?.folded).toBeUndefined();
  });

  it('round-trips through JSON text', () => {
    const map = sample();
    const result = parseJson(stringifyFile(map));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateMap(result.map)).toEqual([]);
    expect(shape(result.map)).toEqual(shape(map));
    expect(result.map.meta).toEqual(map.meta);
    expect(result.map.prefs).toEqual(map.prefs);
    expect(toFile(result.map)).toEqual(toFile(map));
  });

  it('round-trips arbitrary trees', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.nat(200), fc.string()), { maxLength: 60 }), (items) => {
        let map = createMap({ coreId: 'core' });
        for (const [parentPick, title] of items) {
          const ids = Object.keys(map.topics).sort();
          map = createSubTopic(map, ids[parentPick % ids.length] as string, { title }).map;
        }
        const result = parseJson(stringifyFile(map));
        expect(result.ok).toBe(true);
        if (result.ok) expect(shape(result.map)).toEqual(shape(map));
      }),
    );
  });

  it('handles very deep and very wide trees without recursion limits', () => {
    let map = createMap({ coreId: 'core' });
    let parent = 'core';
    for (let i = 0; i < 3000; i++) {
      map = createSubTopic(map, parent, { id: `d${i}` }).map;
      parent = `d${i}`;
    }
    for (let i = 0; i < 1500; i++) map = createSubTopic(map, 'core', { id: `w${i}` }).map;
    const result = parseJson(stringifyFile(map));
    expect(result.ok).toBe(true);
    if (result.ok) expect(validateMap(result.map)).toEqual([]);
  });
});

describe('parseFile errors', () => {
  const messages = (raw: unknown) => {
    const result = parseFile(raw);
    return result.ok ? [] : result.errors;
  };

  it('explains invalid JSON and wrong shapes', () => {
    const bad = parseJson('{nope');
    expect(bad.ok).toBe(false);
    expect(messages([])[0]).toMatch(/JSON object/);
    expect(messages({ schema: 'other/9' })[0]).toMatch(/Unsupported file format/);
  });

  it('points at the offending field', () => {
    const errors = messages({
      schema: 'canopy/1',
      core: { id: 'c', title: 'Core', children: [{ id: 'x', title: 5, children: [] }] },
    });
    expect(errors).toContain('core.children[0].title must be a string');
  });

  it('rejects duplicate ids and a missing core', () => {
    const dup = messages({
      schema: 'canopy/1',
      core: { id: 'c', title: 'C', children: [{ id: 'c', title: 'D', children: [] }] },
    });
    expect(dup[0]).toMatch(/more than once/);
    expect(messages({ schema: 'canopy/1' })).toContain('core must be an object');
  });

  it('fills in defaults for optional parts', () => {
    const result = parseFile({ schema: 'canopy/1', core: { id: 'c', title: 'C' } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.map.prefs.flow).toBe('right');
      expect(result.map.meta.title).toBe('Untitled map');
    }
  });

  it('rejects bad preferences', () => {
    const errors = messages({
      schema: 'canopy/1',
      prefs: { flow: 'sideways' },
      core: { id: 'c', title: 'C' },
    });
    expect(errors[0]).toMatch(/prefs\.flow/);
  });
});
