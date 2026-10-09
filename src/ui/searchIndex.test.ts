import { beforeEach, describe, expect, it } from 'vitest';
import { isExact, searchEverything, type SearchEntry } from './searchIndex';
import { clearRecentSearches, loadRecentSearches, pushRecentSearch } from './recentSearches';

const entry = (kind: SearchEntry['kind'], label: string, sub = ''): SearchEntry => ({
  id: `${kind}:${label}`,
  kind,
  label,
  sub,
  keys: [],
  run: () => {},
});

describe('searchEverything', () => {
  const pool = [
    entry('topic', 'Design', 'Product launch'),
    entry('topic', 'Accessibility', 'Product launch'),
    entry('command', 'Describe the picture (alt text)', 'Topic content'),
    entry('command', 'Add sub-topic', 'Create'),
    entry('filter', 'Status: Done', 'Show only these topics'),
    entry('filter', 'Tag: Design', 'Show only these topics'),
  ];

  it('has two groups: the map (topics, then filters) and commands', () => {
    const sections = searchEverything('design', pool);
    expect(sections.map((s) => s.title)).toEqual(['Filter the map']);
    expect(sections[0]?.entries.map((e) => e.label)).toEqual(['Design', 'Tag: Design']);

    // With nothing on the map to go to, the commands lead and the text row follows.
    const text = entry('filter', 'Highlight topics matching “add”');
    const lead = searchEverything('add', pool, [text]);
    expect(lead.map((s) => s.title)).toEqual(['Commands', 'Filter the map']);

    const both = searchEverything('s', pool);
    expect(both.map((s) => s.title)).toEqual(['Filter the map', 'Commands']);
  });

  it('finds status by name', () => {
    const [section] = searchEverything('done', pool);
    expect(section?.title).toBe('Filter the map');
    expect(section?.entries[0]?.label).toBe('Status: Done');
  });

  it('does not match letters that are scattered far apart', () => {
    const labels = searchEverything('dpt', pool).flatMap((s) => s.entries.map((e) => e.label));
    expect(labels).not.toContain('Describe the picture (alt text)');
  });

  it('puts the extra entry after the topics and the other filters', () => {
    const extra = entry('filter', 'Highlight topics matching “done”');
    const [section] = searchEverything('done', pool, [extra]);
    expect(section?.entries[0]?.label).toBe('Status: Done');
    expect(section?.entries[1]).toBe(extra);
  });

  it('lists nothing when nothing matches', () => {
    expect(searchEverything('zzzz', pool)).toEqual([]);
  });
});

describe('recent searches', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the newest first without repeats', () => {
    pushRecentSearch('design');
    pushRecentSearch('blocked');
    pushRecentSearch('  Design ');
    expect(loadRecentSearches()).toEqual(['Design', 'blocked']);
  });

  it('keeps only the latest few, ignores blanks, and can be cleared', () => {
    for (const q of ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7']) pushRecentSearch(q);
    pushRecentSearch('   ');
    expect(loadRecentSearches()).toEqual(['g7', 'f6', 'e5', 'd4', 'c3', 'b2']);
    expect(clearRecentSearches()).toEqual([]);
    expect(loadRecentSearches()).toEqual([]);
  });
});

describe('exact matches', () => {
  it('lead their group and are recognised', () => {
    const pool = [entry('topic', 'Design review', 'Core'), entry('topic', 'Design', 'Core › Plan')];
    const [section] = searchEverything('design', pool);
    expect(section?.entries[0]?.label).toBe('Design');
    expect(isExact(section!.entries[0]!, ' DESIGN ')).toBe(true);
    expect(isExact(section!.entries[1]!, 'design')).toBe(false);
  });
});
