// Fractional ordering keys: strings compared lexicographically, with a key always
// available strictly between any two keys. Keys never end in the zero digit.

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const BASE = DIGITS.length;
const ZERO = DIGITS.charAt(0);

export function isValidKey(key: string): boolean {
  if (key.length === 0 || key.endsWith(ZERO)) return false;
  for (const c of key) if (!DIGITS.includes(c)) return false;
  return true;
}

function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    let n = 0;
    while ((a[n] ?? ZERO) === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const digitA = a.length > 0 ? DIGITS.indexOf(a.charAt(0)) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b.charAt(0)) : BASE;
  if (digitB - digitA > 1) {
    return DIGITS.charAt(Math.round(0.5 * (digitA + digitB)));
  }
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIGITS.charAt(digitA) + midpoint(a.slice(1), null);
}

/** A key strictly between `a` and `b`. Null means "no lower / upper bound". */
export function keyBetween(a: string | null, b: string | null): string {
  if (a !== null && !isValidKey(a)) throw new Error(`Invalid order key: ${a}`);
  if (b !== null && !isValidKey(b)) throw new Error(`Invalid order key: ${b}`);
  if (a !== null && b !== null && a >= b) throw new Error(`Order keys out of order: ${a} >= ${b}`);
  if (a === null) return b === null ? 'V' : midpoint('', b);
  return midpoint(a, b);
}

/** `count` evenly spaced keys with short, fixed length, for bulk creation (imports). */
export function spreadKeys(count: number): string[] {
  if (count <= 0) return [];
  let width = 1;
  while (BASE ** width < count) width++;
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    let digits = '';
    let rest = i;
    for (let w = 0; w < width; w++) {
      digits = DIGITS.charAt(rest % BASE) + digits;
      rest = Math.floor(rest / BASE);
    }
    keys.push(`${digits}V`);
  }
  return keys;
}
