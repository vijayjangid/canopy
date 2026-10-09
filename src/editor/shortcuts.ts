export interface Shortcut {
  /** `KeyboardEvent.key`, compared without case. */
  key: string;
  /** Cmd on Mac, Ctrl elsewhere. */
  mod?: boolean;
  /** `'any'` for keys where Shift only changes the character or extends the action. */
  shift?: boolean | 'any';
  alt?: boolean;
}

export type CommandId =
  | 'topic.addChild'
  | 'topic.addPeerAfter'
  | 'topic.addPeerBefore'
  | 'topic.wrap'
  | 'topic.insertBelow'
  | 'topic.edit'
  | 'topic.delete'
  | 'topic.duplicate'
  | 'topic.toggleFold'
  | 'topic.reorder'
  | 'nav.arrow'
  | 'select.all'
  | 'select.escape'
  | 'edit.undo'
  | 'edit.redo'
  | 'view.foldToLevel'
  | 'view.unfoldAll'
  | 'view.zoomIn'
  | 'view.zoomOut'
  | 'view.fit'
  | 'view.zen'
  | 'view.trail'
  | 'view.focusBranch'
  | 'view.toolSelect'
  | 'view.toolPan'
  | 'view.toolZoom'
  | 'help.shortcuts'
  | 'palette.open'
  | 'prefs.open'
  | 'inspector.toggle'
  | 'note.open'
  | 'stickers.open'
  | 'edge.label'
  | 'edge.sticker'
  | 'props.open'
  | 'props.quickAdd'
  | 'props.status'
  | 'props.due'
  | 'props.tag'
  | 'filter.open'
  | 'filter.search'
  | 'filter.next'
  | 'filter.prev'
  | 'filter.off'
  | 'export.open'
  | 'file.new'
  | 'file.open'
  | 'file.save';

export interface CommandDef {
  id: CommandId;
  label: string;
  shortcuts: Shortcut[];
}

const arrows = (extra: Partial<Shortcut> = {}): Shortcut[] =>
  ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].map((key) => ({ key, ...extra }));

const digits = '123456789'.split('').map((key): Shortcut => ({ key }));

/** The one list of keyboard commands. Handlers, menus, hints and the cheat sheet all read it. */
export const COMMANDS: readonly CommandDef[] = [
  { id: 'topic.addChild', label: 'Add sub-topic', shortcuts: [{ key: 'Tab' }] },
  { id: 'topic.addPeerAfter', label: 'Add peer below', shortcuts: [{ key: 'Enter' }] },
  {
    id: 'topic.addPeerBefore',
    label: 'Add peer above',
    shortcuts: [],
  },
  {
    id: 'topic.wrap',
    label: 'Insert a topic between this and its parent',
    shortcuts: [{ key: 'w' }],
  },
  {
    id: 'topic.insertBelow',
    label: 'Insert a topic between this and its sub-topics',
    shortcuts: [{ key: 'w', shift: true }],
  },
  { id: 'topic.edit', label: 'Edit title', shortcuts: [{ key: ' ' }, { key: 'F2' }] },
  {
    id: 'topic.delete',
    label: 'Delete branch',
    shortcuts: [{ key: 'Delete' }, { key: 'Backspace' }],
  },
  { id: 'topic.duplicate', label: 'Duplicate branch', shortcuts: [{ key: 'd', mod: true }] },
  { id: 'topic.toggleFold', label: 'Fold or unfold', shortcuts: [{ key: ']' }] },
  { id: 'topic.reorder', label: 'Move among peers', shortcuts: arrows({ alt: true }) },
  { id: 'nav.arrow', label: 'Move selection', shortcuts: arrows({ shift: 'any' }) },
  { id: 'select.all', label: 'Select branch', shortcuts: [{ key: 'a', mod: true }] },
  { id: 'select.escape', label: 'Clear selection', shortcuts: [{ key: 'Escape' }] },
  { id: 'edit.undo', label: 'Undo', shortcuts: [{ key: 'z', mod: true }] },
  {
    id: 'edit.redo',
    label: 'Redo',
    shortcuts: [
      { key: 'z', mod: true, shift: true },
      { key: 'y', mod: true },
    ],
  },
  { id: 'view.foldToLevel', label: 'Show levels 1 to 9', shortcuts: digits },
  { id: 'view.unfoldAll', label: 'Unfold everything', shortcuts: [{ key: '0' }] },
  {
    id: 'view.zoomIn',
    label: 'Zoom in',
    shortcuts: [
      { key: '=', mod: true, shift: 'any' },
      { key: '+', mod: true, shift: 'any' },
    ],
  },
  { id: 'view.zoomOut', label: 'Zoom out', shortcuts: [{ key: '-', mod: true }] },
  { id: 'view.fit', label: 'Fit to screen', shortcuts: [{ key: '0', mod: true }] },
  {
    id: 'view.focusBranch',
    label: 'Fold everything above into one node, or unfold it again',
    shortcuts: [{ key: '[' }],
  },
  { id: 'view.toolSelect', label: 'Select tool: pick topics', shortcuts: [{ key: 'v' }] },
  { id: 'view.toolPan', label: 'Pan tool: drag to move the view', shortcuts: [{ key: 'h' }] },
  {
    id: 'view.toolZoom',
    label: 'Zoom tool: click to zoom in, Alt-click out, drag an area',
    shortcuts: [{ key: 'z', shift: true }],
  },
  { id: 'view.trail', label: 'Turn the Trail highlight on or off', shortcuts: [{ key: 'r' }] },
  { id: 'view.zen', label: 'Zen mode: hide everything but the map', shortcuts: [{ key: 'z' }] },
  {
    id: 'palette.open',
    label: 'Open command palette',
    shortcuts: [{ key: 'k', mod: true }],
  },
  {
    id: 'help.shortcuts',
    label: 'Show keyboard shortcuts',
    shortcuts: [{ key: '?', shift: 'any' }],
  },
  { id: 'prefs.open', label: 'Open preferences', shortcuts: [{ key: ',', mod: true }] },
  { id: 'inspector.toggle', label: 'Show or hide the inspector', shortcuts: [{ key: 'i' }] },
  { id: 'note.open', label: 'Write a note', shortcuts: [{ key: 'n' }] },
  { id: 'stickers.open', label: 'Add a sticker', shortcuts: [{ key: 's' }] },
  { id: 'edge.label', label: 'Label the line to the parent', shortcuts: [{ key: 'l' }] },
  { id: 'edge.sticker', label: 'Add a sticker to the line', shortcuts: [] },
  { id: 'props.open', label: 'Edit all properties', shortcuts: [{ key: 'p', shift: true }] },
  { id: 'props.quickAdd', label: 'Set status, due date or tag', shortcuts: [{ key: 'p' }] },
  { id: 'props.status', label: 'Set status', shortcuts: [{ key: 't' }] },
  { id: 'props.due', label: 'Set a due date', shortcuts: [{ key: 'd' }] },
  { id: 'props.tag', label: 'Add a tag', shortcuts: [{ key: 'g' }] },
  { id: 'filter.open', label: 'Choose a Filter', shortcuts: [{ key: '/' }, { key: 'f' }] },
  {
    id: 'filter.search',
    label: 'Search topics and lines by text',
    shortcuts: [{ key: 'f', mod: true }],
  },
  { id: 'filter.next', label: 'Next match in the Filter', shortcuts: [{ key: '.' }] },
  { id: 'filter.prev', label: 'Previous match in the Filter', shortcuts: [{ key: ',' }] },
  { id: 'filter.off', label: 'Turn the Filter off', shortcuts: [] },
  {
    id: 'export.open',
    label: 'Export as image, PDF or Markdown',
    shortcuts: [{ key: 'e', mod: true }],
  },
  { id: 'file.new', label: 'New map', shortcuts: [] },
  { id: 'file.open', label: 'Open a map file', shortcuts: [] },
  { id: 'file.save', label: 'Save a copy as a file', shortcuts: [] },
];

/** Where each command appears in the cheat sheet. */
export const COMMAND_GROUPS: Record<CommandId, string> = {
  'topic.addChild': 'Create',
  'topic.addPeerAfter': 'Create',
  'topic.addPeerBefore': 'Create',
  'topic.wrap': 'Create',
  'topic.insertBelow': 'Create',
  'topic.duplicate': 'Create',
  'topic.edit': 'Edit',
  'topic.delete': 'Edit',
  'edit.undo': 'Edit',
  'edit.redo': 'Edit',
  'topic.reorder': 'Move',
  'nav.arrow': 'Move',
  'select.all': 'Select',
  'select.escape': 'Select',
  'topic.toggleFold': 'Fold',
  'view.foldToLevel': 'Fold',
  'view.unfoldAll': 'Fold',
  'view.zoomIn': 'View',
  'view.zoomOut': 'View',
  'view.fit': 'View',
  'view.zen': 'View',
  'view.trail': 'View',
  'view.focusBranch': 'View',
  'view.toolSelect': 'View',
  'view.toolPan': 'View',
  'view.toolZoom': 'View',
  'palette.open': 'App',
  'help.shortcuts': 'App',
  'prefs.open': 'App',
  'inspector.toggle': 'Topic content',
  'note.open': 'Topic content',
  'stickers.open': 'Topic content',
  'edge.label': 'Topic content',
  'edge.sticker': 'Topic content',
  'props.open': 'Planning',
  'props.quickAdd': 'Planning',
  'props.status': 'Planning',
  'props.due': 'Planning',
  'props.tag': 'Planning',
  'filter.open': 'Planning',
  'filter.search': 'Planning',
  'filter.next': 'Planning',
  'filter.prev': 'Planning',
  'filter.off': 'Planning',
  'export.open': 'App',
  'file.new': 'App',
  'file.open': 'App',
  'file.save': 'App',
};

/** Browser-handled shortcuts, listed in the cheat sheet only. */
export const NATIVE_SHORTCUTS: Array<{ label: string; shortcuts: Shortcut[] }> = [
  { label: 'Copy branches', shortcuts: [{ key: 'c', mod: true }] },
  { label: 'Cut branches', shortcuts: [{ key: 'x', mod: true }] },
  { label: 'Paste as sub-topics', shortcuts: [{ key: 'v', mod: true }] },
  { label: 'Paste as peers', shortcuts: [{ key: 'v', mod: true, shift: true }] },
];

export function matchShortcut(e: KeyboardEvent, s: Shortcut): boolean {
  if (e.key.toLowerCase() !== s.key.toLowerCase()) return false;
  if ((e.metaKey || e.ctrlKey) !== Boolean(s.mod)) return false;
  if (e.altKey !== Boolean(s.alt)) return false;
  return s.shift === 'any' || e.shiftKey === Boolean(s.shift);
}

export function findCommand(e: KeyboardEvent): CommandDef | undefined {
  return COMMANDS.find((c) => c.shortcuts.some((s) => matchShortcut(e, s)));
}

const KEY_NAMES: Record<string, { mac: string; other: string }> = {
  ' ': { mac: 'Space', other: 'Space' },
  Enter: { mac: '↵', other: 'Enter' },
  Tab: { mac: '⇥', other: 'Tab' },
  Escape: { mac: 'Esc', other: 'Esc' },
  Backspace: { mac: '⌫', other: 'Backspace' },
  Delete: { mac: '⌦', other: 'Del' },
  ArrowUp: { mac: '↑', other: '↑' },
  ArrowDown: { mac: '↓', other: '↓' },
  ArrowLeft: { mac: '←', other: '←' },
  ArrowRight: { mac: '→', other: '→' },
};

export function isMac(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
}

/** Human-readable shortcut, such as `⌘⇧Z` or `Ctrl+Shift+Z`. */
export function formatShortcut(s: Shortcut, mac = isMac()): string {
  const name = KEY_NAMES[s.key];
  const key = name
    ? mac
      ? name.mac
      : name.other
    : s.key.length === 1
      ? s.key.toUpperCase()
      : s.key;
  const parts: string[] = [];
  if (mac) {
    if (s.mod) parts.push('⌘');
    if (s.alt) parts.push('⌥');
    if (s.shift === true) parts.push('⇧');
    return parts.join('') + key;
  }
  if (s.mod) parts.push('Ctrl');
  if (s.alt) parts.push('Alt');
  if (s.shift === true) parts.push('Shift');
  return [...parts, key].join('+');
}
