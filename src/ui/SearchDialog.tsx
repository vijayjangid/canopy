import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ancestorsOf, planningOf, usedStickers } from '../model';
import { navigateToTopic } from '../canvas/navigation';
import { useCanopy } from '../store';
import { STICKERS } from '../stickers/catalog';
import { buildPalette, pushRecent } from './commandIndex';
import { Dialog } from './Dialog';
import { highlight } from './highlight';
import { Icon } from './icons';
import { QuickFilters } from './QuickFilters';
import { clearRecentSearches, loadRecentSearches, pushRecentSearch } from './recentSearches';
import { isExact, searchEverything, type SearchEntry } from './searchIndex';
import { closeDialog, setFilterText, toggleFilterChoice, updateFilter, uiStore } from './uiStore';
import './palette.css';

/** Commands offered when nothing is typed. The last one switches to the layout not in use. */
const COMMON = ['topic.addChild', 'topic.addPeerAfter', 'view.unfoldAll'];

/** One place to find a topic, run a command, or narrow the map by status, tag, sticker or due date. */
export function SearchDialog() {
  const doc = useCanopy((s) => s.doc);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState(loadRecentSearches);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const searching = query.trim() !== '';

  const commands = useMemo(() => buildPalette(), []);
  const pool = useMemo(() => {
    const out: SearchEntry[] = [];
    for (const topic of Object.values(doc.topics)) {
      const path = ancestorsOf(doc, topic.id)
        .reverse()
        .map((a) => a.title.trim() || 'Empty topic');
      out.push({
        id: `topic:${topic.id}`,
        kind: 'topic',
        label: topic.title.trim() || 'Empty topic',
        sub: path.length > 0 ? path.join(' › ') : 'Core',
        keys: [],
        run: () => navigateToTopic(topic.id),
      });
    }
    for (const c of commands) {
      out.push({
        id: c.id,
        kind: 'command',
        label: c.label,
        sub: c.group,
        keys: c.keys,
        run: c.run,
      });
    }
    const plan = planningOf(doc);
    const filterEntry = (id: string, label: string, sub: string, run: () => void): void => {
      out.push({ id: `filter:${id}`, kind: 'filter', label, sub, keys: [], run });
    };
    for (const s of plan.statusSet) {
      filterEntry(`status:${s.key}`, `Status: ${s.label}`, 'Show only these topics', () => {
        if (!uiStore.getState().filterSel.status.includes(s.key)) {
          toggleFilterChoice('status', s.key);
        }
      });
    }
    for (const t of plan.tags) {
      filterEntry(`tag:${t.key}`, `Tag: ${t.label}`, 'Show only these topics', () => {
        if (!uiStore.getState().filterSel.tags.includes(t.key)) toggleFilterChoice('tags', t.key);
      });
    }
    const used = usedStickers(doc);
    for (const s of STICKERS.filter((x) => used.has(x.key))) {
      filterEntry(`sticker:${s.key}`, `Sticker: ${s.name}`, 'Show only these topics', () => {
        if (!uiStore.getState().filterSel.stickers.includes(s.key)) {
          toggleFilterChoice('stickers', s.key);
        }
      });
    }
    filterEntry('due:overdue', 'Due: Overdue', 'Show only these topics', () =>
      updateFilter({ due: 'overdue' }),
    );
    filterEntry('due:week', 'Due: Due this week', 'Show only these topics', () =>
      updateFilter({ due: 'week' }),
    );
    return out;
  }, [doc, commands]);

  const textEntry = useMemo<SearchEntry[]>(
    () =>
      searching
        ? [
            {
              id: 'filter:text',
              kind: 'filter',
              label: `Highlight topics matching “${query.trim()}”`,
              sub: 'Fades everything else on the map',
              keys: [],
              action: true,
              run: () => setFilterText(query.trim()),
            },
          ]
        : [],
    [query, searching],
  );

  const sections = useMemo(() => {
    if (searching) return searchEverything(query, pool, textEntry);
    const byId = new Map(commands.map((c) => [c.id, c]));
    const otherLayout = doc.prefs.flow === 'right' ? 'prefs.flow.down' : 'prefs.flow.right';
    const entries = [...COMMON, otherLayout]
      .map((id) => byId.get(id))
      .filter((c) => c !== undefined)
      .map((c): SearchEntry => ({
        id: c.id,
        kind: 'command',
        label: c.label,
        sub: c.group,
        keys: c.keys,
        run: c.run,
      }));
    return entries.length > 0 ? [{ title: 'Common commands', entries }] : [];
  }, [searching, query, pool, textEntry, commands, doc.prefs.flow]);

  const results = useMemo(() => sections.flatMap((s) => s.entries), [sections]);
  const current = results[Math.min(active, results.length - 1)];

  useEffect(() => {
    root.current
      ?.querySelector<HTMLElement>('[role="option"][data-active]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const choose = (entry: SearchEntry) => {
    if (searching) pushRecentSearch(query);
    if (entry.kind === 'command') pushRecent(entry.id);
    root.current?.closest('dialog')?.close();
    closeDialog();
    // Commands act on the selection, so they run once focus is back on the map.
    setTimeout(entry.run, 0);
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

  const ask = (text: string) => {
    setQuery(text);
    setActive(0);
    input.current?.focus();
  };

  return (
    <Dialog title="Search" variant="compact">
      <div ref={root} className="palette search">
        <div className="palette-search">
          <Icon name="search" />
          <input
            ref={input}
            className="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
            aria-label="Search topics, commands, status and more"
            placeholder="Search topics, commands, status, tags…"
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
        <div className="search-body">
          {!searching && recents.length > 0 && (
            <section className="search-recents" aria-label="Recent searches">
              <h3>Recent searches</h3>
              <ul>
                {recents.map((text) => (
                  <li key={text}>
                    <button type="button" onClick={() => ask(text)}>
                      <Icon name="search" />
                      <span>{text}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="quick-clear"
                aria-label="Clear recent searches"
                onClick={() => setRecents(clearRecentSearches())}
              >
                <Icon name="trash" />
                Clear all
              </button>
            </section>
          )}
          {!searching && <QuickFilters />}
          <ul id={listId} className="palette-list search-list" role="listbox" aria-label="Results">
            {sections.map((section) => (
              <SectionRows
                key={section.title}
                listId={listId}
                title={section.title}
                entries={section.entries}
                current={current}
                query={query}
                searching={searching}
                onActive={(entry) => setActive(results.indexOf(entry))}
                onChoose={choose}
              />
            ))}
            {searching && results.length === 0 && <li className="palette-empty">No matches</li>}
          </ul>
        </div>
        <div className="palette-footer">
          <span className="palette-help" aria-hidden="true">
            <kbd>↑</kbd>
            <kbd>↓</kbd> move <kbd>↵</kbd> open <kbd>esc</kbd> close
          </span>
          <span role="status">
            {searching ? (results.length === 0 ? 'No matches' : `${results.length} results`) : ''}
          </span>
        </div>
      </div>
    </Dialog>
  );
}

function SectionRows({
  listId,
  title,
  entries,
  current,
  query,
  searching,
  onActive,
  onChoose,
}: {
  listId: string;
  title: string;
  entries: SearchEntry[];
  current: SearchEntry | undefined;
  query: string;
  searching: boolean;
  onActive: (entry: SearchEntry) => void;
  onChoose: (entry: SearchEntry) => void;
}) {
  const results = entries.filter((e) => !e.action);
  const actions = entries.filter((e) => e.action);
  const row = (entry: SearchEntry) => {
    const isActive = entry === current;
    const exact = !entry.action && isExact(entry, query);
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
        data-exact={exact || undefined}
        data-action={entry.action || undefined}
        onMouseMove={() => onActive(entry)}
        onClick={() => onChoose(entry)}
      >
        {entry.action && <Icon name="filter" />}
        <span className="palette-text">
          <span className="palette-label">
            {entry.action ? entry.label : highlight(entry.label, query)}
          </span>
          {(searching || entry.kind === 'command') && (
            <span className="palette-sub">{entry.sub}</span>
          )}
        </span>
        <span className="palette-keys">
          {exact && <span className="search-exact">Exact match</span>}
          {entry.keys.map((k) => (
            <kbd key={k}>{k}</kbd>
          ))}
        </span>
      </li>
    );
  };
  return (
    <>
      <li className="palette-group" role="presentation">
        {title}
      </li>
      {results.map(row)}
      {actions.length > 0 && results.length > 0 && (
        <li className="search-divider" role="presentation" />
      )}
      {actions.map(row)}
    </>
  );
}
