import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export interface FileDropState {
  /** True while files are being dragged over the map. */
  active: boolean;
  /** The topic they would land on, or null for the map itself (its Core). */
  target: string | null;
  /** What dropping would do, in words. */
  label: string;
}

const IDLE: FileDropState = { active: false, target: null, label: '' };

export const fileDropStore = createStore<FileDropState>(() => IDLE);

/** Sets the state only when it changed, because dragover repeats many times a second. */
export function setFileDrop(next: FileDropState): void {
  const now = fileDropStore.getState();
  if (now.active === next.active && now.target === next.target && now.label === next.label) return;
  fileDropStore.setState(next, true);
}

export const clearFileDrop = () => setFileDrop(IDLE);

export function useFileDropState<T>(selector: (state: FileDropState) => T): T {
  return useStore(fileDropStore, selector);
}
