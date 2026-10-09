import { createStore } from 'zustand/vanilla';

interface AnnouncerState {
  message: string;
  seq: number;
}

/** What assistive technology should hear next. Rendered by `LiveRegion`. */
export const announcerStore = createStore<AnnouncerState>(() => ({ message: '', seq: 0 }));

export function announce(message: string): void {
  announcerStore.setState((s) => ({ message, seq: s.seq + 1 }));
}
