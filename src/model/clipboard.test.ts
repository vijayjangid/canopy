import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  BRANCHES_MIME,
  branchesFromJson,
  branchesFromOutline,
  branchesToJson,
  branchesToMarkdown,
  copyBranches,
  countBranches,
  pasteBranches,
} from './clipboard';
import { canDrop, moveBranches, movableRoots } from './drop';
import { createMap, createSubTopic, setFolded } from './ops';
import { childrenOf, descendantCounts } from './tree';
import type { CanopyMap } from './types';
import { validateMap } from './validate';

/** Core with A (A1, A2 (A2a)), B, C. */
function sample(): CanopyMap {
  let map = createMap({ coreId: 'core' });
  const add = (parent: string, id: string) => {
    map = createSubTopic(map, parent, { id, title: id.toUpperCase() }).map;
  };
  add('core', 'a');
  add('core', 'b');
  add('core', 'c');
  add('a', 'a1');
  add('a', 'a2');
  add('a2', 'a2a');
  return map;
}

const titles = (map: CanopyMap, parent: string) => childrenOf(map, parent).map((t) => t.title);

describe('copying branches', () => {
  it('copies nested branches in document order, once each', () => {
    const map = sample();
    const branches = copyBranches(map, ['c', 'a', 'a2']);
    expect(branches.map((b) => b.title)).toEqual(['A', 'C']);
    expect(branches[0]?.children.map((b) => b.title)).toEqual(['A1', 'A2']);
    expect(branches[0]?.children[1]?.children[0]?.title).toBe('A2A');
    expect(countBranches(branches)).toBe(5);
  });

  it('remembers folded branches', () => {
    const branches = copyBranches(setFolded(sample(), 'a', true), ['a']);
    expect(branches[0]?.folded).toBe(true);
  });

  it('round-trips through JSON and rejects other text', () => {
    const branches = copyBranches(sample(), ['a', 'b']);
    expect(branchesFromJson(branchesToJson(branches))).toEqual(branches);
    expect(branchesFromJson('hello')).toBeNull();
    expect(branchesFromJson('{"format":"other","branches":[]}')).toBeNull();
    expect(
      branchesFromJson('{"format":"canopy/branches/1","branches":[{"title":5,"children":[]}]}'),
    ).toBeNull();
    expect(BRANCHES_MIME).toContain('canopy');
  });

  it('writes an indented Markdown list', () => {
    const md = branchesToMarkdown(copyBranches(sample(), ['a', 'b']));
    expect(md).toBe('- A\n  - A1\n  - A2\n    - A2A\n- B');
  });
});

describe('reading outlines', () => {
  it('understands bullets, numbers and plain indentation', () => {
    const text = '- Fruit\n  - Apple\n  - Pear\n    * Conference\n- Veg\n1. Nuts\n';
    const result = branchesFromOutline(text);
    expect(result.map((b) => b.title)).toEqual(['Fruit', 'Veg', 'Nuts']);
    expect(result[0]?.children.map((b) => b.title)).toEqual(['Apple', 'Pear']);
    expect(result[0]?.children[1]?.children[0]?.title).toBe('Conference');
    const plain = branchesFromOutline('Root\n\tChild\n\t\tGrandchild\n\tChild 2');
    expect(plain).toHaveLength(1);
    expect(plain[0]?.children).toHaveLength(2);
  });

  it('handles a single line, blank text and uneven indentation', () => {
    expect(branchesFromOutline('Just one idea').map((b) => b.title)).toEqual(['Just one idea']);
    expect(branchesFromOutline('  \n\n')).toEqual([]);
    const jumpy = branchesFromOutline('    deep first\nshallow');
    expect(jumpy.map((b) => b.title)).toEqual(['deep first', 'shallow']);
  });

  it('trims long titles', () => {
    const [long] = branchesFromOutline('x'.repeat(2000));
    expect(long?.title).toHaveLength(500);
  });
});

describe('pasting branches', () => {
  it('adds branches as the last children, with fresh ids', () => {
    const map = sample();
    const copy = copyBranches(map, ['a']);
    const { map: next, ids } = pasteBranches(map, copy, { kind: 'child', parentId: 'b' });
    expect(titles(next, 'b')).toEqual(['A']);
    expect(ids).toHaveLength(1);
    expect(Object.keys(next.topics)).toHaveLength(Object.keys(map.topics).length + 4);
    expect(new Set(Object.keys(next.topics)).size).toBe(Object.keys(next.topics).length);
    expect(validateMap(next)).toEqual([]);
  });

  it('adds peers after or before a topic, keeping their order', () => {
    const map = sample();
    const copy = copyBranches(map, ['b', 'c']);
    const after = pasteBranches(map, copy, { kind: 'after', siblingId: 'a' }).map;
    expect(titles(after, 'core')).toEqual(['A', 'B', 'C', 'B', 'C']);
    const before = pasteBranches(map, copy, { kind: 'before', siblingId: 'b' }).map;
    expect(titles(before, 'core')).toEqual(['A', 'B', 'C', 'B', 'C']);
    expect(validateMap(after)).toEqual([]);
    expect(validateMap(before)).toEqual([]);
  });

  it('unfolds the target when pasting inside it, and refuses peers for the Core', () => {
    const map = setFolded(sample(), 'a', true);
    const next = pasteBranches(map, [{ title: 'New', children: [] }], {
      kind: 'child',
      parentId: 'a',
    }).map;
    expect(next.topics['a']?.folded).toBe(false);
    expect(() =>
      pasteBranches(map, [{ title: 'x', children: [] }], { kind: 'after', siblingId: 'core' }),
    ).toThrow();
  });

  it('keeps the map valid for random pastes', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(8), { minLength: 1, maxLength: 6 }), fc.nat(5), (picks, mode) => {
        let map = sample();
        for (const pick of picks) {
          const ids = Object.keys(map.topics).sort();
          const target = ids[pick % ids.length] as string;
          const branches = copyBranches(map, [ids[(pick * 3) % ids.length] as string]);
          const where =
            mode % 3 === 0 || target === 'core'
              ? ({ kind: 'child', parentId: target } as const)
              : ({ kind: mode % 3 === 1 ? 'after' : 'before', siblingId: target } as const);
          map = pasteBranches(map, branches, where).map;
          expect(validateMap(map)).toEqual([]);
        }
      }),
      { numRuns: 60 },
    );
  });
});

describe('dropping branches', () => {
  it('moves branches as children, before or after a topic, in order', () => {
    const map = sample();
    expect(titles(moveBranches(map, ['b', 'c'], { kind: 'child', subject: 'a' }), 'a')).toEqual([
      'A1',
      'A2',
      'B',
      'C',
    ]);
    expect(titles(moveBranches(map, ['c'], { kind: 'before', subject: 'a' }), 'core')).toEqual([
      'C',
      'A',
      'B',
    ]);
    expect(titles(moveBranches(map, ['a', 'b'], { kind: 'after', subject: 'c' }), 'core')).toEqual([
      'C',
      'A',
      'B',
    ]);
  });

  it('never drops a branch into itself or onto the Core as a peer', () => {
    const map = sample();
    expect(canDrop(map, ['a'], { kind: 'child', subject: 'a2a' })).toBe(false);
    expect(canDrop(map, ['a'], { kind: 'after', subject: 'a' })).toBe(false);
    expect(canDrop(map, ['a'], { kind: 'before', subject: 'core' })).toBe(false);
    expect(canDrop(map, ['core'], { kind: 'child', subject: 'a' })).toBe(false);
    expect(moveBranches(map, ['a'], { kind: 'child', subject: 'a1' })).toBe(map);
  });

  it('moves only the outer branch when a child is selected too', () => {
    const map = sample();
    expect(movableRoots(map, ['a2', 'a', 'core'])).toEqual(['a']);
    const next = moveBranches(map, ['a', 'a2'], { kind: 'child', subject: 'b' });
    expect(titles(next, 'b')).toEqual(['A']);
    expect(validateMap(next)).toEqual([]);
  });

  it('keeps the tree valid for random drops', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.nat(8), fc.nat(8), fc.nat(2)), { maxLength: 12 }),
        (moves) => {
          let map = sample();
          for (const [from, to, kind] of moves) {
            const ids = Object.keys(map.topics).sort();
            map = moveBranches(map, [ids[from % ids.length] as string], {
              kind: (['child', 'before', 'after'] as const)[kind % 3] ?? 'child',
              subject: ids[to % ids.length] as string,
            });
            expect(validateMap(map)).toEqual([]);
          }
        },
      ),
      { numRuns: 80 },
    );
  });
});

describe('descendantCounts', () => {
  it('counts everything below each topic', () => {
    const counts = descendantCounts(sample());
    expect(counts.get('core')).toBe(6);
    expect(counts.get('a')).toBe(3);
    expect(counts.get('a2')).toBe(1);
    expect(counts.has('b')).toBe(false);
  });
});
