import { subtreeOf } from './tree';
import type { CanopyMap, TopicId } from './types';

export interface Rollup {
  /** Sub-topics (at any depth) whose due date has passed. */
  overdue: number;
  /** Earliest start and latest end among the sub-topics. */
  start?: string;
  end?: string;
}

const empty = (): Rollup => ({ overdue: 0 });
const endOf = (due: { start?: string; end?: string } | undefined) => due?.end ?? due?.start;
const startOf = (due: { start?: string; end?: string } | undefined) => due?.start ?? due?.end;

interface Cached {
  rollups: Map<TopicId, Rollup>;
}

const cache = new WeakMap<object, Map<string, Cached>>();

/** Date summaries for every topic, cached per topic table and day. */
export function computeRollups(map: CanopyMap, today: string): Map<TopicId, Rollup> {
  const byDay = cache.get(map.topics) ?? new Map<string, Cached>();
  const hit = byDay.get(today);
  if (hit) return hit.rollups;

  const out = new Map<TopicId, Rollup>();
  const order = subtreeOf(map, map.coreId);
  for (const topic of order) out.set(topic.id, empty());

  for (let i = order.length - 1; i >= 0; i--) {
    const topic = order[i];
    if (!topic || topic.parentId === null) continue;
    const mine = out.get(topic.id) ?? empty();
    const parent = out.get(topic.parentId);
    if (!parent) continue;
    const end = endOf(topic.props?.due);
    parent.overdue += mine.overdue + (end !== undefined && end < today ? 1 : 0);
    for (const start of [startOf(topic.props?.due), mine.start]) {
      if (start !== undefined && (!parent.start || start < parent.start)) parent.start = start;
    }
    for (const latest of [end, mine.end]) {
      if (latest !== undefined && (!parent.end || latest > parent.end)) parent.end = latest;
    }
  }

  byDay.set(today, { rollups: out });
  cache.set(map.topics, byDay);
  return out;
}

/** Whether a topic is past its due date. */
export function isOverdue(map: CanopyMap, id: TopicId, today: string): boolean {
  const due = map.topics[id]?.props?.due;
  const end = endOf(due);
  return end !== undefined && end < today;
}
