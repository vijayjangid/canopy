import { describe, expect, it } from 'vitest';
import {
  MAX_EDGE_STICKERS,
  MAX_STICKERS,
  addEdgeSticker,
  addSticker,
  branchesFromJson,
  branchesToJson,
  copyBranches,
  createMap,
  createSubTopic,
  parseFile,
  pasteBranches,
  removeEdgeSticker,
  removeSticker,
  removeStickerKey,
  setEdgeLabel,
  setImageAlt,
  setProps,
  setTopicNote,
  setTopicImage,
  addTopicReference,
  clearTopicReferences,
  removeTopicReference,
  validateMap,
  toggleEdgeSticker,
  toggleSticker,
  stringifyFile,
  deleteBranch,
  discardUnknownStickers,
} from '.';

const base = () =>
  createSubTopic(createMap({ coreId: 'core' }), 'core', { id: 'a', title: 'A' }).map;

describe('stickers', () => {
  const KINDS = ['love', 'bug', 'idea', 'celebrate', 'flag', 'warning'];

  it('fills the corners with different stickers and then stops', () => {
    let map = base();
    for (const key of KINDS) map = addSticker(map, 'a', key);
    expect(map.topics['a']?.stickers).toHaveLength(MAX_STICKERS);
    expect(map.topics['a']?.stickers?.map((s) => s.key)).toEqual(KINDS.slice(0, MAX_STICKERS));
  });

  it('puts each sticker on once', () => {
    const once = addSticker(base(), 'a', 'love');
    expect(addSticker(once, 'a', 'love')).toBe(once);
    expect(once.topics['a']?.stickers).toHaveLength(1);
  });

  it('toggles a sticker on and off, and refuses a new one when full', () => {
    let map = toggleSticker(base(), 'a', 'love');
    expect(map.topics['a']?.stickers?.map((s) => s.key)).toEqual(['love']);
    map = toggleSticker(map, 'a', 'love');
    expect(map.topics['a']?.stickers).toBeUndefined();
    for (const key of KINDS.slice(0, MAX_STICKERS)) map = toggleSticker(map, 'a', key);
    expect(toggleSticker(map, 'a', 'flag')).toBe(map);
    // A full topic still lets one come off.
    expect(toggleSticker(map, 'a', 'love').topics['a']?.stickers).toHaveLength(MAX_STICKERS - 1);
    expect(removeStickerKey(map, 'a', 'nope')).toBe(map);
  });

  it('keeps one of each kind when a file or the clipboard repeats a sticker', () => {
    const file = {
      schema: 'canopy/1',
      core: {
        id: 'core',
        title: 'Core',
        children: [
          {
            id: 'a',
            title: 'A',
            stickers: [
              { id: 's1', key: 'love' },
              { id: 's2', key: 'love' },
              { id: 's3', key: 'flag' },
              { id: 's4', key: 'rocket' },
            ],
            edge: {
              stickers: [
                { id: 'e1', key: 'flag' },
                { id: 'e2', key: 'flag' },
                { id: 'e3', key: 'alert' },
              ],
            },
          },
        ],
      },
    };
    const result = parseFile(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.topics['a']?.stickers?.map((s) => s.id)).toEqual(['s1', 's3']);
    expect(result.map.topics['a']?.edge?.stickers?.map((s) => s.id)).toEqual(['e1']);
  });

  it('discards unknown sticker keys from imported maps', () => {
    const result = parseFile({
      schema: 'canopy/1',
      filters: [{ id: 'old-filter', name: 'Old', mode: 'dim', query: { stickers: ['rocket'] } }],
      core: {
        id: 'core',
        title: 'Core',
        children: [
          {
            id: 'a',
            title: 'A',
            stickers: [
              { id: 'keep', key: 'love' },
              { id: 'old', key: 'rocket' },
            ],
            edge: { stickers: [{ id: 'old-edge', key: 'clock' }] },
          },
        ],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.topics['a']?.stickers).toEqual([{ id: 'keep', key: 'love' }]);
    expect(result.map.topics['a']?.edge).toBeUndefined();
    expect(result.map.filters?.[0]?.query.stickers).toBeUndefined();
  });

  it('removes one by ID and leaves no empty list behind', () => {
    let map = addSticker(addSticker(base(), 'a', 'love'), 'a', 'flag');
    const [first, second] = map.topics['a']?.stickers ?? [];
    map = removeSticker(map, 'a', first?.id ?? '');
    expect(map.topics['a']?.stickers?.map((s) => s.key)).toEqual(['flag']);
    map = removeSticker(map, 'a', second?.id ?? '');
    expect(map.topics['a']?.stickers).toBeUndefined();
  });

  it('drops unknown sticker keys from local maps without mapping them', () => {
    const map = base();
    const topic = map.topics['a'];
    if (!topic) throw new Error('Expected topic A');
    const withUnknown: typeof map = {
      ...map,
      filters: [{ id: 'old-filter', name: 'Old', mode: 'dim', query: { stickers: ['rocket'] } }],
      topics: {
        ...map.topics,
        a: {
          ...topic,
          stickers: [
            { id: 'old', key: 'rocket' },
            { id: 'keep', key: 'love' },
          ],
          edge: { label: 'related to', stickers: [{ id: 'old-edge', key: 'clock' }] },
        },
      },
    };
    const cleaned = discardUnknownStickers(withUnknown);
    expect(cleaned.topics['a']?.stickers).toEqual([{ id: 'keep', key: 'love' }]);
    expect(cleaned.topics['a']?.edge).toEqual({ label: 'related to' });
    expect(cleaned.filters?.[0]?.query.stickers).toBeUndefined();
  });
});

describe('lines', () => {
  it('labels a line, and clears an empty one', () => {
    const labelled = setEdgeLabel(base(), 'a', 'depends on');
    expect(labelled.topics['a']?.edge).toEqual({ label: 'depends on' });
    expect(setEdgeLabel(labelled, 'a', 'depends on')).toBe(labelled);
    expect(setEdgeLabel(labelled, 'a', '  ').topics['a']?.edge).toBeUndefined();
  });

  it('gives the core no line', () => {
    const map = base();
    expect(setEdgeLabel(map, 'core', 'x')).toBe(map);
    expect(addEdgeSticker(map, 'core', 'love')).toBe(map);
  });

  it('holds a few different stickers, once each, and removes them by ID', () => {
    let map = base();
    for (const key of ['love', 'love', 'flag', 'warning', 'check', 'question']) {
      map = addEdgeSticker(map, 'a', key);
    }
    const list = map.topics['a']?.edge?.stickers ?? [];
    expect(list.map((s) => s.key)).toEqual(['love', 'flag', 'warning']);
    expect(list).toHaveLength(MAX_EDGE_STICKERS);
    for (const s of list) map = removeEdgeSticker(map, 'a', s.id);
    expect(map.topics['a']?.edge).toBeUndefined();
  });

  it('toggles a sticker on the line on and off', () => {
    let map = toggleEdgeSticker(base(), 'a', 'flag');
    expect(map.topics['a']?.edge?.stickers?.map((s) => s.key)).toEqual(['flag']);
    map = toggleEdgeSticker(map, 'a', 'flag');
    expect(map.topics['a']?.edge).toBeUndefined();
    const core = base();
    expect(toggleEdgeSticker(core, 'core', 'flag')).toBe(core);
  });

  it('survives saving and pasting', () => {
    const map = addEdgeSticker(setEdgeLabel(base(), 'a', 'blocks'), 'a', 'flag');
    const result = parseFile(JSON.parse(stringifyFile(map)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.topics['a']?.edge?.label).toBe('blocks');
    expect(result.map.topics['a']?.edge?.stickers?.[0]?.key).toBe('flag');
    const branches = branchesFromJson(branchesToJson(copyBranches(map, ['a'])));
    const pasted = pasteBranches(map, branches ?? [], { kind: 'child', parentId: 'core' });
    const child = pasted.map.topics[pasted.ids[0] ?? ''];
    expect(child?.edge?.label).toBe('blocks');
  });
});

describe('topic references', () => {
  const two = () => createSubTopic(base(), 'core', { id: 'b', title: 'B' }).map;
  const three = () => createSubTopic(two(), 'core', { id: 'c', title: 'C' }).map;

  it('points to an existing topic and takes the reference away', () => {
    let map = addTopicReference(two(), 'a', 'b');
    expect(map.topics['a']?.references).toEqual(['b']);
    expect(addTopicReference(map, 'a', 'b')).toBe(map);
    map = removeTopicReference(map, 'a', 'b');
    expect(map.topics['a']?.references).toBeUndefined();
    expect(removeTopicReference(map, 'a', 'b')).toBe(map);
  });

  it('lets one topic point at several, and several point at one', () => {
    let map = addTopicReference(three(), 'a', 'b');
    map = addTopicReference(map, 'a', 'c');
    expect(map.topics['a']?.references).toEqual(['b', 'c']);
    map = addTopicReference(map, 'b', 'c');
    expect(map.topics['c']).toBeDefined();
    // Taking away one leaves the other.
    expect(removeTopicReference(map, 'a', 'b').topics['a']?.references).toEqual(['c']);
    expect(clearTopicReferences(map, 'a').topics['a']?.references).toBeUndefined();
    expect(clearTopicReferences(map, 'a').topics['b']?.references).toEqual(['c']);
    expect(validateMap(map)).toEqual([]);
  });

  it('refuses a topic pointing at itself', () => {
    expect(() => addTopicReference(two(), 'a', 'a')).toThrow();
  });

  it('removes incoming references when their target branch is deleted, keeping the others', () => {
    let map = addTopicReference(three(), 'a', 'b');
    map = addTopicReference(map, 'a', 'c');
    expect(deleteBranch(map, 'b').topics['a']?.references).toEqual(['c']);
    expect(deleteBranch(deleteBranch(map, 'b'), 'c').topics['a']?.references).toBeUndefined();
  });

  it('round-trips several references through the file format', () => {
    const map = addTopicReference(addTopicReference(three(), 'a', 'b'), 'a', 'c');
    const result = parseFile(JSON.parse(stringifyFile(map)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map.topics['a']?.references).toEqual(['b', 'c']);
  });

  it('opens a file from before references were a list', () => {
    const file = (extra: Record<string, unknown>) => ({
      schema: 'canopy/1',
      core: {
        id: 'core',
        title: 'Core',
        children: [
          { id: 'a', title: 'A', ...extra, children: [] },
          { id: 'b', title: 'B', children: [] },
          { id: 'c', title: 'C', children: [] },
        ],
      },
    });
    const old = parseFile(file({ referenceTo: 'b' }));
    expect(old.ok && old.map.topics['a']?.references).toEqual(['b']);
    // Both forms together are read as one list, without repeats.
    const both = parseFile(file({ referenceTo: 'b', references: ['b', 'c'] }));
    expect(both.ok && both.map.topics['a']?.references).toEqual(['b', 'c']);
  });

  it('keeps references on same-map paste and drops dangling references elsewhere', () => {
    const map = addTopicReference(addTopicReference(three(), 'a', 'b'), 'a', 'c');
    const branches = branchesFromJson(branchesToJson(copyBranches(map, ['a']))) ?? [];
    const copiedHere = pasteBranches(map, branches, { kind: 'child', parentId: 'core' });
    expect(copiedHere.map.topics[copiedHere.ids[0] ?? '']?.references).toEqual(['b', 'c']);
    const copiedElsewhere = pasteBranches(base(), branches, { kind: 'child', parentId: 'core' });
    expect(copiedElsewhere.map.topics[copiedElsewhere.ids[0] ?? '']?.references).toBeUndefined();
  });

  it('keeps the references that still point somewhere when only some do', () => {
    const map = addTopicReference(addTopicReference(three(), 'a', 'b'), 'a', 'c');
    const branches = branchesFromJson(branchesToJson(copyBranches(map, ['a']))) ?? [];
    // A map that has B but not C.
    const target = createSubTopic(base(), 'core', { id: 'b', title: 'B' }).map;
    const pasted = pasteBranches(target, branches, { kind: 'child', parentId: 'core' });
    expect(pasted.map.topics[pasted.ids[0] ?? '']?.references).toEqual(['b']);
  });

  it('rejects references to missing topics and self references', () => {
    const file = (references: string[]) => ({
      schema: 'canopy/1',
      core: {
        id: 'core',
        title: 'Core',
        children: [{ id: 'a', title: 'A', references, children: [] }],
      },
    });
    expect(parseFile(file(['missing'])).ok).toBe(false);
    expect(parseFile(file(['a'])).ok).toBe(false);
  });
});

describe('content survives saving, copying and pasting', () => {
  const rich = () => {
    const map = setTopicNote(
      addSticker(base(), 'a', 'bug'),
      'a',
      '- [ ] Ship\n\n[docs](https://example.com)',
    );
    return setProps(map, ['a'], { due: { end: '2026-11-01' }, tags: ['x'] });
  };

  it('round-trips through the file format', () => {
    const result = parseFile(JSON.parse(stringifyFile(rich())));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.map.topics['a'];
    expect(a?.note).toBe('- [ ] Ship\n\n[docs](https://example.com)');
    expect(a?.stickers?.[0]?.key).toBe('bug');
    expect(a?.props).toEqual({ due: { end: '2026-11-01' }, tags: ['x'] });
  });

  it('opens old files that still carry attachments or people, ignoring them', () => {
    const file = JSON.parse(stringifyFile(rich()));
    file.core.children[0].attachments = [
      { id: 'a1', name: 'x', ref: 'data:text/plain;base64,aGk=', kind: 'file' },
    ];
    file.core.children[0].props.people = { owner: ['p1'] };
    file.roster = [{ id: 'p1', name: 'Priya' }];
    const result = parseFile(file);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map.topics['a']?.props).toEqual(rich().topics['a']?.props);
  });

  it('carries the note and other content through copy and paste', () => {
    const map = rich();
    const branches = branchesFromJson(branchesToJson(copyBranches(map, ['a'])));
    expect(branches?.[0]?.extras?.note).toBe('- [ ] Ship\n\n[docs](https://example.com)');
    const pasted = pasteBranches(map, branches ?? [], { kind: 'child', parentId: 'core' });
    const copy = pasted.map.topics[pasted.ids[0] ?? ''];
    expect(copy?.note).toBe(map.topics['a']?.note);
    expect(copy?.stickers).toHaveLength(1);
    expect(copy?.props).toEqual(map.topics['a']?.props);
  });
});

describe('topic pictures', () => {
  const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const image = { src: PNG, w: 1, h: 1 };

  it('sets and removes a picture', () => {
    const map = setTopicImage(base(), 'a', image);
    expect(map.topics['a']?.image).toEqual(image);
    expect(setTopicImage(map, 'a', null).topics['a']?.image).toBeUndefined();
    const plain = base();
    expect(setTopicImage(plain, 'a', null)).toBe(plain);
  });

  it('survives saving, copying and pasting', () => {
    const map = setTopicImage(base(), 'a', image);
    const result = parseFile(JSON.parse(stringifyFile(map)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map.topics['a']?.image).toEqual(image);
    const branches = branchesFromJson(branchesToJson(copyBranches(map, ['a'])));
    const pasted = pasteBranches(map, branches ?? [], { kind: 'child', parentId: 'core' });
    expect(pasted.map.topics[pasted.ids[0] ?? '']?.image).toEqual(image);
  });

  it('refuses anything that is not an embedded raster picture', () => {
    const file = (img: unknown) => ({
      schema: 'canopy/1',
      core: { id: 'core', title: 'Core', children: [{ id: 'a', title: 'A', image: img }] },
    });
    expect(parseFile(file(image)).ok).toBe(true);
    for (const src of [
      'https://example.com/a.png',
      'javascript:alert(1)',
      'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      'data:text/html;base64,PGI+',
      `${PNG}"onload="x`,
    ]) {
      expect(parseFile(file({ src, w: 1, h: 1 })).ok, src).toBe(false);
    }
    expect(parseFile(file({ src: PNG, w: 0, h: 1 })).ok).toBe(false);
    expect(parseFile(file({ src: PNG, w: 99999, h: 1 })).ok).toBe(false);
  });

  it('describes a picture, and clears the description when emptied', () => {
    const map = setTopicImage(base(), 'a', image);
    const described = setImageAlt(map, 'a', '  A  red   square ');
    expect(described.topics['a']?.image?.alt).toBe('A red square');
    expect(setImageAlt(described, 'a', 'A red square')).toBe(described);
    expect(setImageAlt(described, 'a', '  ').topics['a']?.image?.alt).toBeUndefined();
    const plain = base();
    expect(setImageAlt(plain, 'a', 'x')).toBe(plain);
  });

  it('keeps the description in files, and caps its length', () => {
    const file = (alt: unknown) => ({
      schema: 'canopy/1',
      core: {
        id: 'core',
        title: 'Core',
        children: [{ id: 'a', title: 'A', image: { ...image, alt } }],
      },
    });
    const kept = parseFile(file('Logo'));
    expect(kept.ok && kept.map.topics['a']?.image?.alt).toBe('Logo');
    const long = parseFile(file('x'.repeat(500)));
    expect(long.ok && long.map.topics['a']?.image?.alt?.length).toBe(200);
    const bad = parseFile(file(42));
    expect(bad.ok && bad.map.topics['a']?.image?.alt).toBeUndefined();
  });
});
