import { produce } from 'immer';
import { newId } from './ids';
import { keyBetween } from './order';
import { DEFAULT_PLANNING, planningOf } from './planning';
import { childrenOf, getTopic, subtreeOf } from './tree';
import type { CanopyMap, PlanningConfig, Topic, TopicId } from './types';

/** The Core's name in a new map. A map still carrying it is named by its title instead. */
const DEFAULT_CORE_TITLE = 'Central topic';

export interface GraftResult {
  map: CanopyMap;
  /** The new top of the branch, which was the other map's Core. */
  id: TopicId;
  /** How many topics were added. */
  count: number;
}

/** The name the other map's Core gets once it is a branch. */
export function graftTitle(source: CanopyMap): string {
  const core = getTopic(source, source.coreId).title.trim();
  const named = source.meta.title.trim();
  if (core !== '' && !(core === DEFAULT_CORE_TITLE && named !== '')) return core;
  return named || core || 'Imported map';
}

/** Status and tag choices the imported topics use that this map does not have yet. */
function mergePlanning(target: CanopyMap, source: CanopyMap, topics: readonly Topic[]) {
  const wantedStatus = new Set<string>();
  const wantedTags = new Set<string>();
  for (const t of topics) {
    if (t.props?.status) wantedStatus.add(t.props.status);
    for (const tag of t.props?.tags ?? []) wantedTags.add(tag);
  }
  const have = planningOf(target);
  const there = planningOf(source);
  const statuses = there.statusSet.filter(
    (s) => wantedStatus.has(s.key) && !have.statusSet.some((h) => h.key === s.key),
  );
  const tags = there.tags.filter(
    (t) => wantedTags.has(t.key) && !have.tags.some((h) => h.key === t.key),
  );
  if (statuses.length === 0 && tags.length === 0) return target.planning;
  const next: PlanningConfig = {
    statusSet: [...(target.planning ?? DEFAULT_PLANNING).statusSet, ...statuses],
    tags: [...(target.planning ?? DEFAULT_PLANNING).tags, ...tags],
  };
  return next;
}

/**
 * Adds a whole other map under `parentId` as a new last branch, with new IDs throughout. The other
 * map's Core becomes the top of the branch. Notes, stickers, pictures, lines, properties and fold
 * state come along, and so do the statuses and tags its topics use. References between its own
 * topics are kept. A reference to anything else cannot be kept and is dropped.
 */
export function graftMap(map: CanopyMap, parentId: TopicId, source: CanopyMap): GraftResult {
  const parent = getTopic(map, parentId);
  const topics = subtreeOf(source, source.coreId);
  const ids = new Map<TopicId, TopicId>(topics.map((t) => [t.id, newId()]));
  const rootId = ids.get(source.coreId) as TopicId;
  const last = childrenOf(map, parent.id).at(-1);
  const rootKey = keyBetween(last?.orderKey ?? null, null);
  const planning = mergePlanning(map, source, topics);

  const next = produce(map, (draft) => {
    for (const t of topics) {
      const id = ids.get(t.id) as TopicId;
      const isRoot = t.id === source.coreId;
      const { referenceTo, ...rest } = t;
      const topic: Topic = {
        ...rest,
        id,
        parentId: isRoot ? parent.id : (ids.get(t.parentId ?? '') ?? null),
        orderKey: isRoot ? rootKey : t.orderKey,
        title: isRoot ? graftTitle(source) : t.title,
        folded: t.folded && childrenOf(source, t.id).length > 0,
      };
      const target = referenceTo ? ids.get(referenceTo) : undefined;
      if (target) topic.referenceTo = target;
      delete (topic as Partial<Topic>).edge;
      if (t.edge && !isRoot) topic.edge = t.edge;
      draft.topics[id] = topic;
    }
    const top = draft.topics[parent.id];
    if (top) top.folded = false;
    if (planning && planning !== map.planning) draft.planning = planning;
  });
  return { map: next, id: rootId, count: topics.length };
}
