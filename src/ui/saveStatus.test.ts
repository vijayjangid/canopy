import { describe, expect, it } from 'vitest';
import { saveLabel, savedAgo } from './saveStatus';

describe('savedAgo', () => {
  const t0 = 1_000_000;
  it('reads naturally from seconds to days', () => {
    expect(savedAgo(t0 + 2_000, t0)).toBe('just now');
    expect(savedAgo(t0 + 12_000, t0)).toBe('12s ago');
    expect(savedAgo(t0 + 3 * 60_000, t0)).toBe('3 min ago');
    expect(savedAgo(t0 + 2 * 3_600_000, t0)).toBe('2 h ago');
    expect(savedAgo(t0 + 86_400_000, t0)).toBe('1 day ago');
    expect(savedAgo(t0 + 3 * 86_400_000, t0)).toBe('3 days ago');
  });
});

describe('saveLabel', () => {
  const now = 5_000_000;
  it('says what is happening', () => {
    expect(saveLabel({ status: 'idle', savedAt: null }, now).text).toBe('Autosave on');
    expect(saveLabel({ status: 'pending', savedAt: null }, now).text).toBe('Saving…');
    expect(saveLabel({ status: 'saving', savedAt: null }, now).tone).toBe('busy');
    expect(saveLabel({ status: 'saved', savedAt: now - 30_000 }, now).text).toBe('Saved 30s ago');
    expect(saveLabel({ status: 'error', savedAt: now }, now).tone).toBe('bad');
  });
});
