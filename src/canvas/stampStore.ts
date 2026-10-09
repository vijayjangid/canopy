import type { StickerRef } from '../model';

const fresh = new Set<string>();

/** True for a sticker that was just put on, which is drawn landing like a stamp. */
export const isFresh = (id: string): boolean => fresh.has(id);

/** Remembers the stickers that `after` has and `before` did not, for a moment. */
export function markFresh(
  before: readonly StickerRef[] | undefined,
  after: readonly StickerRef[] | undefined,
): void {
  const known = new Set((before ?? []).map((s) => s.id));
  const added = (after ?? []).filter((s) => !known.has(s.id)).map((s) => s.id);
  for (const id of added) fresh.add(id);
  if (added.length > 0) setTimeout(() => added.forEach((id) => fresh.delete(id)), 1200);
}
