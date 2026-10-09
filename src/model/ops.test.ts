import { describe, expect, it } from 'vitest';
import {
  canCreatePeer,
  createMap,
  createPeer,
  createSubTopic,
  deleteBranch,
  duplicateBranch,
  foldToLevel,
  moveBranch,
  moveSibling,
  renameTopic,
  setFolded,
  toggleFold,
  unfoldAll,
} from './ops';
import {
  ancestorsOf,
  childrenOf,
  countTopics,
  depthOf,
  selectionAfterDelete,
  visibleTopics,
} from './tree';
import { ModelError, type CanopyMap } from './types';
import { validateMap } from './validate';

const titles = (map: CanopyMap, parentId: string) => childrenOf(map, parentId).map((t) => t.title);

/** Core with children A, B, C and A1, A2 below A. */
function sample() {
  let map = createMap({ coreId: 'core', now: '2026-01-01T00:00:00.000Z' });
  const add = (parentId: string, title: string, id: string) => {
    map = createSubTopic(map, parentId, { title, id }).map;
  };
  add('core', 'A', 'a');
  add('core', 'B', 'b');
  add('core', 'C', 'c');
  add('a', 'A1', 'a1');
  add('a', 'A2', 'a2');
  return map;
}

describe('createMap', () => {
  it('has a single Core and is valid', () => {
    const map = createMap();
    expect(countTopics(map)).toBe(1);
    expect(validateMap(map)).toEqual([]);
  });
});

describe('creating topics', () => {
  it('appends sub-topics in order and can add at the front', () => {
    let map = sample();
    map = createSubTopic(map, 'core', { title: 'First', position: 'first' }).map;
    expect(titles(map, 'core')).toEqual(['First', 'A', 'B', 'C']);
  });

  it('creates peers before and after', () => {
    let map = sample();
    map = createPeer(map, 'b', 'before', { title: 'Before B' }).map;
    map = createPeer(map, 'b', 'after', { title: 'After B' }).map;
    expect(titles(map, 'core')).toEqual(['A', 'Before B', 'B', 'After B', 'C']);
    expect(validateMap(map)).toEqual([]);
  });

  it('refuses peers for the Core', () => {
    const map = sample();
    expect(canCreatePeer(map, 'core')).toBe(false);
    expect(() => createPeer(map, 'core', 'after')).toThrow(ModelError);
  });

  it('unfolds a folded parent so the new topic is visible', () => {
    let map = setFolded(sample(), 'a', true);
    map = createSubTopic(map, 'a', { title: 'A3' }).map;
    expect(map.topics['a']?.folded).toBe(false);
  });

  it('rejects duplicate ids and unknown parents', () => {
    const map = sample();
    expect(() => createSubTopic(map, 'core', { id: 'a' })).toThrow(ModelError);
    expect(() => createSubTopic(map, 'nope')).toThrow(ModelError);
  });
});

describe('renameTopic', () => {
  it('renames and returns the same map when nothing changes', () => {
    const map = sample();
    expect(renameTopic(map, 'a', 'A')).toBe(map);
    expect(renameTopic(map, 'a', 'Alpha').topics['a']?.title).toBe('Alpha');
  });
});

describe('deleteBranch', () => {
  it('removes the topic and its descendants', () => {
    const map = deleteBranch(sample(), 'a');
    expect(titles(map, 'core')).toEqual(['B', 'C']);
    expect(map.topics['a1']).toBeUndefined();
    expect(validateMap(map)).toEqual([]);
  });

  it('never deletes the Core', () => {
    expect(() => deleteBranch(sample(), 'core')).toThrow(ModelError);
  });

  it('picks a sensible selection afterwards', () => {
    const map = sample();
    expect(selectionAfterDelete(map, 'b')).toBe('c');
    expect(selectionAfterDelete(map, 'c')).toBe('b');
    expect(selectionAfterDelete(map, 'a1')).toBe('a2');
    const lonely = deleteBranch(deleteBranch(map, 'a2'), 'a1');
    expect(selectionAfterDelete(lonely, 'a')).toBe('b');
  });
});

describe('moveBranch', () => {
  it('re-parents to a position', () => {
    const map = moveBranch(sample(), 'c', { parentId: 'a', index: 1 });
    expect(titles(map, 'a')).toEqual(['A1', 'C', 'A2']);
    expect(titles(map, 'core')).toEqual(['A', 'B']);
  });

  it('reorders within the same parent', () => {
    const map = moveBranch(sample(), 'c', { parentId: 'core', index: 0 });
    expect(titles(map, 'core')).toEqual(['C', 'A', 'B']);
  });

  it('is a no-op when the position does not change', () => {
    const map = sample();
    expect(moveBranch(map, 'b', { parentId: 'core', index: 1 })).toBe(map);
  });

  it('clamps out-of-range indexes', () => {
    const map = moveBranch(sample(), 'a', { parentId: 'core', index: 99 });
    expect(titles(map, 'core')).toEqual(['B', 'C', 'A']);
  });

  it('prevents cycles and moving the Core', () => {
    const map = sample();
    expect(() => moveBranch(map, 'a', { parentId: 'a1', index: 0 })).toThrow(/itself/);
    expect(() => moveBranch(map, 'a', { parentId: 'a', index: 0 })).toThrow(ModelError);
    expect(() => moveBranch(map, 'core', { parentId: 'a', index: 0 })).toThrow(ModelError);
  });

  it('unfolds the new parent', () => {
    let map = setFolded(sample(), 'a', true);
    map = moveBranch(map, 'c', { parentId: 'a', index: 0 });
    expect(map.topics['a']?.folded).toBe(false);
  });

  it('moves one place among peers and stops at the ends', () => {
    let map = moveSibling(sample(), 'b', -1);
    expect(titles(map, 'core')).toEqual(['B', 'A', 'C']);
    expect(moveSibling(map, 'b', -1)).toBe(map);
    map = moveSibling(map, 'b', 1);
    map = moveSibling(map, 'b', 1);
    expect(titles(map, 'core')).toEqual(['A', 'C', 'B']);
  });
});

describe('duplicateBranch', () => {
  it('copies the subtree right after the original with new ids', () => {
    const { map, id } = duplicateBranch(sample(), 'a');
    expect(titles(map, 'core')).toEqual(['A', 'A', 'B', 'C']);
    expect(childrenOf(map, 'core')[1]?.id).toBe(id);
    expect(titles(map, id)).toEqual(['A1', 'A2']);
    expect(countTopics(map)).toBe(9);
    expect(validateMap(map)).toEqual([]);
  });

  it('never duplicates the Core', () => {
    expect(() => duplicateBranch(sample(), 'core')).toThrow(ModelError);
  });
});

describe('folding', () => {
  it('toggles only topics that have children', () => {
    const map = sample();
    expect(toggleFold(map, 'a').topics['a']?.folded).toBe(true);
    expect(toggleFold(map, 'b')).toBe(map);
  });

  it('hides descendants of folded topics', () => {
    const map = setFolded(sample(), 'a', true);
    expect(visibleTopics(map).map((t) => t.id)).toEqual(['core', 'a', 'b', 'c']);
  });

  it('folds to a level and unfolds everything', () => {
    let map = sample();
    map = createSubTopic(map, 'a1', { id: 'deep' }).map;
    const level1 = foldToLevel(map, 1);
    expect(level1.topics['core']?.folded).toBe(false);
    expect(level1.topics['a']?.folded).toBe(true);
    const level2 = foldToLevel(map, 2);
    expect(level2.topics['a']?.folded).toBe(false);
    expect(level2.topics['a1']?.folded).toBe(true);
    expect(level2.topics['b']?.folded).toBe(false);
    expect(Object.values(unfoldAll(level1).topics).some((t) => t.folded)).toBe(false);
  });
});

describe('tree queries', () => {
  it('reports depth and ancestors', () => {
    const map = sample();
    expect(depthOf(map, 'core')).toBe(0);
    expect(depthOf(map, 'a2')).toBe(2);
    expect(ancestorsOf(map, 'a2').map((t) => t.id)).toEqual(['a', 'core']);
  });
});
