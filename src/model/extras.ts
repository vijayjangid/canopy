import { produce } from 'immer';
import { newId } from './ids';
import { getTopic } from './tree';
import {
  MAX_EDGE_LABEL,
  MAX_EDGE_STICKERS,
  MAX_IMAGE_ALT,
  type CanopyMap,
  type EdgeData,
  type StickerRef,
  type TopicId,
  type TopicImage,
} from './types';

/** Stickers stick to the corners of a topic, so there are four places. */
export const MAX_STICKERS = 4;

/** Sets or clears a topic's note. An empty note is removed from the file. */
export function setNote(map: CanopyMap, id: TopicId, note: string): CanopyMap {
  const topic = getTopic(map, id);
  if ((topic.note ?? '') === note) return map;
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (!t) return;
    if (note === '') delete t.note;
    else t.note = note;
  });
}

/** Whether a list of stickers has this one already. A sticker is on a topic or line only once. */
export const hasSticker = (list: readonly StickerRef[] | undefined, key: string): boolean =>
  list?.some((s) => s.key === key) ?? false;

/** Sticks a sticker on a topic. Returns the map unchanged when it is already there, or when all corners are taken. */
export function addSticker(map: CanopyMap, id: TopicId, key: string): CanopyMap {
  const topic = getTopic(map, id);
  if (hasSticker(topic.stickers, key) || (topic.stickers?.length ?? 0) >= MAX_STICKERS) return map;
  const sticker: StickerRef = { id: newId('s_'), key };
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (t) t.stickers = [...(t.stickers ?? []), sticker];
  });
}

/** Takes a sticker off a topic by its kind. Returns the map unchanged when it is not there. */
export function removeStickerKey(map: CanopyMap, id: TopicId, key: string): CanopyMap {
  const topic = getTopic(map, id);
  if (!hasSticker(topic.stickers, key)) return map;
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (!t?.stickers) return;
    t.stickers = t.stickers.filter((s) => s.key !== key);
    if (t.stickers.length === 0) delete t.stickers;
  });
}

/** Puts a sticker on, or takes it off when it is already on. Full topics refuse a new one. */
export function toggleSticker(map: CanopyMap, id: TopicId, key: string): CanopyMap {
  return hasSticker(getTopic(map, id).stickers, key)
    ? removeStickerKey(map, id, key)
    : addSticker(map, id, key);
}

export function removeSticker(map: CanopyMap, id: TopicId, stickerId: string): CanopyMap {
  const topic = getTopic(map, id);
  if (!topic.stickers?.some((s) => s.id === stickerId)) return map;
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (!t?.stickers) return;
    t.stickers = t.stickers.filter((s) => s.id !== stickerId);
    if (t.stickers.length === 0) delete t.stickers;
  });
}

/** Drops an edge that has neither a label nor stickers, so plain maps stay plain. */
const tidyEdge = (edge: EdgeData | undefined): EdgeData | undefined =>
  edge && (edge.label || edge.stickers?.length) ? edge : undefined;

function withEdge(map: CanopyMap, id: TopicId, change: (edge: EdgeData) => EdgeData): CanopyMap {
  const topic = getTopic(map, id);
  if (topic.parentId === null) return map;
  const next = tidyEdge(change({ ...topic.edge }));
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (!t) return;
    if (next) t.edge = next;
    else delete t.edge;
  });
}

/** Labels the line between a topic and its parent. An empty label clears it. */
export function setEdgeLabel(map: CanopyMap, id: TopicId, label: string): CanopyMap {
  const clean = label.replace(/\s+/g, ' ').slice(0, MAX_EDGE_LABEL);
  if ((getTopic(map, id).edge?.label ?? '') === clean) return map;
  return withEdge(map, id, (edge) => {
    const next = { ...edge };
    if (clean.trim() === '') delete next.label;
    else next.label = clean;
    return next;
  });
}

/** Sticks a sticker on the line to the parent. Returns the map unchanged when the line is full. */
export function addEdgeSticker(map: CanopyMap, id: TopicId, key: string): CanopyMap {
  const topic = getTopic(map, id);
  if (
    topic.parentId === null ||
    hasSticker(topic.edge?.stickers, key) ||
    (topic.edge?.stickers?.length ?? 0) >= MAX_EDGE_STICKERS
  ) {
    return map;
  }
  const sticker: StickerRef = { id: newId('s_'), key };
  return withEdge(map, id, (edge) => ({ ...edge, stickers: [...(edge.stickers ?? []), sticker] }));
}

export function removeEdgeSticker(map: CanopyMap, id: TopicId, stickerId: string): CanopyMap {
  if (!getTopic(map, id).edge?.stickers?.some((s) => s.id === stickerId)) return map;
  return withEdge(map, id, (edge) => {
    const { stickers, ...rest } = edge;
    const left = (stickers ?? []).filter((s) => s.id !== stickerId);
    return left.length > 0 ? { ...rest, stickers: left } : rest;
  });
}

/** Puts a picture on a topic, or takes it off with `null`. */
export function setTopicImage(map: CanopyMap, id: TopicId, image: TopicImage | null): CanopyMap {
  const topic = getTopic(map, id);
  if (image === null && !topic.image) return map;
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (!t) return;
    if (image === null) delete t.image;
    else t.image = image;
  });
}

/** Describes a topic's picture for people who cannot see it. An empty text clears the description. */
export function setImageAlt(map: CanopyMap, id: TopicId, alt: string): CanopyMap {
  const topic = getTopic(map, id);
  if (!topic.image) return map;
  const clean = alt.replace(/\s+/g, ' ').trim().slice(0, MAX_IMAGE_ALT);
  if ((topic.image.alt ?? '') === clean) return map;
  return produce(map, (draft) => {
    const image = draft.topics[id]?.image;
    if (!image) return;
    if (clean === '') delete image.alt;
    else image.alt = clean;
  });
}

/** Takes a sticker off a line by its kind. Returns the map unchanged when it is not there. */
export function removeEdgeStickerKey(map: CanopyMap, id: TopicId, key: string): CanopyMap {
  if (!hasSticker(getTopic(map, id).edge?.stickers, key)) return map;
  return withEdge(map, id, (edge) => {
    const { stickers, ...rest } = edge;
    const left = (stickers ?? []).filter((s) => s.key !== key);
    return left.length > 0 ? { ...rest, stickers: left } : rest;
  });
}

/** Puts a sticker on the line, or takes it off when it is already on. A full line refuses a new one. */
export function toggleEdgeSticker(map: CanopyMap, id: TopicId, key: string): CanopyMap {
  return hasSticker(getTopic(map, id).edge?.stickers, key)
    ? removeEdgeStickerKey(map, id, key)
    : addEdgeSticker(map, id, key);
}
