import { fuzzyMatches, fuzzyScore } from '../model';

export type SearchKind = 'topic' | 'command' | 'filter';

/** One thing the search can take you to, run, or turn into a Filter. */
export interface SearchEntry {
  id: string;
  kind: SearchKind;
  label: string;
  /** Where it is (a topic's path) or what it belongs to (a command's group). */
  sub: string;
  keys: string[];
  /** An action on the whole search, such as turning the text into a Filter, not a result. */
  action?: boolean;
  run: () => void;
}

export interface SearchSection {
  title: string;
  entries: SearchEntry[];
}

/** Whether the whole name is what was typed, ignoring case and spacing. */
export const isExact = (entry: SearchEntry, query: string): boolean =>
  entry.label.trim().toLowerCase() === query.trim().toLowerCase();

/** How many of each kind one search lists, so no kind crowds out the others. */
const LIMITS: Record<SearchKind, number> = { topic: 8, command: 8, filter: 6 };

/** Results come in two groups: what is on the map (topics, then ways to filter it), and commands. */
const MAP_TITLE = 'Filter the map';
const COMMAND_TITLE = 'Commands';

/**
 * Entries that match `query`, best first. `extra` entries come last in the first group, for the one that
 * turns the typed text into a Filter. Empty groups are left out.
 */
export function searchEverything(
  query: string,
  pool: readonly SearchEntry[],
  extra: readonly SearchEntry[] = [],
): SearchSection[] {
  const found: Record<SearchKind, Array<{ entry: SearchEntry; score: number }>> = {
    topic: [],
    command: [],
    filter: [],
  };
  for (const entry of pool) {
    // Letters in order are not enough: they must also sit close together, or "desi" finds everything.
    const text = `${entry.label} ${entry.sub}`;
    const score = fuzzyMatches(query, text) ? fuzzyScore(query, text) : null;
    // A name that is exactly what was typed leads its group.
    if (score !== null)
      found[entry.kind].push({ entry, score: score + (isExact(entry, query) ? 1000 : 0) });
  }
  const best = (kind: SearchKind) =>
    found[kind]
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMITS[kind])
      .map((x) => x.entry);

  const real = [...best('topic'), ...best('filter')];
  const topics = real.filter((e) => e.kind === 'topic');
  const onMap = [...topics, ...real.filter((e) => e.kind === 'filter'), ...extra];
  const commands = best('command');
  const mapGroup: SearchSection = { title: MAP_TITLE, entries: onMap };
  const commandGroup: SearchSection = { title: COMMAND_TITLE, entries: commands };
  // With nothing on the map to go to, the commands that match come first, so Enter runs one.
  const ordered = real.length === 0 ? [commandGroup, mapGroup] : [mapGroup, commandGroup];
  const sections = ordered.filter((group) => group.entries.length > 0);
  return sections;
}
