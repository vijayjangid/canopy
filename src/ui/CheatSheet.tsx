import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COMMANDS,
  COMMAND_GROUPS,
  NATIVE_SHORTCUTS,
  formatShortcut,
  type CommandDef,
  type Shortcut,
} from '../editor/shortcuts';
import { Dialog } from './Dialog';
import { Icon } from './icons';

const ORDER = [
  'Create',
  'Edit',
  'Topic content',
  'Planning',
  'Typing',
  'Move',
  'Select',
  'Fold',
  'View',
  'App',
];

function modifiers(s: Shortcut): string {
  return formatShortcut({ ...s, key: '' });
}

/** Keys for one row. Families of keys (arrows, digits) collapse into one entry. */
export function describeKeys(command: { shortcuts: Shortcut[] }): string[] {
  const list = command.shortcuts;
  const first = list[0];
  if (!first) return [];
  if (list.length > 3 && list.every((s) => s.key.startsWith('Arrow'))) {
    return [`${modifiers(first)}↑↓←→`];
  }
  if (list.length > 3 && list.every((s) => /^\d$/.test(s.key))) return ['1–9'];
  // `=` and `+` are one zoom key in two spellings.
  const shown = command.shortcuts.filter((s) => s.key !== '+');
  return shown.map((s) => formatShortcut(s));
}

interface Row {
  label: string;
  keys: string[];
  /** Everything a search can match: name, group and the keys in words and symbols. */
  text: string;
}

/** Symbols and the words people type for them, so "cmd d" and "⌘D" both find Duplicate. */
const WORDS: Array<[string, string]> = [
  ['⌘', ' cmd command ctrl control '],
  ['⇧', ' shift '],
  ['⌥', ' alt option '],
  ['↵', ' enter return '],
  ['⇥', ' tab '],
  ['⌫', ' backspace '],
  ['⌦', ' delete '],
  ['↑↓←→', ' arrows arrow '],
];

function searchText(label: string, group: string, keys: string[]): string {
  const joined = keys.join(' ');
  const words = WORDS.filter(([symbol]) => joined.includes(symbol))
    .map(([, w]) => w)
    .join('');
  return `${label} ${group} ${joined} ${words}`.toLowerCase();
}

export function CheatSheet() {
  const [query, setQuery] = useState('');
  const field = useRef<HTMLInputElement>(null);

  // The dialog opens first, so the search box can take focus straight away.
  useEffect(() => {
    field.current?.focus();
  }, []);

  const groups = useMemo(() => {
    const rows = new Map<string, Row[]>();
    const add = (group: string, label: string, keys: string[]) => {
      if (keys.length === 0) return;
      rows.set(group, [
        ...(rows.get(group) ?? []),
        { label, keys, text: searchText(label, group, keys) },
      ]);
    };
    for (const command of COMMANDS as readonly CommandDef[]) {
      add(COMMAND_GROUPS[command.id], command.label, describeKeys(command));
    }
    add('Typing', 'Expand into nested topics', ['!!a>b>c']);
    add('Typing', 'Expand into siblings (comma or new line)', ['!!a, b, c']);
    add('Typing', 'Set a tag, status or due date', ['#tag /status ^date']);
    for (const native of NATIVE_SHORTCUTS) {
      add('Edit', native.label, describeKeys(native));
    }
    return rows;
  }, []);

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = ORDER.filter((g) => groups.has(g))
    .map((group) => ({
      group,
      rows: (groups.get(group) ?? []).filter((row) => tokens.every((t) => row.text.includes(t))),
    }))
    .filter((g) => g.rows.length > 0);
  const total = shown.reduce((n, g) => n + g.rows.length, 0);

  return (
    <Dialog title="Keyboard shortcuts">
      <div className="cheat-search">
        <Icon name="search" />
        <input
          ref={field}
          type="search"
          aria-label="Search shortcuts"
          placeholder="Search shortcuts, such as copy or ⌘D"
          value={query}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Escape clears a search first, and closes the dialog when there is none.
            if (e.key === 'Escape' && query) {
              e.preventDefault();
              setQuery('');
            }
          }}
        />
        <span className="sr-only" role="status">
          {total} {total === 1 ? 'shortcut' : 'shortcuts'}
        </span>
      </div>
      {/* Scrollable content must be reachable by keyboard so it can be scrolled without a mouse. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="dialog-body cheat-sheet" tabIndex={0} role="region" aria-label="Shortcuts">
        {shown.length === 0 && <p className="cheat-empty">No shortcuts match “{query.trim()}”.</p>}
        {shown.map(({ group, rows }) => (
          <section key={group}>
            <h3>{group}</h3>
            <dl>
              {rows.map((row) => (
                <div key={row.label} className="cheat-row">
                  <dt>{row.label}</dt>
                  <dd>
                    {row.keys.map((k, i) => (
                      <span key={k}>
                        {i > 0 && <span className="cheat-or"> or </span>}
                        <kbd>{k}</kbd>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
