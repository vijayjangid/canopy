import { createStore } from 'zustand/vanilla';
import { canopyStore } from '../store';

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
  /** Undo depth when it appeared. If the map changes again the toast no longer applies. */
  pastLength: number;
}

const VISIBLE_MS = 6000;

export const toastStore = createStore<{ toast: Toast | null }>(() => ({ toast: null }));

let timer: ReturnType<typeof setTimeout> | undefined;
let counter = 0;

export function dismissToast(): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  if (toastStore.getState().toast) toastStore.setState({ toast: null });
}

export function showToast(message: string, action?: Toast['action']): void {
  if (timer !== undefined) clearTimeout(timer);
  toastStore.setState({
    toast: { id: ++counter, message, action, pastLength: canopyStore.getState().past.length },
  });
  timer = setTimeout(dismissToast, VISIBLE_MS);
}

// An Undo button must not outlive the change it undoes.
canopyStore.subscribe((state) => {
  const toast = toastStore.getState().toast;
  if (toast?.action && state.past.length !== toast.pastLength) dismissToast();
});
