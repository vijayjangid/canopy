/**
 * Scores how well `query` matches `text`, or returns null for no match. Every character of the
 * query must appear in order. Runs of characters and word starts score higher.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  if (q === '') return 0;
  const t = text.toLowerCase();
  let score = 0;
  let at = -1;
  let run = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, at + 1);
    if (found === -1) return null;
    const wordStart = found === 0 || /[^a-z0-9]/.test(t[found - 1] ?? '');
    run = found === at + 1 ? run + 1 : 0;
    score += 1 + run * 2 + (wordStart ? 4 : 0) - Math.min(found - at - 1, 6) * 0.1;
    at = found;
  }
  // A whole-word or prefix match beats the same letters spread out.
  if (t.startsWith(q)) score += 10;
  else if (t.includes(q)) score += 6;
  return score;
}

/**
 * Whether every word of `query` appears in `text` as letters in order that sit close together, so
 * "rsch" finds "Research" and a short query does not match everything with those letters far apart.
 */
export function fuzzyMatches(query: string, text: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return false;
  const t = text.toLowerCase();
  return terms.every((term) => {
    for (
      let start = t.indexOf(term[0] ?? '');
      start !== -1;
      start = t.indexOf(term[0] ?? '', start + 1)
    ) {
      let at = start;
      let ok = true;
      for (let i = 1; i < term.length; i++) {
        at = t.indexOf(term[i] ?? '', at + 1);
        if (at === -1) {
          ok = false;
          break;
        }
      }
      if (ok && at - start + 1 <= term.length * 1.5 + 3) return true;
    }
    return false;
  });
}
