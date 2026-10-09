import { describe, expect, it } from 'vitest';
import { ModelError, childrenOf, createMap, createSubTopic, insertBetween, parentOf } from '.';

function sample() {
  let map = createMap({ coreId: 'core' });
  for (const id of ['a', 'b', 'c', 'd']) {
    map = createSubTopic(map, 'core', { id, title: id.toUpperCase() }).map;
  }
  map = createSubTopic(map, 'b', { id: 'b1', title: 'B1' }).map;
  return map;
}

const titles = (map: ReturnType<typeof sample>, id: string) => childrenOf(map, id).map((t) => t.id);

describe('insertBetween', () => {
  it('puts a new topic between a parent and one child, in that child’s place', () => {
    const { map, id } = insertBetween(sample(), 'core', ['b'], { id: 'n' });
    expect(titles(map, 'core')).toEqual(['a', 'n', 'c', 'd']);
    expect(parentOf(map, 'b')?.id).toBe('n');
    expect(titles(map, 'b')).toEqual(['b1']);
    expect(id).toBe('n');
  });

  it('adopts every child of the parent, keeping their order', () => {
    const { map, id } = insertBetween(sample(), 'core', ['a', 'b', 'c', 'd'], { id: 'n' });
    expect(titles(map, 'core')).toEqual([id]);
    expect(titles(map, id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('takes the place of the first adopted sibling when the others are scattered', () => {
    const { map } = insertBetween(sample(), 'core', ['d', 'b'], { id: 'n' });
    expect(titles(map, 'core')).toEqual(['a', 'n', 'c']);
    expect(titles(map, 'n')).toEqual(['b', 'd']);
  });

  it('refuses topics that are not children of the parent, or none at all', () => {
    expect(() => insertBetween(sample(), 'core', ['b1'])).toThrow(ModelError);
    expect(() => insertBetween(sample(), 'core', [])).toThrow(ModelError);
  });
});
