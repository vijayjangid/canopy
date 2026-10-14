export interface Sticker {
  key: string;
  name: string;
  searchTerms: readonly string[];
}

/** The sticker sheet, in the order it is shown. Artwork lives in `art.tsx`. */
export const STICKERS: readonly Sticker[] = [
  { key: 'home', name: 'Home', searchTerms: ['house'] },
  { key: 'idea', name: 'Idea', searchTerms: ['light bulb', 'brainstorm'] },
  { key: 'bug', name: 'Bug', searchTerms: ['insect', 'issue'] },
  { key: 'love', name: 'Love', searchTerms: ['heart'] },
  { key: 'celebrate', name: 'Celebrate', searchTerms: ['win', 'success', 'party'] },
  { key: 'thumbs-up', name: 'Thumbs up', searchTerms: ['like', 'approve', 'agree'] },
  { key: 'thumbs-down', name: 'Thumbs down', searchTerms: ['dislike', 'reject', 'disagree'] },
  { key: 'check', name: 'Check', searchTerms: ['done', 'complete', 'yes'] },
  { key: 'cross', name: 'Cross', searchTerms: ['no', 'cancel', 'x'] },
  { key: 'warning', name: 'Warning', searchTerms: ['alert', 'caution'] },
  { key: 'question', name: 'Question', searchTerms: ['help', 'unknown'] },
  { key: 'pause', name: 'Pause', searchTerms: ['hold', 'break', 'wait'] },
  { key: 'delay', name: 'Delay', searchTerms: ['clock', 'waiting', 'postponed'] },
  { key: 'flag', name: 'Flag', searchTerms: ['mark', 'important'] },
  { key: 'pin', name: 'Pin', searchTerms: ['location', 'marker'] },
  { key: 'arrow-up', name: 'Arrow up', searchTerms: ['up arrow', 'increase', 'ascending'] },
  { key: 'arrow-down', name: 'Arrow down', searchTerms: ['down arrow', 'decrease', 'descending'] },
  { key: 'p1', name: 'Priority 1', searchTerms: ['p1', 'highest priority'] },
  { key: 'p2', name: 'Priority 2', searchTerms: ['p2'] },
  { key: 'p3', name: 'Priority 3', searchTerms: ['p3'] },
  { key: 'p4', name: 'Priority 4', searchTerms: ['p4', 'lowest priority'] },
  { key: 'monday', name: 'Monday', searchTerms: ['mon'] },
  { key: 'tuesday', name: 'Tuesday', searchTerms: ['tue'] },
  { key: 'wednesday', name: 'Wednesday', searchTerms: ['wed'] },
  { key: 'thursday', name: 'Thursday', searchTerms: ['thu'] },
  { key: 'friday', name: 'Friday', searchTerms: ['fri'] },
  { key: 'saturday', name: 'Saturday', searchTerms: ['sat'] },
  { key: 'sunday', name: 'Sunday', searchTerms: ['sun'] },
];

const BY_KEY = new Map(STICKERS.map((s) => [s.key, s]));

export const isStickerKey = (key: string): boolean => BY_KEY.has(key);

/** What a screen reader says for a sticker. */
export const stickerName = (key: string): string => BY_KEY.get(key)?.name ?? key;

/** Stickers whose name or search terms contain the search text. */
export function searchStickers(query: string): Sticker[] {
  const q = query.trim().toLowerCase();
  return q
    ? STICKERS.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.searchTerms.some((term) => term.toLowerCase().includes(q)),
      )
    : [...STICKERS];
}
