import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { SaveStatus } from '../persistence/autosave';

interface SaveState {
  /** Nothing has been saved or changed since the map opened. */
  status: SaveStatus | 'idle';
  /** When the last save finished, in milliseconds. */
  savedAt: number | null;
}

export const saveStore = createStore<SaveState>(() => ({ status: 'idle', savedAt: null }));

export function reportSave(status: SaveStatus): void {
  saveStore.setState((s) => ({
    status,
    savedAt: status === 'saved' ? Date.now() : s.savedAt,
  }));
}

/** "just now", "12s ago", "3 min ago", "2 h ago" or "3 days ago". */
export function savedAgo(now: number, at: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

/** The text for the badge, and a plainer sentence for screen readers. */
export function saveLabel(
  state: SaveState,
  now: number,
): { text: string; spoken: string; tone: 'quiet' | 'busy' | 'bad' } {
  switch (state.status) {
    case 'pending':
    case 'saving':
      return { text: 'Saving…', spoken: 'Saving', tone: 'busy' };
    case 'error':
      return { text: 'Not saved', spoken: 'Could not save this map', tone: 'bad' };
    case 'saved':
      return {
        text: `Saved ${state.savedAt === null ? '' : savedAgo(now, state.savedAt)}`.trim(),
        spoken: 'Saved',
        tone: 'quiet',
      };
    default:
      return { text: 'Autosave on', spoken: 'Autosave is on', tone: 'quiet' };
  }
}

/** The current time, refreshed every few seconds, so "ago" keeps up. */
export function useNow(everyMs = 5000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

export function useSaveState(): SaveState {
  const status = useStore(saveStore, (s) => s.status);
  const savedAt = useStore(saveStore, (s) => s.savedAt);
  return { status, savedAt };
}
