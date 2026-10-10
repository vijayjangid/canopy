import { appContext } from '../editor/context';
import { executeCommand } from '../editor/commands';
import { COMMANDS, COMMAND_GROUPS, type CommandDef, type CommandId } from '../editor/shortcuts';
import { fuzzyScore, setPrefs, type MapPrefs } from '../model';
import { settingsStore, type ModeSetting } from '../settings';
import { canopyStore } from '../store';
import { describeKeys } from './CheatSheet';

export interface PaletteEntry {
  id: string;
  label: string;
  group: string;
  keys: string[];
  run: () => void;
}

/** Commands that need a key or a number are offered below as separate, plain entries. */
const HIDDEN: ReadonlySet<CommandId> = new Set([
  'nav.arrow',
  'select.escape',
  'topic.reorder',
  'view.foldToLevel',
  'palette.open',
  'filter.open',
  'filter.search',
]);

const run = (id: CommandId, key?: string) => () => {
  executeCommand(id, appContext, key ? { key } : undefined);
};

const mapPref =
  <K extends keyof MapPrefs>(key: K, value: MapPrefs[K]) =>
  () => {
    const { doc, commit } = canopyStore.getState();
    commit(setPrefs(doc, { [key]: value }), { group: `prefs:${key}` });
  };

const LOOK_NAMES: Record<MapPrefs['look'], string> = {
  minimal: 'Standard',
  contrast: 'High contrast',
  playful: 'Playful',
};

/** Every action in the app, in the order they are listed when nothing is typed. */
export function buildPalette(): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  const add = (id: string, label: string, group: string, action: () => void, keys: string[] = []) =>
    entries.push({ id, label, group, keys, run: action });

  for (const command of COMMANDS as readonly CommandDef[]) {
    if (HIDDEN.has(command.id)) continue;
    add(
      command.id,
      command.label,
      COMMAND_GROUPS[command.id],
      run(command.id),
      describeKeys(command),
    );
  }

  const flow = () => canopyStore.getState().doc.prefs.flow;
  add('topic.moveBack', 'Move up among peers', 'Move', () =>
    run('topic.reorder', flow() === 'right' ? 'ArrowUp' : 'ArrowLeft')(),
  );
  add('topic.moveForward', 'Move down among peers', 'Move', () =>
    run('topic.reorder', flow() === 'right' ? 'ArrowDown' : 'ArrowRight')(),
  );
  for (let level = 1; level <= 4; level++) {
    add(
      `view.level.${level}`,
      `Show levels 1 to ${level}`,
      'Fold',
      run('view.foldToLevel', String(level)),
      [String(level)],
    );
  }

  for (const value of ['right', 'down'] as const) {
    add(
      `prefs.flow.${value}`,
      `Layout: ${value === 'right' ? 'Right' : 'Down'}`,
      'This map',
      mapPref('flow', value),
    );
  }
  for (const value of ['compact', 'comfortable', 'airy'] as const) {
    add(
      `prefs.density.${value}`,
      `Spacing: ${value[0]?.toUpperCase()}${value.slice(1)}`,
      'This map',
      mapPref('density', value),
    );
  }
  for (const value of Object.keys(LOOK_NAMES) as Array<MapPrefs['look']>) {
    add(`prefs.look.${value}`, `Theme: ${LOOK_NAMES[value]}`, 'This map', mapPref('look', value));
  }
  add('prefs.levels', 'Show or hide level numbers', 'This map', () => {
    const { doc, commit } = canopyStore.getState();
    commit(setPrefs(doc, { showLevels: !doc.prefs.showLevels }), { group: 'prefs:showLevels' });
  });
  for (const value of ['auto', 'light', 'dark'] as ModeSetting[]) {
    add(
      `mode.${value}`,
      `Colour mode: ${value[0]?.toUpperCase()}${value.slice(1)}`,
      'This device',
      () => settingsStore.getState().update({ mode: value }),
    );
  }
  return entries;
}

export { fuzzyScore };

/** Entries that match, best first. With no query, recent commands come first. */
export function searchPalette(
  entries: readonly PaletteEntry[],
  query: string,
  recent: readonly string[],
): PaletteEntry[] {
  const rank = (id: string) => {
    const at = recent.indexOf(id);
    return at + 1;
  };
  if (query.trim() === '') {
    return entries
      .map((entry, index) => ({ entry, index }))
      .sort((a, b) => rank(b.entry.id) - rank(a.entry.id) || a.index - b.index)
      .map((x) => x.entry);
  }
  return entries
    .map((entry, index) => ({
      entry,
      index,
      score: fuzzyScore(query, `${entry.label} ${entry.group}`),
    }))
    .filter((x): x is { entry: PaletteEntry; index: number; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score || rank(b.entry.id) - rank(a.entry.id) || a.index - b.index)
    .map((x) => x.entry);
}

const RECENT_KEY = 'canopy.recentCommands';
const RECENT_MAX = 6;

export function loadRecent(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Newest last, no repeats, and only the most recent few. */
export function pushRecent(id: string, list: readonly string[] = loadRecent()): string[] {
  const next = [...list.filter((x) => x !== id), id].slice(-RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Without storage, recents last for this session only.
  }
  return next;
}
