import { describe, expect, it } from 'vitest';
import {
  FILTER_PRESETS,
  NO_FILTER,
  addEdgeSticker,
  addSticker,
  computeRollups,
  createMap,
  createSubTopic,
  csvCell,
  endOfWeek,
  ensureTag,
  evaluateFilter,
  fuzzyMatches,
  filtersOf,
  parseDateWord,
  parseFile,
  parseTitle,
  removeTag,
  renameTopic,
  setEdgeLabel,
  setProps,
  selectionName,
  selectionQuery,
  stringifyFile,
  tableRows,
  toCsv,
  usedStickers,
  type CanopyMap,
} from '.';

// Wednesday 2026-10-07.
const NOW = new Date(2026, 9, 7, 12, 0, 0);
const TODAY = '2026-10-07';

function sample(): CanopyMap {
  let map = createMap({ coreId: 'core' });
  map = createSubTopic(map, 'core', { id: 'a', title: 'Alpha' }).map;
  map = createSubTopic(map, 'a', { id: 'a1', title: 'A one' }).map;
  map = createSubTopic(map, 'a', { id: 'a2', title: 'A two' }).map;
  map = createSubTopic(map, 'core', { id: 'b', title: 'Beta' }).map;
  return map;
}

describe('dates', () => {
  it('ends the week on Friday, or next Friday once the weekend starts', () => {
    expect(endOfWeek(NOW)).toBe('2026-10-09');
    expect(endOfWeek(new Date(2026, 9, 9))).toBe('2026-10-09');
    expect(endOfWeek(new Date(2026, 9, 10))).toBe('2026-10-16');
    expect(endOfWeek(new Date(2026, 9, 11))).toBe('2026-10-16');
  });

  it('reads relative words from a fixed day', () => {
    expect(parseDateWord('today', NOW)).toBe('2026-10-07');
    expect(parseDateWord('tomorrow', NOW)).toBe('2026-10-08');
    expect(parseDateWord('fri', NOW)).toBe('2026-10-09');
    expect(parseDateWord('wed', NOW)).toBe('2026-10-14');
    expect(parseDateWord('+3d', NOW)).toBe('2026-10-10');
    expect(parseDateWord('eow', NOW)).toBe('2026-10-09');
    expect(parseDateWord('nextweek', NOW)).toBe('2026-10-12');
    expect(parseDateWord('eom', NOW)).toBe('2026-10-31');
  });

  it('reads calendar dates, and rolls a past month and day to next year', () => {
    expect(parseDateWord('nov1', NOW)).toBe('2026-11-01');
    expect(parseDateWord('11/1', NOW)).toBe('2026-11-01');
    expect(parseDateWord('jan5', NOW)).toBe('2027-01-05');
    expect(parseDateWord('2026-12-25', NOW)).toBe('2026-12-25');
  });

  it('rejects things that are not dates', () => {
    for (const bad of ['', 'soon', 'feb31', '2026-02-31', '13/1', 'zzz']) {
      expect(parseDateWord(bad, NOW), bad).toBeNull();
    }
  });
});

describe('setProps', () => {
  it('sets and clears properties, and leaves no empty shells', () => {
    let map = setProps(sample(), ['a'], {
      due: { end: '2026-11-01' },
      tags: ['x'],
    });
    expect(map.topics['a']?.props).toEqual({
      due: { end: '2026-11-01' },
      tags: ['x'],
    });
    map = setProps(map, ['a'], { due: null, tags: null });
    expect(map.topics['a']?.props).toBeUndefined();
  });

  it('applies to several topics in one step', () => {
    const map = setProps(sample(), ['a', 'a1', 'b'], { tags: ['launch'] });
    expect(['a', 'a1', 'b'].every((id) => map.topics[id]?.props?.tags?.includes('launch'))).toBe(
      true,
    );
  });
});

describe('Tags', () => {
  it('finds or adds tags by label, and removes them everywhere', () => {
    const first = ensureTag(sample(), 'Q4 Launch');
    expect(first.key).toBe('q4-launch');
    expect(ensureTag(first.map, 'q4 launch').map).toBe(first.map);
    const tagged = setProps(first.map, ['a', 'b'], { tags: [first.key] });
    const gone = removeTag(tagged, first.key);
    expect(gone.planning?.tags).toEqual([]);
    expect(gone.topics['a']?.props).toBeUndefined();
  });
});

describe('roll-ups', () => {
  const planned = () => {
    let map = sample();
    map = setProps(map, ['a1'], { due: { end: '2026-10-01' } });
    map = setProps(map, ['a2'], { due: { start: '2026-10-05', end: '2026-10-20' } });
    return setProps(map, ['b'], { due: { end: '2026-09-01' } });
  };

  it('finds the date range and overdue topics', () => {
    const r = computeRollups(planned(), TODAY);
    expect(r.get('a')).toMatchObject({
      overdue: 1,
      start: '2026-10-01',
      end: '2026-10-20',
    });
    expect(r.get('core')).toMatchObject({ overdue: 2 });
  });

  it('is cached for the same topics and recomputed after an edit', () => {
    const map = planned();
    expect(computeRollups(map, TODAY)).toBe(computeRollups(map, TODAY));
    const edited = setProps(map, ['a2'], { due: { end: '2026-10-01' } });
    expect(computeRollups(edited, TODAY).get('a')?.overdue).toBe(2);
  });
});

describe('Filters', () => {
  const planned = () => {
    let map = ensureTag(sample(), 'launch');
    const tag = map.key;
    map = { ...map, map: setProps(map.map, ['a1'], { tags: [tag] }) };
    let m = setProps(map.map, ['a2'], { due: { end: '2026-10-09' } });
    m = setProps(m, ['b'], { due: { end: '2026-09-01' } });
    return { map: m, tag };
  };
  const run = (map: CanopyMap, id: string) => {
    const filter = filtersOf(map).find((l) => l.id === id);
    return evaluateFilter(map, filter?.query ?? {}, { today: TODAY });
  };

  it('offers dates and every tag', () => {
    const { map } = planned();
    const ids = filtersOf(map).map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(['preset:overdue', 'preset:week', 'tag:launch']));
    expect(FILTER_PRESETS).toHaveLength(2);
  });

  it('picks out topics by date and tag', () => {
    const { map } = planned();
    expect(run(map, 'preset:overdue').ordered).toEqual(['b']);
    expect(run(map, 'preset:week').ordered).toEqual(['a2']);
    expect(run(map, 'tag:launch').ordered).toEqual(['a1']);
  });

  it('keeps the path to each match', () => {
    const { map } = planned();
    expect([...run(map, 'tag:launch').paths].sort()).toEqual(['a', 'a1', 'core']);
  });

  it('combines conditions with all or any, and matches nothing for an empty query', () => {
    const { map } = planned();
    const query = { tags: ['launch'], due: 'overdue' as const };
    expect(evaluateFilter(map, { ...query, match: 'all' }, { today: TODAY }).ordered).toEqual([]);
    expect(evaluateFilter(map, { ...query, match: 'any' }, { today: TODAY }).ordered).toEqual([
      'a1',
      'b',
    ]);
    expect(evaluateFilter(sample(), {}, { today: TODAY }).ordered).toEqual([]);
  });
});

describe('Filter by stickers', () => {
  const stuck = () => {
    let map = addSticker(sample(), 'a1', 'love');
    map = addSticker(map, 'b', 'bug');
    return addEdgeSticker(map, 'a2', 'love');
  };

  it('picks out topics with a sticker, on the topic or on its line', () => {
    const map = stuck();
    const query = selectionQuery({ ...NO_FILTER, stickers: ['love'] });
    expect(evaluateFilter(map, query ?? {}, { today: TODAY }).ordered).toEqual(['a1', 'a2']);
    const either = selectionQuery({ ...NO_FILTER, stickers: ['love', 'bug'] });
    expect(evaluateFilter(map, either ?? {}, { today: TODAY }).ordered).toEqual(['a1', 'a2', 'b']);
  });

  it('combines with other groups, names itself, and lists what is used', () => {
    const map = stuck();
    const sel = { ...NO_FILTER, stickers: ['love'], due: 'overdue' as const };
    expect(selectionName(map, sel)).toBe('Love · Overdue');
    expect(evaluateFilter(map, selectionQuery(sel) ?? {}, { today: TODAY }).ordered).toEqual([]);
    expect([...usedStickers(map)].sort()).toEqual(['bug', 'home', 'love']);
  });

  it('survives save and open as a saved Filter', () => {
    const map = {
      ...stuck(),
      filters: [{ id: 'f', name: 'Love', mode: 'dim' as const, query: { stickers: ['love'] } }],
    };
    const back = parseFile(JSON.parse(stringifyFile(map)));
    expect(back.ok && back.map.filters?.[0]?.query.stickers).toEqual(['love']);
  });
});

describe('Filter by text', () => {
  const named = () => {
    let map = renameTopic(sample(), 'a', 'Research');
    map = renameTopic(map, 'b', 'Roadmap and follow-up plan');
    return setEdgeLabel(map, 'a2', 'depends on');
  };

  it('finds words with letters left out, but not letters that are far apart', () => {
    expect(fuzzyMatches('rsch', 'Research')).toBe(true);
    expect(fuzzyMatches('road plan', 'Roadmap and follow-up plan')).toBe(true);
    expect(fuzzyMatches('rpn', 'Research plan')).toBe(false);
    expect(fuzzyMatches('', 'Research')).toBe(false);
  });

  it('matches titles and the labels on lines', () => {
    const map = named();
    const run = (text: string) =>
      evaluateFilter(map, selectionQuery({ ...NO_FILTER, text }) ?? {}, { today: TODAY }).ordered;
    expect(run('resrch')).toEqual(['a']);
    expect(run('depends')).toEqual(['a2']);
    expect(run('zzz')).toEqual([]);
    expect(selectionName(map, { ...NO_FILTER, text: ' rsch ' })).toBe('\u201crsch\u201d');
  });
});

describe('shorthand in titles', () => {
  it('reads tags and a date', () => {
    const parsed = parseTitle(sample(), 'Ship it #q4 #big_launch ^fri', NOW);
    expect(parsed.tags).toEqual(['q4', 'big launch']);
    expect(parsed.due).toBe('2026-10-09');
    expect(parsed.title).toBe('Ship it');
  });

  it('leaves slash-prefixed words in the title', () => {
    expect(parseTitle(sample(), 'Ship /nonsense', NOW).title).toBe('Ship /nonsense');
  });

  it('leaves emails, C#, paths, mentions and bad values alone', () => {
    for (const text of [
      'mail a@b.com now',
      'learn C# today',
      'see /usr/bin',
      'by ^someday',
      'price #',
      '@priya !p1',
    ]) {
      expect(parseTitle(sample(), text, NOW).title, text).toBe(text);
    }
  });

  it('copes with odd input', () => {
    expect(() => parseTitle(sample(), '@@@ !! ## // ^^ @@', NOW)).not.toThrow();
  });
});

describe('table and CSV', () => {
  it('lists every topic with its path and properties in words', () => {
    const tagged = ensureTag(sample(), 'big');
    const map = setProps(tagged.map, ['a1'], {
      due: { end: '2026-10-20' },
      tags: [tagged.key],
    });
    const rows = tableRows(map, TODAY);
    expect(rows.find((r) => r.Topic === 'A one')).toMatchObject({
      Path: 'Core Idea > Alpha',
      Due: '2026-10-20',
      Tags: 'big',
    });
    expect(rows).toHaveLength(5);
  });

  it('can be limited to some topics', () => {
    expect(tableRows(sample(), TODAY, new Set(['b'])).map((r) => r.Topic)).toEqual(['Beta']);
  });

  it('quotes cells and defuses formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    for (const lead of ['+1', '-1', '@sum', '\tx']) {
      expect(csvCell(lead).startsWith(`'`) || csvCell(lead).startsWith(`"'`)).toBe(true);
    }
  });

  it('starts with a header row and a byte order mark', () => {
    const csv = toCsv(tableRows(sample(), TODAY));
    expect(csv.startsWith('\uFEFFPath,Topic,Start,Due')).toBe(true);
    expect(csv.split('\r\n').length).toBe(7);
  });
});

describe('file format', () => {
  it('keeps supported properties, tags and filters through save and open', () => {
    const tagged = ensureTag(sample(), 'x');
    let map = setProps(tagged.map, ['a'], {
      due: { start: '2026-10-01', end: '2026-10-20' },
      tags: [tagged.key],
    });
    map = {
      ...map,
      filters: [{ id: 'l1', name: 'Tagged', mode: 'isolate', query: { tags: [tagged.key] } }],
    };
    const result = parseFile(JSON.parse(stringifyFile(map)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.topics['a']?.props).toEqual(map.topics['a']?.props);
    expect(result.map.planning).toEqual(map.planning);
    expect(result.map.filters).toEqual(map.filters);
  });

  it('drops statuses and status filters from legacy files', () => {
    const raw = JSON.parse(stringifyFile(sample())) as Record<string, unknown>;
    raw['planning'] = {
      statusSet: [{ key: 'done', label: 'Done', category: 'complete' }],
      tags: [],
    };
    const core = raw['core'] as Record<string, unknown>;
    core['props'] = { status: 'done', tags: ['keep'] };
    raw['filters'] = [
      {
        id: 'old-status',
        name: 'Done',
        mode: 'dim',
        query: { status: ['done'], statusCategory: ['complete'] },
      },
    ];
    const result = parseFile(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.topics.core?.props).toEqual({ tags: ['keep'] });
    expect(result.map.planning).toBeUndefined();
    expect(result.map.filters).toBeUndefined();
  });
});
