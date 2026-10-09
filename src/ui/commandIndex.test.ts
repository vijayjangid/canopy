import { beforeEach, describe, expect, it } from 'vitest';
import { COMMANDS } from '../editor/shortcuts';
import { buildPalette, fuzzyScore, loadRecent, pushRecent, searchPalette } from './commandIndex';

const entry = (id: string, label: string) => ({ id, label, group: 'G', keys: [], run: () => {} });

describe('fuzzyScore', () => {
  it('needs every letter in order', () => {
    expect(fuzzyScore('adc', 'Add child')).not.toBeNull();
    expect(fuzzyScore('dda', 'Add child')).toBeNull();
    expect(fuzzyScore('zz', 'Add child')).toBeNull();
  });

  it('prefers prefixes and word starts over scattered letters', () => {
    const prefix = fuzzyScore('add', 'Add sub-topic') ?? 0;
    const scattered = fuzzyScore('add', 'Delete and duplicate') ?? 0;
    expect(prefix).toBeGreaterThan(scattered);
  });

  it('ignores case and spaces', () => {
    expect(fuzzyScore('ZOOM in', 'Zoom in')).not.toBeNull();
  });
});

describe('searchPalette', () => {
  const list = [entry('a', 'Zoom in'), entry('b', 'Zoom out'), entry('c', 'Undo')];

  it('lists recent commands first when nothing is typed', () => {
    expect(searchPalette(list, '', ['c']).map((e) => e.id)).toEqual(['c', 'a', 'b']);
    expect(searchPalette(list, '', ['a', 'b']).map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('filters and ranks by the query', () => {
    expect(searchPalette(list, 'zoom o', []).map((e) => e.id)).toEqual(['b']);
    expect(searchPalette(list, 'und', []).map((e) => e.id)).toEqual(['c']);
    expect(searchPalette(list, 'xyz', [])).toEqual([]);
  });
});

describe('recent commands', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the newest last, without repeats, and a short list', () => {
    let list: string[] = [];
    for (const id of ['a', 'b', 'c', 'a']) list = pushRecent(id, list);
    expect(list).toEqual(['b', 'c', 'a']);
    for (const id of 'defghijk'.split('')) list = pushRecent(id, list);
    expect(list.length).toBe(6);
    expect(loadRecent()).toEqual(list);
  });

  it('survives unreadable storage', () => {
    localStorage.setItem('canopy.recentCommands', '{oops');
    expect(loadRecent()).toEqual([]);
  });
});

describe('palette coverage', () => {
  it('offers every command, either directly or as plain variants', () => {
    const ids = new Set(buildPalette().map((e) => e.id));
    const variants: Record<string, string> = {
      'topic.reorder': 'topic.moveBack',
      'view.foldToLevel': 'view.level.1',
    };
    const notOffered = new Set([
      'nav.arrow',
      'select.escape',
      'palette.open',
      'filter.open',
      'filter.search',
    ]);
    for (const command of COMMANDS) {
      if (notOffered.has(command.id)) continue;
      expect(ids.has(variants[command.id] ?? command.id), command.id).toBe(true);
    }
  });

  it('has unique IDs', () => {
    const ids = buildPalette().map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
