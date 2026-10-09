import type { ReactNode } from 'react';

/** Marks the parts of a name that the search words matched. */
export function highlight(text: string, query: string): ReactNode {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return text;
  const lower = text.toLowerCase();
  const mark = new Array<boolean>(text.length).fill(false);
  for (const word of words) {
    const at = lower.indexOf(word);
    if (at >= 0) for (let i = at; i < at + word.length; i++) mark[i] = true;
  }
  const parts: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && mark[j] === mark[i]) j++;
    const piece = text.slice(i, j);
    parts.push(mark[i] ? <mark key={i}>{piece}</mark> : piece);
    i = j;
  }
  return parts;
}
