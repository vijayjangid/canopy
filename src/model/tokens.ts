import { parseDateWord } from './dates';
import { ensureTag, planningOf, setProps, type PropsPatch } from './planning';
import type { CanopyMap } from './types';

/** One shorthand the person typed in a title, and what it means. */
export interface Token {
  raw: string;
  kind: 'tag' | 'status' | 'due';
  /** Short text for a preview, such as `Due 2026-10-09`. */
  label: string;
}

export interface ParsedTitle {
  /** The title with the recognized shorthand removed. */
  title: string;
  tokens: Token[];
  newTags: string[];
  status?: string;
  due?: string;
  tags: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** The one status a word refers to, by key, label or unique prefix. */
export function findStatus(map: CanopyMap, word: string): string | null {
  const w = norm(word);
  if (!w) return null;
  const set = planningOf(map).statusSet;
  const exact = set.filter(
    (s) => s.key === word.toLowerCase() || norm(s.label) === w || norm(s.key) === w,
  );
  if (exact.length === 1) return exact[0]?.key ?? null;
  const prefix = set.filter((s) =>
    [...norm(s.label).split(' '), norm(s.key)].some((part) => part.startsWith(w)),
  );
  return prefix.length === 1 ? (prefix[0]?.key ?? null) : null;
}

/**
 * Reads shorthand out of a title: `#tag`, `/status` and `^date` (today, tomorrow, weekdays, `+3d`,
 * `eow`, `nov1`, `11/1`, `2026-11-01`). A word counts only at the start of a word, so emails, `C#`
 * and file paths stay as typed. Anything that does not resolve is left in the title.
 */
export function parseTitle(map: CanopyMap, text: string, now: Date = new Date()): ParsedTitle {
  const result: ParsedTitle = { title: '', tokens: [], newTags: [], tags: [] };
  const kept: string[] = [];
  const known = new Set(planningOf(map).tags.map((t) => t.label.toLowerCase()));

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const leader = word.charAt(0);
    const body = word.slice(1);
    let used = false;

    if (leader === '#' && /^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(body)) {
      const label = body.replace(/_/g, ' ');
      result.tags.push(label);
      if (!known.has(label.toLowerCase()) && !result.newTags.includes(label))
        result.newTags.push(label);
      result.tokens.push({ raw: word, kind: 'tag', label: `Tag ${label}` });
      used = true;
    } else if (leader === '/' && body.length > 0 && !body.includes('/')) {
      const key = findStatus(map, body);
      if (key) {
        result.status = key;
        const def = planningOf(map).statusSet.find((s) => s.key === key);
        result.tokens.push({ raw: word, kind: 'status', label: `Status ${def?.label ?? key}` });
        used = true;
      }
    } else if (leader === '^' && body.length > 0) {
      const date = parseDateWord(body, now);
      if (date) {
        result.due = date;
        result.tokens.push({ raw: word, kind: 'due', label: `Due ${date}` });
        used = true;
      }
    }
    if (!used) kept.push(word);
  }

  result.title = kept.join(' ');
  return result;
}

/** True when `text` has shorthand in it, which is cheap to check on every key. */
export const mayHaveTokens = (text: string): boolean => /(^|\s)[#/^]\S/.test(text);

/** Turns shorthand in one topic's title into Properties. Null when there is nothing to turn. */
export function applyTitleTokens(
  map: CanopyMap,
  id: string,
  now: Date = new Date(),
): { map: CanopyMap; labels: string[] } | null {
  const topic = map.topics[id];
  if (!topic || !mayHaveTokens(topic.title)) return null;
  const parsed = parseTitle(map, topic.title, now);
  // Never leave a topic with no title just because everything typed was shorthand.
  if (parsed.tokens.length === 0 || parsed.title.trim() === '') return null;

  let next = map;
  const tags = [...(topic.props?.tags ?? [])];
  for (const label of parsed.tags) {
    const tag = ensureTag(next, label);
    next = tag.map;
    if (!tags.includes(tag.key)) tags.push(tag.key);
  }
  const patch: PropsPatch = {};
  if (parsed.status) patch.status = parsed.status;
  if (parsed.due) patch.due = { end: parsed.due };
  if (parsed.tags.length > 0) patch.tags = tags;

  next = setProps(next, [id], patch);
  const current = next.topics[id] ?? topic;
  return {
    map: { ...next, topics: { ...next.topics, [id]: { ...current, title: parsed.title } } },
    labels: parsed.tokens.map((t) => t.label),
  };
}
