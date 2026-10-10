import { produce } from 'immer';
import { newId } from './ids';
import { keyBetween } from './order';
import { childrenOf, getTopic, hasChildren, isWithin, siblingsOf, subtreeOf } from './tree';
import {
  ModelError,
  SCHEMA,
  type CanopyMap,
  type MapPrefs,
  type Topic,
  type TopicId,
} from './types';

export const DEFAULT_PREFS: MapPrefs = {
  flow: 'right',
  density: 'comfortable',
  showLevels: false,
  look: 'minimal',
  chips: 'compact',
};

export interface CreateOptions {
  title?: string;
  /** Mainly for tests and imports. Must be unused in the map. */
  id?: TopicId;
}

export interface CreateResult {
  map: CanopyMap;
  id: TopicId;
}

export function createMap(
  opts: { title?: string; coreTitle?: string; coreId?: TopicId; now?: string } = {},
): CanopyMap {
  const now = opts.now ?? new Date().toISOString();
  const coreId = opts.coreId ?? newId();
  return {
    schema: SCHEMA,
    meta: { title: opts.title ?? 'Untitled map', created: now, modified: now },
    prefs: { ...DEFAULT_PREFS },
    coreId,
    topics: {
      [coreId]: {
        id: coreId,
        parentId: null,
        orderKey: keyBetween(null, null),
        title: opts.coreTitle ?? 'Central topic',
        folded: false,
      },
    },
  };
}

function insertTopic(
  map: CanopyMap,
  parentId: TopicId,
  orderKey: string,
  opts: CreateOptions,
): CreateResult {
  const id = opts.id ?? newId();
  if (map.topics[id]) throw new ModelError('DUPLICATE_ID', `Topic ID already in use: ${id}`);
  const next = produce(map, (draft) => {
    draft.topics[id] = { id, parentId, orderKey, title: opts.title ?? '', folded: false };
    const parent = draft.topics[parentId];
    if (parent) parent.folded = false;
  });
  return { map: next, id };
}

export function createSubTopic(
  map: CanopyMap,
  parentId: TopicId,
  opts: CreateOptions & { position?: 'first' | 'last' } = {},
): CreateResult {
  getTopic(map, parentId);
  const siblings = childrenOf(map, parentId);
  const orderKey =
    opts.position === 'first'
      ? keyBetween(null, siblings[0]?.orderKey ?? null)
      : keyBetween(siblings[siblings.length - 1]?.orderKey ?? null, null);
  return insertTopic(map, parentId, orderKey, opts);
}

export function canCreatePeer(map: CanopyMap, id: TopicId): boolean {
  return getTopic(map, id).parentId !== null;
}

export function createPeer(
  map: CanopyMap,
  siblingId: TopicId,
  placement: 'before' | 'after',
  opts: CreateOptions = {},
): CreateResult {
  const sibling = getTopic(map, siblingId);
  if (sibling.parentId === null) {
    throw new ModelError('CORE_IMMUTABLE', 'The Core has no peers');
  }
  const siblings = siblingsOf(map, siblingId);
  const at = siblings.findIndex((t) => t.id === siblingId);
  const orderKey =
    placement === 'before'
      ? keyBetween(siblings[at - 1]?.orderKey ?? null, sibling.orderKey)
      : keyBetween(sibling.orderKey, siblings[at + 1]?.orderKey ?? null);
  return insertTopic(map, sibling.parentId, orderKey, opts);
}

/**
 * Adds a topic under `parentId` and moves `childIds` down under it, so it sits between them and
 * the parent. It takes the place of the first topic it adopts. Their order and sub-topics stay.
 */
export function insertBetween(
  map: CanopyMap,
  parentId: TopicId,
  childIds: readonly TopicId[],
  opts: CreateOptions = {},
): CreateResult {
  getTopic(map, parentId);
  const wanted = new Set(childIds);
  const kids = childrenOf(map, parentId);
  const moving = kids.filter((t) => wanted.has(t.id));
  const first = moving[0];
  if (!first || moving.length !== wanted.size) {
    throw new ModelError('INVALID_ARGUMENT', 'Topics to move down must be children of the parent');
  }
  const before = kids
    .slice(0, kids.indexOf(first))
    .filter((t) => !wanted.has(t.id))
    .at(-1);
  const created = insertTopic(
    map,
    parentId,
    keyBetween(before?.orderKey ?? null, first.orderKey),
    opts,
  );
  const next = produce(created.map, (draft) => {
    for (const t of moving) {
      const moved = draft.topics[t.id];
      if (moved) moved.parentId = created.id;
    }
  });
  return { map: next, id: created.id };
}

export function renameTopic(map: CanopyMap, id: TopicId, title: string): CanopyMap {
  if (getTopic(map, id).title === title) return map;
  return produce(map, (draft) => {
    const topic = draft.topics[id];
    if (topic) topic.title = title;
  });
}

export function deleteBranch(map: CanopyMap, id: TopicId): CanopyMap {
  const topic = getTopic(map, id);
  if (topic.parentId === null) throw new ModelError('CORE_IMMUTABLE', 'The Core cannot be deleted');
  const doomed = subtreeOf(map, id);
  const doomedIds = new Set(doomed.map((t) => t.id));
  return produce(map, (draft) => {
    for (const t of doomed) delete draft.topics[t.id];
    for (const remaining of Object.values(draft.topics)) {
      dropReferences(remaining, (to) => doomedIds.has(to));
    }
  });
}

/** Takes out of a topic the references that `drop` says to, and the list itself when it empties. */
function dropReferences(topic: Topic, drop: (to: TopicId) => boolean): void {
  if (!topic.references) return;
  const kept = topic.references.filter((to) => !drop(to));
  if (kept.length === topic.references.length) return;
  if (kept.length > 0) topic.references = kept;
  else delete topic.references;
}

/**
 * Points a topic at another topic without changing either topic's place in the tree. A topic can
 * point at several, and several can point at one. Pointing at a topic it already points at does
 * nothing.
 */
export function addTopicReference(map: CanopyMap, sourceId: TopicId, targetId: TopicId): CanopyMap {
  const source = getTopic(map, sourceId);
  if (targetId === sourceId) {
    throw new ModelError('INVALID_ARGUMENT', 'A topic cannot reference itself');
  }
  getTopic(map, targetId);
  if (source.references?.includes(targetId)) return map;
  return produce(map, (draft) => {
    const topic = draft.topics[sourceId];
    if (topic) topic.references = [...(topic.references ?? []), targetId];
  });
}

/** Removes one reference from a topic. Does nothing when it is not there. */
export function removeTopicReference(
  map: CanopyMap,
  sourceId: TopicId,
  targetId: TopicId,
): CanopyMap {
  if (!getTopic(map, sourceId).references?.includes(targetId)) return map;
  return produce(map, (draft) => {
    const topic = draft.topics[sourceId];
    if (topic) dropReferences(topic, (to) => to === targetId);
  });
}

/** Removes every reference a topic makes. */
export function clearTopicReferences(map: CanopyMap, sourceId: TopicId): CanopyMap {
  if (!getTopic(map, sourceId).references) return map;
  return produce(map, (draft) => {
    const topic = draft.topics[sourceId];
    if (topic) delete topic.references;
  });
}

/**
 * Removes one topic and lifts its sub-topics into its place under its parent, in the same order,
 * so nothing below it is lost. Anything that referenced the topic loses that reference.
 */
export function deleteNode(map: CanopyMap, id: TopicId): CanopyMap {
  const topic = getTopic(map, id);
  if (topic.parentId === null) throw new ModelError('CORE_IMMUTABLE', 'The Core cannot be deleted');
  const lifted = childrenOf(map, id);
  const siblings = siblingsOf(map, id);
  const at = siblings.findIndex((t) => t.id === id);
  const next = siblings[at + 1]?.orderKey ?? null;
  // Keys that fall between the neighbours, one after the other, so the order is kept.
  let before = siblings[at - 1]?.orderKey ?? null;
  const keys = lifted.map(() => (before = keyBetween(before, next)));
  const parentId = topic.parentId;
  return produce(map, (draft) => {
    lifted.forEach((kid, i) => {
      const moved = draft.topics[kid.id];
      if (!moved) return;
      moved.parentId = parentId;
      moved.orderKey = keys[i] ?? moved.orderKey;
    });
    delete draft.topics[id];
    for (const other of Object.values(draft.topics)) {
      dropReferences(other, (to) => to === id);
    }
    const parent = draft.topics[parentId];
    if (parent) parent.folded = false;
  });
}

export interface MoveTarget {
  parentId: TopicId;
  /** Position among the target's children, counted without the moved branch. Clamped to range. */
  index: number;
}

export function moveBranch(map: CanopyMap, id: TopicId, target: MoveTarget): CanopyMap {
  const topic = getTopic(map, id);
  if (topic.parentId === null) throw new ModelError('CORE_IMMUTABLE', 'The Core cannot be moved');
  getTopic(map, target.parentId);
  if (isWithin(map, id, target.parentId)) {
    throw new ModelError('CYCLE', 'A branch cannot be moved into itself');
  }
  if (!Number.isFinite(target.index)) {
    throw new ModelError('INVALID_ARGUMENT', 'Move index must be a finite number');
  }

  const others = childrenOf(map, target.parentId).filter((t) => t.id !== id);
  const index = Math.min(Math.max(Math.trunc(target.index), 0), others.length);
  if (topic.parentId === target.parentId) {
    const current = childrenOf(map, target.parentId).findIndex((t) => t.id === id);
    if (current === index) return map;
  }

  const orderKey = keyBetween(others[index - 1]?.orderKey ?? null, others[index]?.orderKey ?? null);
  return produce(map, (draft) => {
    const moved = draft.topics[id];
    if (moved) {
      moved.parentId = target.parentId;
      moved.orderKey = orderKey;
    }
    const parent = draft.topics[target.parentId];
    if (parent) parent.folded = false;
  });
}

/** Moves a topic one place among its peers. Does nothing at either end. */
export function moveSibling(map: CanopyMap, id: TopicId, delta: -1 | 1): CanopyMap {
  const topic = getTopic(map, id);
  if (topic.parentId === null) return map;
  const at = siblingsOf(map, id).findIndex((t) => t.id === id);
  const target = at + delta;
  if (target < 0 || target >= siblingsOf(map, id).length) return map;
  return moveBranch(map, id, { parentId: topic.parentId, index: target });
}

export function duplicateBranch(map: CanopyMap, id: TopicId): CreateResult {
  const root = getTopic(map, id);
  if (root.parentId === null) {
    throw new ModelError('CORE_IMMUTABLE', 'The Core cannot be duplicated');
  }
  const siblings = siblingsOf(map, id);
  const at = siblings.findIndex((t) => t.id === id);
  const rootKey = keyBetween(root.orderKey, siblings[at + 1]?.orderKey ?? null);

  const ids = new Map<TopicId, TopicId>();
  const copies = subtreeOf(map, id).map((t): Topic => {
    const copyId = newId();
    ids.set(t.id, copyId);
    return { ...t, id: copyId };
  });
  const rootCopyId = ids.get(id);
  if (!rootCopyId) throw new ModelError('NOT_FOUND', `Topic not found: ${id}`);

  const next = produce(map, (draft) => {
    for (const copy of copies) {
      const isRoot = copy.id === rootCopyId;
      const parentId = isRoot ? root.parentId : ((copy.parentId && ids.get(copy.parentId)) ?? null);
      draft.topics[copy.id] = { ...copy, parentId, orderKey: isRoot ? rootKey : copy.orderKey };
    }
  });
  return { map: next, id: rootCopyId };
}

export function setFolded(map: CanopyMap, id: TopicId, folded: boolean): CanopyMap {
  const topic = getTopic(map, id);
  if (topic.folded === folded) return map;
  if (folded && !hasChildren(map, id)) return map;
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (t) t.folded = folded;
  });
}

export function toggleFold(map: CanopyMap, id: TopicId): CanopyMap {
  return setFolded(map, id, !getTopic(map, id).folded);
}

/** Shows Levels 0 to `level` and folds every branch below. `level` is at least 1. */
export function foldToLevel(map: CanopyMap, level: number): CanopyMap {
  const limit = Math.max(1, Math.trunc(level));
  const depths = new Map<TopicId, number>();
  const stack: Array<[TopicId, number]> = [[map.coreId, 0]];
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) break;
    depths.set(entry[0], entry[1]);
    for (const kid of childrenOf(map, entry[0])) stack.push([kid.id, entry[1] + 1]);
  }
  return produce(map, (draft) => {
    for (const [id, depth] of depths) {
      const topic = draft.topics[id];
      if (topic) topic.folded = depth >= limit && hasChildren(map, id);
    }
  });
}

export function unfoldAll(map: CanopyMap): CanopyMap {
  return produce(map, (draft) => {
    for (const topic of Object.values(draft.topics)) topic.folded = false;
  });
}

/** Changes how the map looks or flows. Nothing about its content changes. */
export function setPrefs(map: CanopyMap, patch: Partial<MapPrefs>): CanopyMap {
  return produce(map, (draft) => {
    Object.assign(draft.prefs, patch);
  });
}
