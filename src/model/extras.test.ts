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
  setEdgeLabel,
  setNote,
  setProps,
  setTopicReference,
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
  it('fills the corners and then stops', () => {
    let map = base();
    for (let i = 0; i < MAX_STICKERS + 2; i++) map = addSticker(map, 'a', 'star');
    expect(map.topics['a']?.stickers).toHaveLength(MAX_STICKERS);
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

  it('holds a few stickers and removes them by ID', () => {
    let map = base();
    for (let i = 0; i < MAX_EDGE_STICKERS + 2; i++) map = addEdgeSticker(map, 'a', 'star');
    const list = map.topics['a']?.edge?.stickers ?? [];
    expect(list).toHaveLength(MAX_EDGE_STICKERS);
    for (const s of list) map = removeEdgeSticker(map, 'a', s.id);
    expect(map.topics['a']?.edge).toBeUndefined();
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
