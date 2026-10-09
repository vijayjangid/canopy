import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { NO_FILTER, type FilterSelection } from '../model';

export type DialogName =
  | 'shortcuts'
  | 'palette'
  | 'quickadd'
  | 'topicSearch'
  // These two used to be dialogs. They now open in the left panel.
  | 'preferences'
  | 'export';

/** Parts of the details panel on the right. */
export type InspectorTab = 'properties' | 'note' | 'stickers';

/** Tabs of the panel on the left. */
export type LeftTab = 'settings' | 'filter' | 'tags' | 'export';

export type FilterMode = 'dim' | 'isolate';

/** How the Trail shows the way up to the Core. */
export type TrailMode = 'none' | 'highlight' | 'isolate';

interface UiState {
  dialog: DialogName | null;
  /** Source topic when topic search is being used to create a reference. */
  topicSearchFrom: string | null;
  /** What is ticked in the Filter panel. Nothing ticked means no Filter. */
  filterSel: FilterSelection;
  filterMode: FilterMode;
  /** Zen: everything but the map is hidden until it is turned off. */
  zen: boolean;
  /** The details panel is shown while a topic is being looked at, and closed with its button. */
  inspectorOpen: boolean;
  /** The part of the details panel to show and focus. */
  inspectorTab: InspectorTab;
  /** Which parts of the details panel are folded open. */
  sections: Record<InspectorTab, boolean>;
  leftOpen: boolean;
  leftTab: LeftTab;
  /** The topic whose line to its parent is picked, so the Stickers tab targets the line. */
  edgeFocus: string | null;
  /** The topic whose line label is being typed. */
  edgeEditing: string | null;
  /** Counts each time a line is pointed at, so its controls can flash again. */
  edgeNudge: number;
  trailMode: TrailMode;
  /** The topic whose branch is shown alone, with everything above it collapsed into one node. */
  focusBranch: string | null;
  /** The topic whose reference line is picked, so it shows its delete icon. */
  referenceFocus: string | null;
  /** Counts each request to put the cursor in the Filter's search box. */
  searchNudge: number;
}

const PANELS_KEY = 'canopy.panels.v2';
const DEFAULT_SECTIONS: Record<InspectorTab, boolean> = {
  properties: true,
  stickers: true,
  note: false,
};

function loadPanels(): Pick<UiState, 'sections' | 'leftOpen' | 'leftTab'> {
  const base = {
    sections: { ...DEFAULT_SECTIONS },
    leftOpen: false,
    leftTab: 'settings' as LeftTab,
  };
  try {
    const raw = JSON.parse(localStorage.getItem(PANELS_KEY) ?? '{}') as Record<string, unknown>;
    if (typeof raw['leftOpen'] === 'boolean') base.leftOpen = raw['leftOpen'];
    const tabs: LeftTab[] = ['settings', 'filter', 'tags', 'export'];
    if (tabs.includes(raw['leftTab'] as LeftTab)) base.leftTab = raw['leftTab'] as LeftTab;
    const saved = raw['sections'];
    if (typeof saved === 'object' && saved !== null) {
      for (const key of Object.keys(base.sections) as InspectorTab[]) {
        const value = (saved as Record<string, unknown>)[key];
        if (typeof value === 'boolean') base.sections[key] = value;
      }
    }
  } catch {
    // Unreadable layout falls back to the defaults.
  }
  return base;
}

export const uiStore = createStore<UiState>(() => ({
  dialog: null,
  topicSearchFrom: null,
  filterSel: NO_FILTER,
  filterMode: 'dim',
  zen: false,
  inspectorOpen: false,
  inspectorTab: 'properties',
  edgeFocus: null,
  edgeEditing: null,
  edgeNudge: 0,
  trailMode: 'highlight',
  focusBranch: null,
  referenceFocus: null,
  searchNudge: 0,
  ...loadPanels(),
}));

// Remember how the panels were left, on this device.
uiStore.subscribe((s, prev) => {
  if (s.sections === prev.sections && s.leftOpen === prev.leftOpen && s.leftTab === prev.leftTab) {
    return;
  }
  try {
    localStorage.setItem(
      PANELS_KEY,
      JSON.stringify({
        sections: s.sections,
        leftOpen: s.leftOpen,
        leftTab: s.leftTab,
      }),
    );
  } catch {
    // Without storage, the layout lasts for this session only.
  }
});

/** Opens the details panel, and folds open `tab` when given. */
export const openInspector = (tab?: InspectorTab) =>
  uiStore.setState((s) => ({
    inspectorOpen: true,
    inspectorTab: tab ?? s.inspectorTab,
    sections: tab ? { ...s.sections, [tab]: true } : s.sections,
  }));
export const closeInspector = () => uiStore.setState({ inspectorOpen: false });
export const toggleInspector = () => uiStore.setState((s) => ({ inspectorOpen: !s.inspectorOpen }));
export const setInspectorTab = (inspectorTab: InspectorTab) => uiStore.setState({ inspectorTab });
export const toggleSection = (tab: InspectorTab) =>
  uiStore.setState((s) => ({ sections: { ...s.sections, [tab]: !s.sections[tab] } }));

export const openLeft = (leftTab?: LeftTab) =>
  uiStore.setState((s) => ({ leftOpen: true, leftTab: leftTab ?? s.leftTab }));
export const closeLeft = () => uiStore.setState({ leftOpen: false });

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(uiStore, selector);
}

export function openDialog(dialog: DialogName): void {
  if (dialog === 'preferences') openLeft('settings');
  else if (dialog === 'export') openLeft('export');
  else uiStore.setState({ dialog });
}
export const closeDialog = () => uiStore.setState({ dialog: null, topicSearchFrom: null });

export function openTopicSearch(from: string | null = null): void {
  uiStore.setState({ dialog: 'topicSearch', topicSearchFrom: from });
}

export function useDialog(): DialogName | null {
  return useStore(uiStore, (s) => s.dialog);
}

export const setFilter = (selection: FilterSelection | null) =>
  uiStore.setState({ filterSel: selection ?? NO_FILTER });
export const updateFilter = (patch: Partial<FilterSelection>) =>
  uiStore.setState((s) => ({ filterSel: { ...s.filterSel, ...patch } }));

/** Ticks or unticks one status, tag or sticker. */
export function toggleFilterChoice(group: 'status' | 'tags' | 'stickers', key: string): void {
  const current = uiStore.getState().filterSel[group];
  updateFilter({
    [group]: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
  });
}

/** Picks a due date choice, or clears it when it is already picked. */
export function toggleFilterDue(due: 'overdue' | 'week' | 'range'): void {
  updateFilter({ due: uiStore.getState().filterSel.due === due ? null : due });
}
export const setFilterMode = (filterMode: FilterMode) => uiStore.setState({ filterMode });

/** Optional starting text and kind for the Quick-Add popover. */
export const quickAddStore = createStore<{
  preset: 'all' | 'status' | 'due' | 'tag';
}>(() => ({ preset: 'all' }));
export const openQuickAdd = (preset: 'all' | 'status' | 'due' | 'tag' = 'all') => {
  quickAddStore.setState({ preset });
  openDialog('quickadd');
};

export const setZen = (zen: boolean) => uiStore.setState({ zen });
export const toggleZen = () => uiStore.setState((s) => ({ zen: !s.zen }));

/** Picks the line above a topic (or lets go of it), so details act on the line. */
export const setEdgeFocus = (edgeFocus: string | null) => uiStore.setState({ edgeFocus });
export const startEdgeEdit = (id: string) => uiStore.setState({ edgeEditing: id, edgeFocus: id });
export const stopEdgeEdit = () => uiStore.setState({ edgeEditing: null, edgeFocus: null });

/** Picks the line above a topic and opens its sticker and label controls in the details panel. */
export const pointAtEdge = (id: string) =>
  uiStore.setState((s) => ({
    edgeFocus: id,
    inspectorOpen: true,
    inspectorTab: 'stickers',
    sections: { ...s.sections, stickers: true },
    edgeNudge: s.edgeNudge + 1,
  }));

export const setTrailMode = (trailMode: TrailMode) => uiStore.setState({ trailMode });
export const setFocusBranch = (focusBranch: string | null) => uiStore.setState({ focusBranch });

/** Picks the reference line leaving a topic (or lets go of it). */
export const setReferenceFocus = (referenceFocus: string | null) =>
  uiStore.setState((s) => (s.referenceFocus === referenceFocus ? s : { referenceFocus }));

/** Opens the Filter panel with the cursor in its search box. */
export function focusFilterSearch(): void {
  uiStore.setState((s) => ({
    leftOpen: true,
    leftTab: 'filter',
    searchNudge: s.searchNudge + 1,
  }));
}
export const setFilterText = (text: string) =>
  uiStore.setState((s) => ({ filterSel: { ...s.filterSel, text } }));
