import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Dialog } from './Dialog';
import { highlight } from './highlight';
import { Icon } from './icons';
import { closeDialog } from './uiStore';
import {
  buildPalette,
  loadRecent,
  pushRecent,
  searchPalette,
  type PaletteEntry,
} from './commandIndex';
import './palette.css';

const MAX_RESULTS = 60;
const MAX_RECENT = 4;

interface PaletteProps {
  title?: string;
  placeholder?: string;
  /** Builds the entries, from what has been typed. Defaults to every app command. */
  source?: (query: string) => PaletteEntry[];
  /** Remember what was run, and list it first. */
  remember?: boolean;
  /** Run the choice before closing, for choices that change the map and must act on what is selected now. */
  immediate?: boolean;
  /** Optional action shown beside the keyboard help. */
  footerAction?: { label: string; run: () => void };
  /** Describes the result type instead of commands, for specialized search palettes. */
  resultLabel?: string;
}

type Row = { kind: 'heading'; label: string } | { kind: 'entry'; entry: PaletteEntry };

/** Find and run any action by typing part of its name. */
export function Palette({
  title = 'Command palette',
  placeholder = 'Type a command',
  source,
  remember = true,
  immediate = false,
  footerAction,
  resultLabel = 'commands',
}: PaletteProps = {}) {
  const commands = useMemo(() => buildPalette(), []);
  const [query, setQuery] = useState('');
  const entries = useMemo(() => (source ? source(query) : commands), [source, query, commands]);
  const [recent, setRecent] = useState(loadRecent);
  const [active, setActive] = useState(0);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const searching = query.trim() !== '';

  // Searching gives one ranked list. Otherwise the commands sit under headings, the ones just used first.
  const { rows, results } = useMemo(() => {
    if (searching) {
      const found = searchPalette(entries, query, recent).slice(0, MAX_RESULTS);
      return { rows: found.map((entry): Row => ({ kind: 'entry', entry })), results: found };
    }
    const byId = new Map(entries.map((e) => [e.id, e]));
    const used = remember
      ? recent
          .map((id) => byId.get(id))
          .filter((e): e is PaletteEntry => e !== undefined)
          .slice(0, MAX_RECENT)
      : [];
    const skip = new Set(used.map((e) => e.id));
    const groups = new Map<string, PaletteEntry[]>();
    for (const entry of entries) {
      if (skip.has(entry.id)) continue;
      const group = groups.get(entry.group);
      if (group) group.push(entry);
      else groups.set(entry.group, [entry]);
    }
    const out: Row[] = [];
    const ordered: PaletteEntry[] = [];
    const resultLimit = MAX_RESULTS + (remember ? MAX_RECENT : 0);
    const add = (label: string, list: PaletteEntry[]) => {
      const visible = list.slice(0, resultLimit - ordered.length);
      if (visible.length === 0) return;
      out.push({ kind: 'heading', label });
      for (const entry of visible) {
        out.push({ kind: 'entry', entry });
        ordered.push(entry);
      }
    };
    add('Recent', used);
    for (const [group, list] of groups) {
      if (ordered.length >= resultLimit) break;
      add(group, list);
    }
    return { rows: out, results: ordered.slice(0, resultLimit) };
  }, [entries, query, recent, remember, searching]);

  const current = results[Math.min(active, results.length - 1)];

  // Keep the chosen row in view as the arrow keys move through a long list.
  useEffect(() => {
    root.current
      ?.querySelector<HTMLElement>('[role="option"][data-active]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const choose = (entry: PaletteEntry) => {
    if (remember) setRecent(pushRecent(entry.id, recent));
    // Closing the dialog first returns focus to the map, so the command acts where the person was.
    root.current?.closest('dialog')?.close();
    closeDialog();
    if (immediate) entry.run();
    else setTimeout(entry.run, 0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (results.length === 0 ? 0 : (a + step + results.length) % results.length));
    } else if (e.key === 'Enter' && current) {
      e.preventDefault();
      choose(current);
    }
  };

  return (
    <Dialog title={title} variant="compact">
      <div ref={root} className="palette">
        <div className="palette-search">
          <Icon name="search" />
          <input
            className="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            aria-label={placeholder}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        <ul id={listId} className="palette-list" role="listbox" aria-label={resultLabel}>
          {rows.map((row) => {
            if (row.kind === 'heading') {
              return (
                <li key={`h-${row.label}`} className="palette-group" role="presentation">
                  {row.label}
                </li>
              );
            }
            const { entry } = row;
            const isActive = entry === current;
            return (
              // The input drives the list from the keyboard, so options only need a click handler.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={entry.id}
                id={`${listId}-${entry.id}`}
                role="option"
                aria-selected={isActive}
                data-active={isActive || undefined}
                data-searching={searching || undefined}
                onMouseMove={() => setActive(results.indexOf(entry))}
                onClick={() => choose(entry)}
              >
                <span className="palette-text">
                  <span className="palette-label">{highlight(entry.label, query)}</span>
                  {searching && <span className="palette-sub">{entry.group}</span>}
                </span>
                <span className="palette-keys">
                  {entry.keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </span>
              </li>
            );
          })}
          {results.length === 0 && <li className="palette-empty">No matching {resultLabel}</li>}
        </ul>
        <div className="palette-footer">
          <span className="palette-help" aria-hidden="true">
            <kbd>↑</kbd>
            <kbd>↓</kbd> move <kbd>↵</kbd> run <kbd>esc</kbd> close
          </span>
          {footerAction && (
            <button type="button" className="palette-footer-action" onClick={footerAction.run}>
              {footerAction.label}
            </button>
          )}
          <span role="status">
            {results.length === 0
              ? `No matching ${resultLabel}`
              : `${results.length} ${resultLabel}`}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
