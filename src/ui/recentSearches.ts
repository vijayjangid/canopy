const KEY = 'canopy.recentSearches';
const MAX = 6;

export function loadRecentSearches(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw)
      ? raw.filter((v): v is string => typeof v === 'string' && v.trim() !== '').slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

function store(list: string[]): string[] {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Without storage, recent searches last for this session only.
  }
  return list;
}

/** Newest first, with no repeats (ignoring case), and only the latest few. */
export function pushRecentSearch(query: string, list: readonly string[] = loadRecentSearches()) {
  const text = query.trim().replace(/\s+/g, ' ');
  if (text === '') return [...list];
  const rest = list.filter((q) => q.toLowerCase() !== text.toLowerCase());
  return store([text, ...rest].slice(0, MAX));
}

export const clearRecentSearches = (): string[] => store([]);
