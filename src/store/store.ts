import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createMap, newId, type CanopyMap, type TopicId } from '../model';

/** Everything an undo step restores: the map and what was selected. */
interface Snapshot {
  doc: CanopyMap;
  selection: TopicId[];
  focus: TopicId;
}

export interface CommitOptions {
  /** Edits with the same key within `groupWindowMs` collapse into one undo step (typing). */
  group?: string;
  /** Selection after the edit. Defaults to keeping the current one. */
  select?: TopicId[];
  focus?: TopicId;
  /** Topic to put into inline title editing after the edit. */
  edit?: TopicId | null;
}

export interface CanopyState {
  mapId: string;
  /** False until a map has been loaded from storage. */
  ready: boolean;
  doc: CanopyMap;
  /** Selected topics. The focused topic is always one of them. */
  selection: TopicId[];
  focus: TopicId;
  /** False after clicking empty canvas: the focus is remembered for the keyboard, but nothing is picked. */
  picked: boolean;
  editing: TopicId | null;
  /** State when the current title edit began, so Escape can put it back. */
  editBase: { doc: CanopyMap; pastLength: number } | null;
  past: Snapshot[];
  future: Snapshot[];

  commit: (next: CanopyMap, opts?: CommitOptions) => void;
  undo: () => void;
  redo: () => void;
  select: (ids: TopicId[], focus?: TopicId) => void;
  /** Lets go of the selection, so keys that act on a topic do nothing until one is picked again. */
  deselect: () => void;
  setEditing: (id: TopicId | null) => void;
  /** Ends the current title edit and drops every change made during it. */
  cancelEdit: () => void;
  load: (mapId: string, doc: CanopyMap) => void;
  newMap: () => string;
}

export interface StoreOptions {
  now?: () => number;
  historyLimit?: number;
  groupWindowMs?: number;
}

export type CanopyStore = StoreApi<CanopyState>;

function initialSelection(doc: CanopyMap) {
  return { selection: [doc.coreId], focus: doc.coreId };
}

/** Keeps only topics that still exist, falling back to the Core. */
function sanitizeSelection(doc: CanopyMap, selection: TopicId[], focus: TopicId) {
  const alive = selection.filter((id) => doc.topics[id] !== undefined);
  if (alive.length === 0) return initialSelection(doc);
  return {
    selection: alive,
    focus: alive.includes(focus) ? focus : (alive[alive.length - 1] ?? doc.coreId),
  };
}

export function createCanopyStore(
  initial?: { mapId?: string; doc?: CanopyMap },
  options: StoreOptions = {},
): CanopyStore {
  const now = options.now ?? Date.now;
  const historyLimit = options.historyLimit ?? 200;
  const groupWindowMs = options.groupWindowMs ?? 1000;
  const doc = initial?.doc ?? createMap();
  let lastGroup: { key: string; at: number } | null = null;

  return createStore<CanopyState>()((set, get) => ({
    mapId: initial?.mapId ?? newId('m_'),
    ready: initial?.doc !== undefined,
    doc,
    ...initialSelection(doc),
    picked: true,
    editing: null,
    editBase: null,
    past: [],
    future: [],

    commit: (next, opts = {}) => {
      const state = get();
      if (next === state.doc) return;

      const at = now();
      const grouped =
        opts.group !== undefined &&
        lastGroup?.key === opts.group &&
        at - lastGroup.at < groupWindowMs;
      lastGroup = opts.group !== undefined ? { key: opts.group, at } : null;

      const before: Snapshot = { doc: state.doc, selection: state.selection, focus: state.focus };
      const past = grouped ? state.past : [...state.past, before].slice(-historyLimit);
      const wanted = opts.select ?? state.selection;
      const picked = sanitizeSelection(next, wanted, opts.focus ?? state.focus);
      const editing = opts.edit !== undefined ? opts.edit : state.editing;
      const nextEditing = editing !== null && next.topics[editing] ? editing : null;
      const startedEditing = nextEditing !== null && nextEditing !== state.editing;

      set({
        doc: next,
        ...picked,
        picked: opts.select !== undefined ? true : state.picked,
        editing: nextEditing,
        editBase:
          nextEditing === null
            ? null
            : startedEditing
              ? { doc: next, pastLength: past.length }
              : state.editBase,
        past,
        future: [],
      });
    },

    undo: () => {
      const state = get();
      const previous = state.past[state.past.length - 1];
      if (!previous) return;
      lastGroup = null;
      const current: Snapshot = { doc: state.doc, selection: state.selection, focus: state.focus };
      set({
        doc: previous.doc,
        ...sanitizeSelection(previous.doc, previous.selection, previous.focus),
        picked: true,
        editing: null,
        editBase: null,
        past: state.past.slice(0, -1),
        future: [...state.future, current],
      });
    },

    redo: () => {
      const state = get();
      const next = state.future[state.future.length - 1];
      if (!next) return;
      lastGroup = null;
      const current: Snapshot = { doc: state.doc, selection: state.selection, focus: state.focus };
      set({
        doc: next.doc,
        ...sanitizeSelection(next.doc, next.selection, next.focus),
        picked: true,
        editing: null,
        editBase: null,
        past: [...state.past, current],
        future: state.future.slice(0, -1),
      });
    },

    select: (ids, focus) => {
      const state = get();
      set({
        ...sanitizeSelection(state.doc, ids, focus ?? ids[ids.length - 1] ?? state.focus),
        picked: true,
        editing: null,
        editBase: null,
      });
    },

    deselect: () => set({ picked: false, editing: null, editBase: null }),

    setEditing: (id) => {
      const state = get();
      set({
        editing: id,
        editBase: id === null ? null : { doc: state.doc, pastLength: state.past.length },
      });
    },

    cancelEdit: () => {
      const state = get();
      const base = state.editBase;
      lastGroup = null;
      if (!base) {
        set({ editing: null });
        return;
      }
      set({
        doc: base.doc,
        ...sanitizeSelection(base.doc, state.selection, state.focus),
        editing: null,
        editBase: null,
        past: state.past.slice(0, base.pastLength),
      });
    },

    load: (mapId, nextDoc) => {
      lastGroup = null;
      set({
        mapId,
        ready: true,
        doc: nextDoc,
        ...initialSelection(nextDoc),
        picked: true,
        editing: null,
        editBase: null,
        past: [],
        future: [],
      });
    },

    newMap: () => {
      const mapId = newId('m_');
      get().load(mapId, createMap());
      return mapId;
    },
  }));
}

/** The app-wide store. Tests create their own with `createCanopyStore`. */
export const canopyStore = createCanopyStore();

export function useCanopy<T>(selector: (state: CanopyState) => T): T {
  return useStore(canopyStore, selector);
}

export const canUndo = (s: CanopyState) => s.past.length > 0;
export const canRedo = (s: CanopyState) => s.future.length > 0;
