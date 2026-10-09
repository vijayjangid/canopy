import { produce } from 'immer';
import { newId } from './ids';
import { getTopic } from './tree';
import {
  MAX_EDGE_LABEL,
  MAX_EDGE_STICKERS,
  type CanopyMap,
  type EdgeData,
  type StickerRef,
  type TopicId,
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

/** Sticks a sticker on a topic. Returns the map unchanged when all corners are taken. */
export function addSticker(map: CanopyMap, id: TopicId, key: string): CanopyMap {
  const topic = getTopic(map, id);
  if ((topic.stickers?.length ?? 0) >= MAX_STICKERS) return map;
  const sticker: StickerRef = { id: newId('s_'), key };
  return produce(map, (draft) => {
    const t = draft.topics[id];
    if (t) t.stickers = [...(t.stickers ?? []), sticker];
  });
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
  if (topic.parentId === null || (topic.edge?.stickers?.length ?? 0) >= MAX_EDGE_STICKERS)
    return map;
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
