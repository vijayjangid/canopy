import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { newId, type TopicId } from '../model';
import type { GrowthKind, GrowthSlot } from './growth';

/** Grace period so the pointer can cross the gap between a topic and its handles. */
const LEAVE_DELAY_MS = 200;

export interface GrowthState {
  /** Topic the pointer is over, or whose handles it is using. */
  hoverId: TopicId | null;
  /** The slot being previewed as a ghost topic. */
  slot: GrowthSlot | null;
  /** Topic whose handle started the current drag. */
  dragOrigin: TopicId | null;
  canvasFocused: boolean;
  /** Folded topic whose Fold Badge is under the pointer. */
  peekId: TopicId | null;
  /** IDs of ghost topics that were never created. */
  ghostIds: ReadonlySet<TopicId>;
  /** A reference line being dragged out of `from`. Positions are in pixels over the canvas. */
  refDrag: { from: TopicId; x: number; y: number; target: TopicId | null } | null;

  setRefDrag: (drag: NonNullable<GrowthState['refDrag']>) => void;
  endRefDrag: () => void;
  setHover: (id: TopicId | null) => void;
  setPeek: (id: TopicId | null) => void;
  /** Starts the leave timer. `keepAlive` or entering a topic again cancels it. */
  leave: () => void;
  keepAlive: () => void;
  setSlot: (subject: TopicId, kind: GrowthKind) => void;
  clearSlot: () => void;
  startDrag: (origin: TopicId) => void;
  endDrag: () => void;
  /** The ghost became a real topic. */
  committed: () => void;
  setCanvasFocused: (focused: boolean) => void;
  reset: () => void;
}

export function createGrowthStore() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancelTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  let pendingId: TopicId | null = null;

  return createStore<GrowthState>()((set, get) => ({
    hoverId: null,
    slot: null,
    dragOrigin: null,
    canvasFocused: false,
    peekId: null,
    ghostIds: new Set(),
    refDrag: null,

    setRefDrag: (refDrag) => set({ refDrag, hoverId: refDrag.from }),

    endRefDrag: () => {
      if (get().refDrag) set({ refDrag: null });
    },

    setPeek: (id) => {
      if (get().peekId !== id) set({ peekId: id });
    },

    setHover: (id) => {
      cancelTimer();
      if (get().hoverId !== id) set({ hoverId: id });
    },

    leave: () => {
      cancelTimer();
      timer = setTimeout(() => {
        timer = undefined;
        if (!get().dragOrigin && !get().refDrag) set({ hoverId: null });
      }, LEAVE_DELAY_MS);
    },

    keepAlive: cancelTimer,

    setSlot: (subject, kind) => {
      cancelTimer();
      const state = get();
      const current = state.slot;
      if (current && current.subject === subject && current.kind === kind) return;
      let ghostIds = state.ghostIds;
      if (!pendingId) {
        pendingId = newId();
        ghostIds = new Set([...ghostIds, pendingId]);
      }
      set({ slot: { subject, kind, id: pendingId }, hoverId: state.hoverId ?? subject, ghostIds });
    },

    clearSlot: () => {
      if (get().slot) set({ slot: null });
    },

    startDrag: (origin) => set({ dragOrigin: origin }),

    endDrag: () => set({ dragOrigin: null }),

    committed: () => {
      const id = pendingId;
      pendingId = null;
      const ghostIds = new Set(get().ghostIds);
      if (id) ghostIds.delete(id);
      set({ slot: null, dragOrigin: null, ghostIds });
    },

    setCanvasFocused: (canvasFocused) => {
      if (get().canvasFocused !== canvasFocused) set({ canvasFocused });
    },

    reset: () => {
      cancelTimer();
      pendingId = null;
      set({
        hoverId: null,
        slot: null,
        dragOrigin: null,
        refDrag: null,
        peekId: null,
        ghostIds: new Set(),
      });
    },
  }));
}

export const growthStore = createGrowthStore();

export function useGrowth<T>(selector: (state: GrowthState) => T): T {
  return useStore(growthStore, selector);
}
