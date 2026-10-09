import { describe, expect, it } from 'vitest';
import { createMap, createSubTopic, setFolded } from '../model';
import { trailOf } from './trail';

function sample() {
  let map = createMap({ coreId: 'core' });
  map = createSubTopic(map, 'core', { id: 'a', title: 'A' }).map;
  map = createSubTopic(map, 'a', { id: 'a1', title: 'A1' }).map;
  map = createSubTopic(map, 'a1', { id: 'a1x', title: 'A1x' }).map;
  map = createSubTopic(map, 'core', { id: 'b', title: 'B' }).map;
  return map;
}

describe('trailOf', () => {
  it('has nothing for the Core', () => {
    expect(trailOf(sample(), 'core')).toBeNull();
  });

  it('marks the topics above and the lines on the way', () => {
    const trail = trailOf(sample(), 'a1');
    expect([...(trail?.nodes ?? [])].sort()).toEqual(['a', 'core']);
    expect([...(trail?.links ?? [])].sort()).toEqual(['a', 'a1']);
    expect(trail?.levels).toBe(2);
  });

  it('keeps the way up and the open branch under the focus, not its peers', () => {
    expect([...(trailOf(sample(), 'a1')?.keep ?? [])].sort()).toEqual(['a', 'a1', 'a1x', 'core']);
  });

  it('keeps nothing under a folded focus', () => {
    const folded = setFolded(sample(), 'a1', true);
    expect([...(trailOf(folded, 'a1')?.keep ?? [])].sort()).toEqual(['a', 'a1', 'core']);
  });
});
