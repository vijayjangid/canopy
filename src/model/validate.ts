import { isValidKey } from './order';
import { childrenOf } from './tree';
import { SCHEMA, type CanopyMap, type TopicId } from './types';

/** Returns a list of invariant violations. An empty list means the map is valid. */
export function validateMap(map: CanopyMap): string[] {
  const errors: string[] = [];
  if (map.schema !== SCHEMA) errors.push(`Unknown schema: ${String(map.schema)}`);

  const topics = Object.values(map.topics);
  const roots = topics.filter((t) => t.parentId === null);
  if (roots.length !== 1) errors.push(`Expected exactly one Core, found ${roots.length}`);
  if (map.topics[map.coreId]?.parentId !== null) errors.push('coreId must point at the Core');

  for (const [key, topic] of Object.entries(map.topics)) {
    if (topic.id !== key) errors.push(`Topic ${key} has mismatched id ${topic.id}`);
    if (topic.parentId !== null && !map.topics[topic.parentId]) {
      errors.push(`Topic ${key} has missing parent ${topic.parentId}`);
    }
    for (const to of topic.references ?? []) {
      if (!map.topics[to]) errors.push(`Topic ${key} references missing topic ${to}`);
      if (to === topic.id) errors.push(`Topic ${key} cannot reference itself`);
    }
    if (!isValidKey(topic.orderKey)) errors.push(`Topic ${key} has invalid order key`);
  }

  // Every topic must reach the Core, which also rules out cycles.
  const reachable = new Set<TopicId>();
  const stack: TopicId[] = [map.coreId];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || reachable.has(id)) continue;
    reachable.add(id);
    for (const kid of childrenOf(map, id)) stack.push(kid.id);
  }
  if (reachable.size !== topics.length) {
    errors.push(`${topics.length - reachable.size} topic(s) are unreachable from the Core`);
  }

  const seenKeys = new Set<string>();
  for (const topic of topics) {
    const slot = `${topic.parentId}:${topic.orderKey}`;
    if (seenKeys.has(slot)) errors.push(`Duplicate order key among siblings of ${topic.parentId}`);
    seenKeys.add(slot);
  }
  return errors;
}
