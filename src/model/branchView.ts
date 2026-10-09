import { ancestorsOf, countTopics, subtreeOf } from './tree';
import type { CanopyMap, TopicId } from './types';

/** A map holding only `rootId` and what is under it, with `rootId` as its Core. */
export function branchOnly(map: CanopyMap, rootId: TopicId): CanopyMap {
  const topics: CanopyMap['topics'] = {};
  for (const t of subtreeOf(map, rootId)) topics[t.id] = t;
  const root = topics[rootId];
  if (root) topics[rootId] = { ...root, parentId: null };
  return { ...map, coreId: rootId, topics };
}

export interface Collapsed {
  /** Topics outside the branch: its parents, their peers, and everything under those. */
  count: number;
  /** The parents from the Core down to the branch's own parent. */
  path: string[];
}

/** What a view of one branch leaves out, to describe it in a single stand-in. */
export function collapsedAbove(map: CanopyMap, rootId: TopicId): Collapsed {
  const above = ancestorsOf(map, rootId)
    .reverse()
    .map((t) => t.title.trim().replace(/\s+/g, ' ') || 'Empty topic');
  return { count: countTopics(map) - subtreeOf(map, rootId).length, path: above };
}
