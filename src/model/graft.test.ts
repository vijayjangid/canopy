import { describe, expect, it } from 'vitest';
import {
  addSticker,
  createMap,
  createSubTopic,
  ensureTag,
  graftMap,
  graftTitle,
  planningOf,
  setEdgeLabel,
  setNote,
  setProps,
  setFolded,
  addTopicReference,
  subtreeOf,
  validateMap,
  type CanopyMap,
} from '.';

/** Roots "Source" with A (with A1) and B, where B points at A1. */
function source(): CanopyMap {
  let map = createMap({ coreId: 's', coreTitle: 'Source', title: 'Explored' });
  map = createSubTopic(map, 's', { id: 'sa', title: 'A' }).map;
  map = createSubTopic(map, 's', { id: 'sb', title: 'B' }).map;
  map = createSubTopic(map, 'sa', { id: 'sa1', title: 'A1' }).map;
  map = addTopicReference(map, 'sb', 'sa1');
  map = setNote(map, 'sa', 'A note');
  map = addSticker(map, 'sa', 'star');
  map = setEdgeLabel(map, 'sa', 'depends on');
  return map;
}

const target = () =>
  createSubTopic(createMap({ coreId: 'core' }), 'core', { id: 'x', title: 'X' }).map;

describe('graftMap', () => {
  it('adds the other map as a new last branch with fresh IDs', () => {
    const base = createSubTopic(target(), 'x', { id: 'x1', title: 'X1' }).map;
    const { map, id, count } = graftMap(base, 'x', source());
    expect(count).toBe(4);
    expect(validateMap(map)).toEqual([]);
    expect(map.topics[id]?.parentId).toBe('x');
    expect(map.topics[id]?.title).toBe('Source');
    const titles = subtreeOf(map, id).map((t) => t.title);
    expect(titles).toEqual(['Source', 'A', 'A1', 'B']);
    // Nothing of the other map's IDs is reused.
    for (const old of ['s', 'sa', 'sb', 'sa1']) expect(map.topics[old]).toBeUndefined();
    // It lands after the topic's existing children.
    const kids = Object.values(map.topics).filter((t) => t.parentId === 'x');
    expect(kids.sort((a, b) => (a.orderKey < b.orderKey ? -1 : 1)).map((t) => t.title)).toEqual([
      'X1',
      'Source',
    ]);
  });

  it('can be added again and again without clashes', () => {
    let map = target();
    for (let i = 0; i < 3; i++) map = graftMap(map, 'core', source()).map;
    expect(validateMap(map)).toEqual([]);
    expect(Object.keys(map.topics)).toHaveLength(2 + 12);
  });

  it('keeps content, and keeps references between its own topics pointing at the copies', () => {
    const { map, id } = graftMap(target(), 'core', source());
    const [, a, a1, b] = subtreeOf(map, id);
    expect(a?.note).toBe('A note');
    expect(a?.stickers).toHaveLength(1);
    expect(a?.edge?.label).toBe('depends on');
    expect(b?.references).toEqual([a1?.id]);
    expect(map.topics['sa1']).toBeUndefined();
  });

  it('drops a reference that points outside the imported map', () => {
    const base = createSubTopic(createMap({ coreId: 'core' }), 'core', {
      id: 'sa1',
      title: 'Same ID',
    }).map;
    const loose = createSubTopic(createMap({ coreId: 's' }), 's', { id: 'q', title: 'Q' }).map;
    // `ghost` does not exist in the imported map, so the reference cannot be kept.
    const dangling = {
      ...loose,
      topics: { ...loose.topics, q: { ...loose.topics['q']!, references: ['sa1'] } },
    };
    const { map, id } = graftMap(base, 'core', dangling);
    expect(subtreeOf(map, id).every((t) => t.references === undefined)).toBe(true);
    expect(validateMap(map)).toEqual([]);
  });

  it('opens a folded target, and keeps fold state inside the branch', () => {
    const folded = setFolded(source(), 'sa', true);
    const closed = setFolded(createSubTopic(target(), 'x', { id: 'x1' }).map, 'x', true);
    const { map, id } = graftMap(closed, 'x', folded);
    expect(map.topics['x']?.folded).toBe(false);
    expect(subtreeOf(map, id)[1]?.folded).toBe(true);
  });

  it('carries over the statuses and tags that its topics use', () => {
    const made = ensureTag(source(), 'Launch');
    const src = setProps(made.map, ['sa'], { status: 'doing', tags: [made.key] });
    const { map } = graftMap(target(), 'core', src);
    expect(planningOf(map).tags.map((t) => t.label)).toEqual(['Launch']);
    expect(planningOf(map).statusSet.some((s) => s.key === 'doing')).toBe(true);
    // The map keeps its own choices when it already has them.
    const again = graftMap(map, 'core', src).map;
    expect(planningOf(again).tags).toHaveLength(1);
  });

  it('leaves planning alone when nothing needs adding', () => {
    const base = target();
    expect(graftMap(base, 'core', source()).map.planning).toBe(base.planning);
  });

  it('names the branch from the map title when the Core still has the default name', () => {
    const plain = createMap({ coreId: 'c', title: 'Trip plan' });
    expect(graftTitle(plain)).toBe('Trip plan');
    expect(graftTitle(source())).toBe('Source');
    const unnamed = createMap({ coreId: 'c', coreTitle: '  ', title: 'Untitled map' });
    expect(graftTitle(unnamed)).toBe('Untitled map');
  });
});
