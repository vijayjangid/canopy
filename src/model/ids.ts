const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Short random ID, e.g. `t_k3j9x0a2qz`. Topics use `t_`, maps use `m_`. */
export function newId(prefix = 't_'): string {
  const bytes = new Uint8Array(10);
  globalThis.crypto.getRandomValues(bytes);
  let out = prefix;
  for (const b of bytes) out += ALPHABET.charAt(b % ALPHABET.length);
  return out;
}
