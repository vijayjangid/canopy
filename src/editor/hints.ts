import { COMMANDS, formatShortcut, type CommandId, type Shortcut } from './shortcuts';

export interface Hint {
  keys: string;
  label: string;
}

/** Shortcuts that exist only while a title is being typed. They are not in `COMMANDS`. */
const EDITING: Array<{ shortcut: Shortcut; label: string }> = [
  { shortcut: { key: 'Enter' }, label: 'Next topic' },
  { shortcut: { key: 'Tab' }, label: 'Sub-topic' },
  { shortcut: { key: 'Enter', shift: true }, label: 'New line' },
  { shortcut: { key: 'Escape' }, label: 'Cancel' },
];

export interface HintContext {
  editing: boolean;
  selectionCount: number;
  focusIsCore: boolean;
  focusHasChildren: boolean;
  /** The focused topic is folded, so the shortcut expands it. */
  focusFolded?: boolean;
  /** Text expansion is on, so `!!` is worth a hint while typing. */
  expansion?: boolean;
  /** The title being typed starts with `!!`. */
  expressing?: boolean;
}

/** Shorter names for the hint strip, where space is tight. */
const SHORT: Partial<Record<CommandId, string>> = {
  'props.quickAdd': 'Properties',
  'props.tag': 'Tag',
  'props.due': 'Due date',
  'stickers.open': 'Sticker',
  'note.open': 'Note',
};

/** What can be set on a topic, which the hint strip lists after the structure shortcuts. */
const DETAILS: CommandId[] = [
  'props.quickAdd',
  'props.tag',
  'props.due',
  'stickers.open',
  'note.open',
];

function fromCommands(
  ids: CommandId[],
  mac?: boolean,
  labels: Partial<Record<CommandId, string>> = {},
): Hint[] {
  const hints: Hint[] = [];
  for (const id of ids) {
    const command = COMMANDS.find((c) => c.id === id);
    const shortcut = command?.shortcuts[0];
    if (command && shortcut) {
      hints.push({
        keys: formatShortcut(shortcut, mac),
        label: labels[id] ?? SHORT[id] ?? command.label,
      });
    }
  }
  return hints;
}

/** The few shortcuts that matter for what is selected right now. */
export function hintsFor(context: HintContext, mac?: boolean): Hint[] {
  if (context.editing && context.expressing) {
    return [
      { keys: '>', label: 'Child' },
      { keys: ',', label: 'Sibling' },
      { keys: formatShortcut({ key: 'Tab', shift: true }, mac), label: 'Apply' },
      { keys: formatShortcut({ key: 'Escape' }, mac), label: 'Cancel' },
    ];
  }
  if (context.editing) {
    const hints = EDITING.map((e) => ({ keys: formatShortcut(e.shortcut, mac), label: e.label }));
    return context.expansion ? [...hints, { keys: '!!', label: 'Many at once' }] : hints;
  }
  if (context.selectionCount > 1) {
    return fromCommands(
      [
        'topic.delete',
        'topic.duplicate',
        'props.quickAdd',
        'props.tag',
        'props.due',
        'select.escape',
      ],
      mac,
    );
  }
  if (context.focusIsCore) {
    return fromCommands(
      ['topic.addChild', 'topic.edit', 'note.open', 'stickers.open', 'view.unfoldAll'],
      mac,
    );
  }
  const ids: CommandId[] = ['topic.addChild', 'topic.addPeerAfter', 'topic.edit'];
  if (context.focusHasChildren) ids.push('topic.toggleFold');
  ids.push('topic.delete', ...DETAILS);
  return fromCommands(ids, mac, {
    'topic.toggleFold': context.focusFolded ? 'Unfold' : 'Fold',
  });
}
