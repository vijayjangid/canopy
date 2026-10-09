/** Calendar dates as `YYYY-MM-DD` strings in the person's own time zone. Pure and testable with a fixed `now`. */

const pad = (n: number) => String(n).padStart(2, '0');

export const toIso = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Reject dates that roll over, such as 2026-02-31.
  return toIso(d) === iso ? d : null;
}

export const today = (now: Date = new Date()): string => toIso(now);

export function addDays(iso: string, days: number): string {
  const d = fromIso(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** The last working day of this week: Friday, or next Friday when the weekend has started. */
export function endOfWeek(now: Date = new Date()): string {
  const day = now.getDay();
  const ahead = day === 0 ? 5 : day === 6 ? 6 : 5 - day;
  return addDays(toIso(now), ahead);
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const FULL_WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Reads a short date word, relative to `now`: `today`, `tomorrow`, `fri` (the next Friday after
 * today), `+3d`, `+2w`, `eow` (the coming Friday), `eom`, `nextweek` (the coming Monday),
 * `nov1`, `nov-1`, `1nov`, `11/1`, or `2026-11-01`. Returns null when the word is not a date.
 */
export function parseDateWord(word: string, now: Date = new Date()): string | null {
  const w = word
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-');
  if (!w) return null;
  const base = toIso(now);
  if (fromIso(w)) return w;
  if (w === 'today') return base;
  if (w === 'tomorrow' || w === 'tmrw') return addDays(base, 1);
  const weekday = FULL_WEEKDAYS.findIndex((full, i) => w === full || w === WEEKDAYS[i]);
  if (weekday >= 0) {
    const delta = (weekday - now.getDay() + 7) % 7 || 7;
    return addDays(base, delta);
  }
  if (w === 'eow') return addDays(base, (5 - now.getDay() + 7) % 7 || 7);
  if (w === 'nextweek' || w === 'next-week') return addDays(base, (1 - now.getDay() + 7) % 7 || 7);
  if (w === 'eom') {
    return toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }
  let m = /^\+(\d{1,3})([dw])$/.exec(w);
  if (m) return addDays(base, Number(m[1]) * (m[2] === 'w' ? 7 : 1));
  const inYear = (month: number, day: number): string | null => {
    let d = new Date(now.getFullYear(), month, day);
    if (d.getMonth() !== month) return null;
    // A month and day already past means next year.
    if (toIso(d) < base) {
      d = new Date(now.getFullYear() + 1, month, day);
      if (d.getMonth() !== month) return null;
    }
    return toIso(d);
  };
  m = /^([a-z]{3})[a-z]*-?(\d{1,2})$/.exec(w);
  if (m) {
    const month = MONTHS.indexOf(m[1] ?? '');
    return month >= 0 ? inYear(month, Number(m[2])) : null;
  }
  m = /^(\d{1,2})-?([a-z]{3})[a-z]*$/.exec(w);
  if (m) {
    const month = MONTHS.indexOf(m[2] ?? '');
    return month >= 0 ? inYear(month, Number(m[1])) : null;
  }
  m = /^(\d{1,2})[/-](\d{1,2})$/.exec(w);
  if (m) return inYear(Number(m[1]) - 1, Number(m[2]));
  return null;
}

/** `Nov 1`, or `Nov 1, 2027` when the year is not this one. */
export function formatDate(iso: string, now: Date = new Date(), locale?: string): string {
  const d = fromIso(iso);
  if (!d) return iso;
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
