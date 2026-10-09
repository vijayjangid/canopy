import { ModelError, type CanopyMap, type Topic, type TopicId } from './types';

type ChildIndex = Map<TopicId, Topic[]>;

// Keyed by the topics table so the index is rebuilt only after an edit.
const indexCache = new WeakMap<object, ChildIndex>();

export function compareTopics(a: Topic, b: Topic): number {
  if (a.orderKey !== b.orderKey) return a.orderKey < b.orderKey ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function childIndex(map: CanopyMap): ChildIndex {
  const cached = indexCache.get(map.topics);
  if (cached) return cached;
  const index: ChildIndex = new Map();
  for (const topic of Object.values(map.topics)) {
    if (topic.parentId === null) continue;
    const list = index.get(topic.parentId);
    if (list) list.push(topic);
    else index.set(topic.parentId, [topic]);
  }
  for (const list of index.values()) list.sort(compareTopics);
  indexCache.set(map.topics, index);
  return index;
}

const NONE: readonly Topic[] = [];

export function getTopic(map: CanopyMap, id: TopicId): Topic {
  const topic = map.topics[id];
  if (!topic) throw new ModelError('NOT_FOUND', `Topic not found: ${id}`);
  return topic;
}

export function hasTopic(map: CanopyMap, id: TopicId): boolean {
  return map.topics[id] !== undefined;
}

export function countTopics(map: CanopyMap): number {
  return Object.keys(map.topics).length;
}

/** Children in display order. */
export function childrenOf(map: CanopyMap, id: TopicId): readonly Topic[] {
  return childIndex(map).get(id) ?? NONE;
}

export function hasChildren(map: CanopyMap, id: TopicId): boolean {
  return childrenOf(map, id).length > 0;
}

export function parentOf(map: CanopyMap, id: TopicId): Topic | null {
  const { parentId } = getTopic(map, id);
  return parentId === null ? null : getTopic(map, parentId);
}

/** Siblings in display order, including the topic itself. The Core has none. */
export function siblingsOf(map: CanopyMap, id: TopicId): readonly Topic[] {
  const { parentId } = getTopic(map, id);
  return parentId === null ? NONE : childrenOf(map, parentId);
}

/** Ancestors from the parent up to the Core. */
export function ancestorsOf(map: CanopyMap, id: TopicId): Topic[] {
  const out: Topic[] = [];
  const seen = new Set<TopicId>([id]);
  let current = getTopic(map, id).parentId;
  while (current !== null && !seen.has(current)) {
    seen.add(current);
    const topic = getTopic(map, current);
    out.push(topic);
    current = topic.parentId;
  }
  return out;
}

/** Level of a topic: the Core is 0. */
export function depthOf(map: CanopyMap, id: TopicId): number {
  return ancestorsOf(map, id).length;
}

/** True when `id` is `ancestorId` itself or lies below it. */
export function isWithin(map: CanopyMap, ancestorId: TopicId, id: TopicId): boolean {
  if (ancestorId === id) return true;
  return ancestorsOf(map, id).some((t) => t.id === ancestorId);
}

/** The topic and all of its descendants, in preorder. */
export function subtreeOf(map: CanopyMap, id: TopicId): Topic[] {
  const out: Topic[] = [];
  const stack: Topic[] = [getTopic(map, id)];
  while (stack.length > 0) {
    const topic = stack.pop();
    if (!topic) break;
    out.push(topic);
    const kids = childrenOf(map, topic.id);
    for (let i = kids.length - 1; i >= 0; i--) {
      const kid = kids[i];
      if (kid) stack.push(kid);
    }
  }
  return out;
}

/** Topics that are on screen: preorder, skipping everything below a folded topic. */
export function visibleTopics(map: CanopyMap): Topic[] {
  const out: Topic[] = [];
  const stack: Topic[] = [getTopic(map, map.coreId)];
  while (stack.length > 0) {
    const topic = stack.pop();
    if (!topic) break;
    out.push(topic);
    if (topic.folded) continue;
    const kids = childrenOf(map, topic.id);
    for (let i = kids.length - 1; i >= 0; i--) {
      const kid = kids[i];
      if (kid) stack.push(kid);
    }
  }
  return out;
}

/** Where selection should go after `id` is deleted: next peer, else previous peer, else parent. */
export function selectionAfterDelete(map: CanopyMap, id: TopicId): TopicId {
  const topic = getTopic(map, id);
  if (topic.parentId === null) return topic.id;
  const siblings = siblingsOf(map, id);
  const at = siblings.findIndex((t) => t.id === id);
  return (siblings[at + 1] ?? siblings[at - 1])?.id ?? topic.parentId;
}

/** How many topics sit below each topic that has any. Topics without descendants are left out. */
export function descendantCounts(map: CanopyMap): Map<TopicId, number> {
  const order = subtreeOf(map, map.coreId);
  const counts = new Map<TopicId, number>();
  // Children follow their parent in preorder, so adding up from the end finishes each child first.
  for (let i = order.length - 1; i >= 0; i--) {
    const topic = order[i];
    if (!topic || topic.parentId === null) continue;
    counts.set(topic.parentId, (counts.get(topic.parentId) ?? 0) + 1 + (counts.get(topic.id) ?? 0));
  }
  return counts;
}
