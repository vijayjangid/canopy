import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { setMotionPreference, type MotionPreference } from '../motion';

export type ModeSetting = 'auto' | 'light' | 'dark';
export type HandleVisibility = 'hover' | 'always' | 'never';

/** Settings that belong to this device and browser, not to a map. */
export interface AppSettings {
  mode: ModeSetting;
  motion: MotionPreference;
  handles: HandleVisibility;
  /** Show the topic a + button would add, as a ghost, while it is pointed at. Off unless asked for. */
  handlePreview: boolean;
  hints: boolean;
  /** Pan the map to keep the selected topic in view as topics are added or moved between. */
  autoPan: boolean;
  /** Remove a new topic that is left without a title or any details. */
  discardBlank: boolean;
  /** A title that starts with !! expands into several topics when it is finished. */
  textExpansion: boolean;
  /** Mark the way from the selected topic up to the Core. */
  trail: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  mode: 'auto',
  motion: 'auto',
  handles: 'hover',
  handlePreview: false,
  hints: true,
  autoPan: true,
  discardBlank: true,
  textExpansion: true,
  trail: true,
};

const KEY = 'canopy.settings';
const MODES: readonly ModeSetting[] = ['auto', 'light', 'dark'];
const MOTIONS: readonly MotionPreference[] = ['auto', 'full', 'reduced'];
const HANDLES: readonly HandleVisibility[] = ['hover', 'always', 'never'];

/** Keeps only valid values, so an old or edited entry cannot break the app. */
export function parseSettings(raw: string | null): AppSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!raw) return out;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (MODES.includes(value['mode'] as ModeSetting)) out.mode = value['mode'] as ModeSetting;
    if (MOTIONS.includes(value['motion'] as MotionPreference)) {
      out.motion = value['motion'] as MotionPreference;
    }
    if (HANDLES.includes(value['handles'] as HandleVisibility)) {
      out.handles = value['handles'] as HandleVisibility;
    }
    if (typeof value['handlePreview'] === 'boolean') out.handlePreview = value['handlePreview'];
    if (typeof value['hints'] === 'boolean') out.hints = value['hints'];
    if (typeof value['autoPan'] === 'boolean') out.autoPan = value['autoPan'];
    if (typeof value['discardBlank'] === 'boolean') out.discardBlank = value['discardBlank'];
    if (typeof value['textExpansion'] === 'boolean') out.textExpansion = value['textExpansion'];
    if (typeof value['trail'] === 'boolean') out.trail = value['trail'];
  } catch {
    // Unreadable settings fall back to the defaults.
  }
  return out;
}

function pick(state: AppSettings): AppSettings {
  return {
    mode: state.mode,
    motion: state.motion,
    handles: state.handles,
    handlePreview: state.handlePreview,
    hints: state.hints,
    autoPan: state.autoPan,
    discardBlank: state.discardBlank,
    textExpansion: state.textExpansion,
    trail: state.trail,
  };
}

function effectiveScheme(mode: ModeSetting): 'light' | 'dark' {
  if (mode !== 'auto') return mode;
  const dark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return dark ? 'dark' : 'light';
}

function apply(settings: AppSettings) {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (settings.mode === 'auto') root.removeAttribute('data-mode');
    else root.setAttribute('data-mode', settings.mode);
    root.setAttribute('data-scheme', effectiveScheme(settings.mode));
    if (settings.motion === 'reduced') root.setAttribute('data-motion', 'reduced');
    else root.removeAttribute('data-motion');
  }
  setMotionPreference(settings.motion);
}

// In Auto mode, follow the system when it changes.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    apply(pick(settingsStore.getState()));
  });
}

function load(): AppSettings {
  try {
    return parseSettings(localStorage.getItem(KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

type SettingsState = AppSettings & { update: (patch: Partial<AppSettings>) => void };

export const settingsStore = createStore<SettingsState>((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch);
    const next = pick(get());
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private browsing may refuse storage. The setting still applies for this session.
    }
    apply(next);
  },
}));

apply(pick(settingsStore.getState()));

export function useSettings<T>(selector: (state: AppSettings) => T): T {
  return useStore(settingsStore, selector);
}
