export interface Sticker {
  key: string;
  name: string;
}

/** The sticker sheet, in the order it is shown. Artwork lives in `art.tsx`. */
export const STICKERS: readonly Sticker[] = [
  { key: 'star', name: 'Star' },
  { key: 'heart', name: 'Heart' },
  { key: 'bolt', name: 'Bolt' },
  { key: 'fire', name: 'Hot' },
  { key: 'idea', name: 'Idea' },
  { key: 'rocket', name: 'Launch' },
  { key: 'party', name: 'Party' },
  { key: 'win', name: 'Win' },
  { key: 'done', name: 'Done' },
  { key: 'no', name: 'No' },
  { key: 'question', name: 'Question' },
  { key: 'alert', name: 'Alert' },
  { key: 'flag', name: 'Flag' },
  { key: 'pin', name: 'Pin' },
  { key: 'bookmark', name: 'Bookmark' },
  { key: 'bell', name: 'Bell' },
  { key: 'clock', name: 'Clock' },
  { key: 'happy', name: 'Happy' },
  { key: 'gem', name: 'Gem' },
  { key: 'sprout', name: 'Sprout' },
  { key: 'sun', name: 'Sunny' },
  { key: 'cloud', name: 'Cloud' },
  { key: 'coffee', name: 'Coffee' },
];

const BY_KEY = new Map(STICKERS.map((s) => [s.key, s]));

/** What a screen reader says for a sticker. */
export const stickerName = (key: string): string => BY_KEY.get(key)?.name ?? key;

/** Stickers whose name contains the search text. */
export function searchStickers(query: string): Sticker[] {
  const q = query.trim().toLowerCase();
  return q ? STICKERS.filter((s) => s.name.toLowerCase().includes(q)) : [...STICKERS];
}
