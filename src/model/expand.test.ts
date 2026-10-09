import { describe, expect, it } from 'vitest';
import {
  childrenOf,
  createMap,
  createSubTopic,
  expandTopicTitle,
  parseExpansion,
  renameTopic,
} from '.';

const titles = (map: ReturnType<typeof createMap>, parent: string) =>
  childrenOf(map, parent).map((t) => t.title);

describe('parseExpansion', () => {
  it('reads > as going down and commas or lines as siblings', () => {
    const chain = parseExpansion('!!a>b>c');
    expect(chain?.count).toBe(3);
    expect(chain?.branches).toHaveLength(1);
    expect(chain?.branches[0]?.children[0]?.children[0]?.title).toBe('c');

    expect(parseExpansion('!!a, b, c')?.branches.map((b) => b.title)).toEqual(['a', 'b', 'c']);
    expect(parseExpansion('!!a\nb\nc')?.branches.map((b) => b.title)).toEqual(['a', 'b', 'c']);
  });

  it('lets each sibling start its own chain', () => {
    const parsed = parseExpansion('!!a>b, c>d>e');
    expect(parsed?.branches.map((b) => b.title)).toEqual(['a', 'c']);
    expect(parsed?.count).toBe(5);
  });

  it('ignores empty pieces, and plain titles or a bare !!', () => {
    expect(parseExpansion('!!a,, ,b>>c')?.count).toBe(3);
    expect(parseExpansion('!!')).toBeNull();
    expect(parseExpansion('!! , >')).toBeNull();
    expect(parseExpansion('Plain')).toBeNull();
  });

  it('stops at the cap', () => {
    const many = `!!${Array.from({ length: 500 }, (_, i) => `n${i}`).join(',')}`;
    expect(parseExpansion(many)?.count).toBe(200);
  });
});

describe('expandTopicTitle', () => {
  const start = () => {
    const base = createMap();
    const { map, id } = createSubTopic(base, base.coreId);
    return { map, id, core: base.coreId };
  };

  it('turns the typed topic into the first name and adds the rest as peers', () => {
    const { map, id, core } = start();
    const result = expandTopicTitle(renameTopic(map, id, '!!a, b, c'), id);
    expect(titles(result!.map, core)).toEqual(['a', 'b', 'c']);
    expect(result?.focus).not.toBe(id);
  });

  it('nests a chain below the typed topic', () => {
    const { map, id, core } = start();
    const result = expandTopicTitle(renameTopic(map, id, '!!a>b>c'), id)!;
    expect(titles(result.map, core)).toEqual(['a']);
    const b = childrenOf(result.map, id);
    expect(b.map((t) => t.title)).toEqual(['b']);
    expect(childrenOf(result.map, b[0]!.id).map((t) => t.title)).toEqual(['c']);
  });

  it('reads #tag and ^date in each name', () => {
    const { map, id } = start();
    const result = expandTopicTitle(renameTopic(map, id, '!!a #launch, b ^2026-11-01'), id)!;
    const all = Object.values(result.map.topics);
    expect(all.find((t) => t.title === 'a')?.props?.tags).toHaveLength(1);
    expect(all.find((t) => t.title === 'b')?.props?.due?.end).toBe('2026-11-01');
  });

  it('leaves the Core and plain titles alone', () => {
    const { map, core } = start();
    expect(expandTopicTitle(renameTopic(map, core, '!!a,b'), core)).toBeNull();
  });
});
