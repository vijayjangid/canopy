import { describe, expect, it } from 'vitest';
import { branchOnly, collapsedAbove, countTopics, createMap, createSubTopic } from '.';

function sample() {
  let map = createMap({ coreId: 'core' });
  const add = (parent: string, id: string, title = id) => {
    map = createSubTopic(map, parent, { id, title }).map;
  };
  add('core', 'a', 'Alpha');
  add('core', 'b', 'Beta');
  add('a', 'a1', 'Alpha one');
  add('a1', 'a1x');
  add('a', 'a2');
  add('b', 'b1');
  return map;
}

describe('branchOnly', () => {
  it('keeps the branch and makes its top the Core', () => {
    const view = branchOnly(sample(), 'a');
    expect(view.coreId).toBe('a');
    expect(Object.keys(view.topics).sort()).toEqual(['a', 'a1', 'a1x', 'a2']);
    expect(view.topics['a']?.parentId).toBeNull();
    expect(view.topics['a1']?.parentId).toBe('a');
  });
});

describe('collapsedAbove', () => {
  it('counts what is left out and names the parents', () => {
    const map = sample();
    const above = collapsedAbove(map, 'a1');
    expect(above.path).toEqual(['Central topic', 'Alpha']);
    expect(above.count).toBe(countTopics(map) - 2);
    expect(collapsedAbove(map, 'a').count).toBe(3);
  });
});
