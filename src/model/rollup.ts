import { statusDef } from './planning';
import { subtreeOf } from './tree';
import type { CanopyMap, StatusCategory, TopicId } from './types';

export interface Rollup {
  /** Sub-topics (at any depth) that have a status. */
  withStatus: number;
  byCategory: Record<StatusCategory, number>;
  /** Sub-topics past their due date and not complete or canceled. */
  overdue: number;
  /** Earliest start and latest end among the sub-topics. */
  start?: string;
  end?: string;
}

const empty = (): Rollup => ({
  withStatus: 0,
  byCategory: { todo: 0, active: 0, complete: 0, canceled: 0 },
  overdue: 0,
});

const endOf = (due: { start?: string; end?: string } | undefined) => due?.end ?? due?.start;
const startOf = (due: { start?: string; end?: string } | undefined) => due?.start ?? due?.end;

interface Cached {
  planning: unknown;
  rollups: Map<TopicId, Rollup>;
}

const cache = new WeakMap<object, Map<string, Cached>>();

/**
 * Summaries for every topic, in one pass from the leaves up. Cached per topic table and day, so
 * selecting and panning cost nothing, and an edit costs one linear pass.
 */
export function computeRollups(map: CanopyMap, today: string): Map<TopicId, Rollup> {
  const byDay = cache.get(map.topics) ?? new Map<string, Cached>();
  const hit = byDay.get(today);
  if (hit && hit.planning === map.planning) return hit.rollups;

  const out = new Map<TopicId, Rollup>();
  const order = subtreeOf(map, map.coreId);
  for (const t of order) out.set(t.id, empty());

  for (let i = order.length - 1; i >= 0; i--) {
    const topic = order[i];
    if (!topic || topic.parentId === null) continue;
    const mine = out.get(topic.id) ?? empty();
    const parent = out.get(topic.parentId);
    if (!parent) continue;
    const props = topic.props;
    const category = statusDef(map, props?.status)?.category;
    if (category) {
      parent.withStatus += 1;
      parent.byCategory[category] += 1;
    }
    parent.withStatus += mine.withStatus;
    for (const c of Object.keys(mine.byCategory) as StatusCategory[]) {
      parent.byCategory[c] += mine.byCategory[c];
    }
    const finished = category === 'complete' || category === 'canceled';
    const end = endOf(props?.due);
    parent.overdue += mine.overdue + (end !== undefined && end < today && !finished ? 1 : 0);
    for (const s of [startOf(props?.due), mine.start]) {
      if (s !== undefined && (!parent.start || s < parent.start)) parent.start = s;
    }
    for (const e of [end, mine.end]) {
      if (e !== undefined && (!parent.end || e > parent.end)) parent.end = e;
    }
  }

  byDay.set(today, { planning: map.planning, rollups: out });
  cache.set(map.topics, byDay);
  return out;
}

/** Whether a topic is past its due date and still open. */
export function isOverdue(map: CanopyMap, id: TopicId, today: string): boolean {
  const props = map.topics[id]?.props;
  const end = endOf(props?.due);
  if (end === undefined || end >= today) return false;
  const category = statusDef(map, props?.status)?.category;
  return category !== 'complete' && category !== 'canceled';
}
