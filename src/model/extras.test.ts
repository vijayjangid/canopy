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
  setNote,
  setImageAlt,
  setProps,
  setTopicImage,
  setTopicReference,
  toggleEdgeSticker,
  toggleSticker,
  stringifyFile,
  deleteBranch,
} from '.';

const base = () =>
  createSubTopic(createMap({ coreId: 'core' }), 'core', { id: 'a', title: 'A' }).map;

describe('notes', () => {
  it('sets, changes and clears a note', () => {
    const withNote = setNote(base(), 'a', '# Hi');
    expect(withNote.topics['a']?.note).toBe('# Hi');
    expect(setNote(withNote, 'a', '# Hi')).toBe(withNote);
    expect('note' in (setNote(withNote, 'a', '').topics['a'] ?? {})).toBe(false);
  });
});

describe('stickers', () => {
  const KINDS = ['star', 'heart', 'bolt', 'fire', 'idea', 'rocket'];

  it('fills the corners with different stickers and then stops', () => {
    let map = base();
    for (const key of KINDS) map = addSticker(map, 'a', key);
    expect(map.topics['a']?.stickers).toHaveLength(MAX_STICKERS);
    expect(map.topics['a']?.stickers?.map((s) => s.key)).toEqual(KINDS.slice(0, MAX_STICKERS));
  });

  it('puts each sticker on once', () => {
    const once = addSticker(base(), 'a', 'star');
    expect(addSticker(once, 'a', 'star')).toBe(once);
    expect(once.topics['a']?.stickers).toHaveLength(1);
  });

  it('toggles a sticker on and off, and refuses a new one when full', () => {
    let map = toggleSticker(base(), 'a', 'star');
    expect(map.topics['a']?.stickers?.map((s) => s.key)).toEqual(['star']);
    map = toggleSticker(map, 'a', 'star');
    expect(map.topics['a']?.stickers).toBeUndefined();
    for (const key of KINDS.slice(0, MAX_STICKERS)) map = toggleSticker(map, 'a', key);
    expect(toggleSticker(map, 'a', 'rocket')).toBe(map);
    // A full topic still lets one come off.
    expect(toggleSticker(map, 'a', 'heart').topics['a']?.stickers).toHaveLength(MAX_STICKERS - 1);
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
              { id: 's1', key: 'star' },
              { id: 's2', key: 'star' },
              { id: 's3', key: 'heart' },
            ],
            edge: {
              stickers: [
                { id: 'e1', key: 'flag' },
                { id: 'e2', key: 'flag' },
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

  it('removes one by ID and leaves no empty list behind', () => {
    let map = addSticker(addSticker(base(), 'a', 'star'), 'a', 'heart');
    const [first, second] = map.topics['a']?.stickers ?? [];
    map = removeSticker(map, 'a', first?.id ?? '');
    expect(map.topics['a']?.stickers?.map((s) => s.key)).toEqual(['heart']);
    map = removeSticker(map, 'a', second?.id ?? '');
    expect(map.topics['a']?.stickers).toBeUndefined();
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
    expect(addEdgeSticker(map, 'core', 'star')).toBe(map);
  });

  it('holds a few different stickers, once each, and removes them by ID', () => {
    let map = base();
    for (const key of ['star', 'star', 'flag', 'alert', 'done', 'bolt']) {
      map = addEdgeSticker(map, 'a', key);
    }
    const list = map.topics['a']?.edge?.stickers ?? [];
    expect(list.map((s) => s.key)).toEqual(['star', 'flag', 'alert']);
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
  it('points to an existing topic and clears the reference', () => {
    let map = createSubTopic(base(), 'core', { id: 'b', title: 'B' }).map;
    map = setTopicReference(map, 'a', 'b');
    expect(map.topics['a']?.referenceTo).toBe('b');
    expect(setTopicReference(map, 'a', 'b')).toBe(map);
    expect(setTopicReference(map, 'a', null).topics['a']?.referenceTo).toBeUndefined();
  });

  it('removes incoming references when their target branch is deleted', () => {
    let map = createSubTopic(base(), 'core', { id: 'b', title: 'B' }).map;
    map = setTopicReference(map, 'a', 'b');
    expect(deleteBranch(map, 'b').topics['a']?.referenceTo).toBeUndefined();
  });

  it('round-trips references through the file format', () => {
    const map = setTopicReference(
      createSubTopic(base(), 'core', { id: 'b', title: 'B' }).map,
      'a',
      'b',
    );
    const result = parseFile(JSON.parse(stringifyFile(map)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.map.topics['a']?.referenceTo).toBe('b');
  });

  it('keeps references on same-map paste and drops dangling references elsewhere', () => {
    const map = setTopicReference(
      createSubTopic(base(), 'core', { id: 'b', title: 'B' }).map,
      'a',
      'b',
    );
    const branches = branchesFromJson(branchesToJson(copyBranches(map, ['a']))) ?? [];
    const copiedHere = pasteBranches(map, branches, { kind: 'child', parentId: 'core' });
    expect(copiedHere.map.topics[copiedHere.ids[0] ?? '']?.referenceTo).toBe('b');
    const copiedElsewhere = pasteBranches(base(), branches, { kind: 'child', parentId: 'core' });
    expect(copiedElsewhere.map.topics[copiedElsewhere.ids[0] ?? '']?.referenceTo).toBeUndefined();
  });

  it('rejects references to missing topics and self references', () => {
    const file = (referenceTo: string) => ({
      schema: 'canopy/1',
      core: {
        id: 'core',
        title: 'Core',
        children: [{ id: 'a', title: 'A', referenceTo, children: [] }],
      },
    });
    expect(parseFile(file('missing')).ok).toBe(false);
    expect(parseFile(file('a')).ok).toBe(false);
  });
});

describe('content survives saving, copying and pasting', () => {
  const rich = () => {
    let map = setNote(base(), 'a', 'A **note**');
    map = addSticker(map, 'a', 'rocket');
    return setProps(map, ['a'], { status: 'doing', due: { end: '2026-11-01' }, tags: ['x'] });
  };

  it('round-trips through the file format', () => {
    const result = parseFile(JSON.parse(stringifyFile(rich())));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const a = result.map.topics['a'];
    expect(a?.note).toBe('A **note**');
    expect(a?.stickers?.[0]?.key).toBe('rocket');
    expect(a?.props).toEqual({ status: 'doing', due: { end: '2026-11-01' }, tags: ['x'] });
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

  it('carries content through copy, JSON clipboard and paste', () => {
    const map = rich();
    const branches = branchesFromJson(branchesToJson(copyBranches(map, ['a'])));
    expect(branches?.[0]?.extras?.note).toBe('A **note**');
    const pasted = pasteBranches(map, branches ?? [], { kind: 'child', parentId: 'core' });
    const copy = pasted.map.topics[pasted.ids[0] ?? ''];
    expect(copy?.note).toBe('A **note**');
    expect(copy?.stickers).toHaveLength(1);
    expect(copy?.props?.status).toBe('doing');
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
