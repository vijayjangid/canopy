import { stickerName } from '../stickers/catalog';
import { fuzzyMatches } from './fuzzy';
import { addDays, formatDate } from './dates';
import { planningOf, statusDef } from './planning';
import { isOverdue } from './rollup';
import { ancestorsOf, subtreeOf } from './tree';
import type { CanopyMap, Filter, FilterQuery, Topic, TopicId } from './types';

export interface FilterContext {
  /** Today as `YYYY-MM-DD`. */
  today: string;
}

/** Filters every map offers. */
export const FILTER_PRESETS: readonly Filter[] = [
  { id: 'preset:overdue', name: 'Overdue', mode: 'dim', query: { due: 'overdue' } },
  { id: 'preset:week', name: 'Due this week', mode: 'dim', query: { due: 'week' } },
];

/** Whether one topic satisfies a Filter query. Conditions combine with `match` (all by default). */
export function topicMatches(
  map: CanopyMap,
  topic: Topic,
  query: FilterQuery,
  ctx: FilterContext,
): boolean {
  const checks: boolean[] = [];
  const props = topic.props;

  if (query.status) checks.push(props?.status !== undefined && query.status.includes(props.status));
  if (query.statusCategory) {
    const category = statusDef(map, props?.status)?.category;
    checks.push(category !== undefined && query.statusCategory.includes(category));
  }
  if (query.tags) checks.push(query.tags.some((t) => props?.tags?.includes(t)));
  if (query.text) {
    const text = query.text;
    checks.push(fuzzyMatches(text, topic.title) || fuzzyMatches(text, topic.edge?.label ?? ''));
  }
  if (query.stickers) {
    const wanted = query.stickers;
    const has = (list: Topic['stickers']) => list?.some((s) => wanted.includes(s.key)) ?? false;
    checks.push(has(topic.stickers) || has(topic.edge?.stickers));
  }
  if (query.due === 'overdue') checks.push(isOverdue(map, topic.id, ctx.today));
  if (query.due === 'week') {
    const end = props?.due?.end ?? props?.due?.start;
    checks.push(end !== undefined && end >= ctx.today && end <= addDays(ctx.today, 7));
  }

  if (query.dueBetween) {
    const { from, to } = query.dueBetween;
    const date = props?.due?.end ?? props?.due?.start;
    checks.push(
      date !== undefined &&
        (from === undefined || date >= from) &&
        (to === undefined || date <= to),
    );
  }

  if (checks.length === 0) return false;
  return query.match === 'any' ? checks.some(Boolean) : checks.every(Boolean);
}

export interface FilterResult {
  /** Topics that match. */
  matches: Set<TopicId>;
  /** Matches and everything on the way down to them, so paths stay visible. */
  paths: Set<TopicId>;
  /** Matches in reading order, for jumping between them. */
  ordered: TopicId[];
}

/** Which topics a Filter picks out. Walks the whole map once. */
export function evaluateFilter(
  map: CanopyMap,
  query: FilterQuery,
  ctx: FilterContext,
): FilterResult {
  const matches = new Set<TopicId>();
  const paths = new Set<TopicId>();
  const ordered: TopicId[] = [];
  for (const topic of subtreeOf(map, map.coreId)) {
    if (!topicMatches(map, topic, query, ctx)) continue;
    matches.add(topic.id);
    ordered.push(topic.id);
    paths.add(topic.id);
    for (const a of ancestorsOf(map, topic.id)) paths.add(a.id);
  }
  return { matches, paths, ordered };
}

/** What is ticked in the Filter panel. Choices in one group are alternatives, and groups combine. */
export interface FilterSelection {
  /** Any of these statuses. */
  status: string[];
  /** Any of these tags. */
  tags: string[];
  /** Any of these stickers, on the topic or on the line above it. */
  stickers: string[];
  /** Fuzzy text to look for in titles and line labels. */
  text: string;
  /** One way to pick by due date. `range` uses `from` and `to`. */
  due: 'overdue' | 'week' | 'range' | null;
  from: string;
  to: string;
}

export const NO_FILTER: FilterSelection = {
  status: [],
  tags: [],
  stickers: [],
  text: '',
  due: null,
  from: '',
  to: '',
};

const DATE = /^(19|20)\d{2}-\d{2}-\d{2}$/;

/** The query for a selection, or null when nothing is picked. Every group must match. */
export function selectionQuery(sel: FilterSelection): FilterQuery | null {
  const query: FilterQuery = { match: 'all' };
  let any = false;
  if (sel.status.length > 0) {
    query.status = sel.status;
    any = true;
  }
  if (sel.tags.length > 0) {
    query.tags = sel.tags;
    any = true;
  }
  if (sel.stickers.length > 0) {
    query.stickers = sel.stickers;
    any = true;
  }
  if (sel.text.trim()) {
    query.text = sel.text.trim();
    any = true;
  }
  if (sel.due === 'overdue' || sel.due === 'week') {
    query.due = sel.due;
    any = true;
  } else if (sel.due === 'range') {
    const from = DATE.test(sel.from) ? sel.from : undefined;
    const to = DATE.test(sel.to) ? sel.to : undefined;
    if (from || to) {
      query.dueBetween = { ...(from ? { from } : {}), ...(to ? { to } : {}) };
      any = true;
    }
  }
  return any ? query : null;
}

/** A short name for a selection, such as "Done, Canceled · Due this week". */
export function selectionName(map: CanopyMap, sel: FilterSelection): string {
  const parts: string[] = [];
  if (sel.text.trim()) parts.push(`“${sel.text.trim()}”`);
  if (sel.status.length > 0) {
    parts.push(sel.status.map((k) => statusDef(map, k)?.label ?? k).join(', '));
  }
  if (sel.tags.length > 0) {
    const tags = planningOf(map).tags;
    parts.push(sel.tags.map((k) => `#${tags.find((t) => t.key === k)?.label ?? k}`).join(', '));
  }
  if (sel.stickers.length > 0) parts.push(sel.stickers.map(stickerName).join(', '));
  if (sel.due === 'overdue') parts.push('Overdue');
  else if (sel.due === 'week') parts.push('Due this week');
  else if (sel.due === 'range') {
    const label = (d: string) => (DATE.test(d) ? formatDate(d) : '…');
    parts.push(`Due ${label(sel.from)} to ${label(sel.to)}`);
  }
  return parts.join(' · ');
}

/** Every Filter a map can show: dates, each status, each tag, then its own. */
export function filtersOf(map: CanopyMap): Filter[] {
  const plan = planningOf(map);
  return [
    ...FILTER_PRESETS,
    ...plan.statusSet.map((s): Filter => ({
      id: `status:${s.key}`,
      name: s.label,
      mode: 'dim',
      query: { status: [s.key] },
    })),
    ...plan.tags.map((t): Filter => ({
      id: `tag:${t.key}`,
      name: `#${t.label}`,
      mode: 'dim',
      query: { tags: [t.key] },
    })),
    ...(map.filters ?? []),
  ];
}

/** Keys of the stickers on any topic or line in the map. */
export function usedStickers(map: CanopyMap): Set<string> {
  const keys = new Set<string>();
  for (const topic of Object.values(map.topics)) {
    for (const s of topic.stickers ?? []) keys.add(s.key);
    for (const s of topic.edge?.stickers ?? []) keys.add(s.key);
  }
  return keys;
}
