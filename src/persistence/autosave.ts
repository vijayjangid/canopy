import type { CanopyStore } from '../store/store';
import type { MapRepository } from './repository';

/** `pending` is a change that is waiting for its moment to be written. */
export type SaveStatus = 'pending' | 'saved' | 'saving' | 'error';

export interface Autosave {
  /** Writes any pending change right away. */
  flush: () => Promise<void>;
  dispose: () => void;
}

/**
 * Saves the current map shortly after it is edited, and when the page is hidden.
 * Opening or starting a map is not an edit, so an untouched map is never stored.
 */
export function attachAutosave(
  store: CanopyStore,
  repo: MapRepository,
  opts: { delayMs?: number; onStatus?: (status: SaveStatus) => void } = {},
): Autosave {
  const delayMs = opts.delayMs ?? 500;
  const report = opts.onStatus ?? (() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let chain: Promise<void> = Promise.resolve();

  const write = (snapshot = store.getState()) => {
    timer = undefined;
    if (!dirty) return chain;
    dirty = false;
    const { mapId, doc } = snapshot;
    report('saving');
    chain = chain
      .then(() => repo.put(mapId, doc))
      .then(() => report(dirty ? 'saving' : 'saved'))
      .catch(() => report('error'));
    return chain;
  };

  const unsubscribe = store.subscribe((state, prev) => {
    if (state.mapId !== prev.mapId) {
      // Finish the map being left, then treat the new one as untouched.
      if (timer !== undefined) clearTimeout(timer);
      void write(prev);
      return;
    }
    if (state.doc === prev.doc) return;
    dirty = true;
    report('pending');
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(write, delayMs);
  });

  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush();
  };
  const hasDocument = typeof document !== 'undefined';
  if (hasDocument) document.addEventListener('visibilitychange', onHide);

  async function flush() {
    if (timer !== undefined) clearTimeout(timer);
    await write();
  }

  return {
    flush,
    dispose: () => {
      unsubscribe();
      if (timer !== undefined) clearTimeout(timer);
      if (hasDocument) document.removeEventListener('visibilitychange', onHide);
    },
  };
}
