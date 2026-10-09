import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { focusCanvas } from '../canvas/layoutState';
import { StatusIcon } from '../canvas/Chips';
import { readExportTheme } from '../io/exportTheme';
import { planningOf, usedStickers } from '../model';
import { StickerArt } from '../stickers/art';
import { STICKERS } from '../stickers/catalog';
import { useThemeVersion } from '../theme';
import { useCanopy } from '../store';
import { DateFilter } from './DateFilter';
import { ExportBody } from './ExportDialog';
import { Icon, type IconName } from './icons';
import { jumpFilter } from './filterNav';
import { useActiveFilter } from './filter';
import { TagsPanel } from './TagsPanel';
import { AppearanceBody } from './Preferences';
import {
  closeLeft,
  openLeft,
  setFilter,
  setFilterMode,
  setFilterText,
  toggleFilterChoice,
  toggleFilterDue,
  useUi,
  type LeftTab,
} from './uiStore';
import './panels.css';

const TABS: Array<{ id: LeftTab; label: string; icon: IconName }> = [
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'filter', label: 'Filter', icon: 'filter' },
  { id: 'tags', label: 'Tags', icon: 'tag' },
  { id: 'export', label: 'Export', icon: 'export' },
];

function ChoiceList({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="filter-group">
      <h3>{label}</h3>
      <ul className="filter-list" aria-label={label}>
        {children}
      </ul>
    </section>
  );
}

function Choice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button type="button" aria-pressed={on} onClick={onClick}>
        {children}
      </button>
    </li>
  );
}

function FilterBody() {
  const plan = useCanopy((s) => planningOf(s.doc));
  const doc = useCanopy((s) => s.doc);
  const used = useMemo(() => usedStickers(doc), [doc]);
  const active = useActiveFilter();
  const sel = useUi((s) => s.filterSel);
  const mode = useUi((s) => s.filterMode);
  const count = active?.result.ordered.length ?? 0;
  const themeVersion = useThemeVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const theme = useMemo(() => readExportTheme(), [themeVersion]);
  const nudge = useUi((s) => s.searchNudge);
  const search = useRef<HTMLInputElement>(null);

  // Asking to search puts the cursor in the box.
  useEffect(() => {
    if (nudge > 0) search.current?.focus();
  }, [nudge]);

  return (
    <div className="filter-panel">
      <div className="filter-search">
        <Icon name="search" />
        <input
          ref={search}
          type="search"
          aria-label="Search topics and lines"
          placeholder="Search topics and lines"
          spellCheck={false}
          value={sel.text}
          onChange={(e) => setFilterText(e.target.value)}
          onKeyDown={(e) => {
            // Escape empties the box first, and only then closes the panel.
            if (e.key === 'Escape' && sel.text) {
              e.preventDefault();
              setFilterText('');
            }
          }}
        />
      </div>
      <p className="pref-hint">Search, or tick options. Each group you use narrows the result.</p>
      <ChoiceList label="Due date">
        <Choice on={sel.due === 'overdue'} onClick={() => toggleFilterDue('overdue')}>
          Overdue
        </Choice>
        <Choice on={sel.due === 'week'} onClick={() => toggleFilterDue('week')}>
          Due this week
        </Choice>
        <Choice on={sel.due === 'range'} onClick={() => toggleFilterDue('range')}>
          Date range
        </Choice>
      </ChoiceList>
      {sel.due === 'range' && <DateFilter />}
      <ChoiceList label="Status">
        {plan.statusSet.map((s) => (
          <Choice
            key={s.key}
            on={sel.status.includes(s.key)}
            onClick={() => toggleFilterChoice('status', s.key)}
          >
            <StatusIcon def={s} theme={theme} />
            {s.label}
          </Choice>
        ))}
      </ChoiceList>
      {plan.tags.length > 0 && (
        <ChoiceList label="Tags">
          {plan.tags.map((t) => (
            <Choice
              key={t.key}
              on={sel.tags.includes(t.key)}
              onClick={() => toggleFilterChoice('tags', t.key)}
            >
              <span
                className="tag-dot"
                aria-hidden="true"
                style={{ ['--tag-color' as string]: t.color }}
              />
              {t.label}
            </Choice>
          ))}
        </ChoiceList>
      )}
      {used.size > 0 && (
        <ChoiceList label="Stickers">
          {STICKERS.filter((s) => used.has(s.key)).map((s) => (
            <Choice
              key={s.key}
              on={sel.stickers.includes(s.key)}
              onClick={() => toggleFilterChoice('stickers', s.key)}
            >
              <svg className="filter-sticker" viewBox="-2 -2 36 38" aria-hidden="true">
                <StickerArt name={s.key} />
              </svg>
              {s.name}
            </Choice>
          ))}
        </ChoiceList>
      )}
      {active && (
        <>
          <div className="pref">
            <span className="pref-label">Show matches</span>
            <div className="segmented" role="group" aria-label="How the Filter shows matches">
              <button
                type="button"
                aria-pressed={mode === 'dim'}
                onClick={() => setFilterMode('dim')}
              >
                Highlight
              </button>
              <button
                type="button"
                aria-pressed={mode === 'isolate'}
                onClick={() => setFilterMode('isolate')}
              >
                Hide the rest
              </button>
            </div>
          </div>
          <p className="filter-count" role="status" data-state={count === 0 ? 'empty' : 'found'}>
            {count === 0
              ? 'Nothing matches. Try fewer choices.'
              : `${count} ${count === 1 ? 'match' : 'matches'}`}
          </p>
          <div className="filter-actions">
            <button type="button" onClick={() => jumpFilter(-1)} disabled={count === 0}>
              Previous
            </button>
            <button type="button" onClick={() => jumpFilter(1)} disabled={count === 0}>
              Next
            </button>
            <button type="button" onClick={() => setFilter(null)}>
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** The map panel on the left: appearance, filter, tags and export. */
export function LeftPanel() {
  const open = useUi((s) => s.leftOpen);
  const tab = useUi((s) => s.leftTab);
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  // Closed, the tabs stay as a strip of icons and names. A click opens the panel beneath it.
  if (!open) {
    return (
      <nav className="panel panel-left panel-strip" aria-label="Map tools">
        <div className="panel-tabs">
          {TABS.map(({ id, label, icon }) => (
            <button key={id} type="button" onClick={() => openLeft(id)}>
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  }

  const collapse = () => {
    closeLeft();
    focusCanvas();
  };

  const onTabKey = (e: KeyboardEvent) => {
    const at = TABS.findIndex((t) => t.id === tab);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return;
    e.preventDefault();
    const next = TABS[(at + step + TABS.length) % TABS.length];
    if (next) {
      openLeft(next.id);
      requestAnimationFrame(() => document.getElementById(`left-tab-${next.id}`)?.focus());
    }
  };

  return (
    // Escape works from anywhere inside the panel, so the listener sits on the landmark itself.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <aside
      className="panel panel-left"
      aria-label="Map panel"
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Escape' && !e.defaultPrevented) {
          e.preventDefault();
          collapse();
        }
      }}
    >
      <header className="panel-header">
        <div className="panel-tabs" role="tablist" aria-label="Map panel sections">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              id={`left-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="left-panel-body"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => (tab === id ? collapse() : openLeft(id))}
              onKeyDown={onTabKey}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="panel-collapse"
          aria-label="Close panel"
          data-tip="Close"
          data-tip-side="bottom"
          onClick={collapse}
        >
          <Icon name="close" />
        </button>
      </header>
      <div
        className="panel-scroll"
        id="left-panel-body"
        role="tabpanel"
        aria-labelledby={`left-tab-${tab}`}
      >
        <h2 className="panel-title sr-only">{current?.label}</h2>
        {tab === 'settings' && <AppearanceBody />}
        {tab === 'filter' && <FilterBody />}
        {tab === 'tags' && <TagsPanel />}
        {tab === 'export' && <ExportBody />}
      </div>
    </aside>
  );
}

/** Shows the Filter that is on, as a small floating pill over the map. */
export function FilterPill() {
  const active = useActiveFilter();
  const mode = useUi((s) => s.filterMode);
  if (!active) return null;
  const count = active.result.ordered.length;
  return (
    <div className="filter-control" role="group" aria-label="Filter">
      <button type="button" onClick={() => openLeft('filter')} data-tip="Filter settings">
        <Icon name="filter" />
        <span>
          Filter: {active.filter.name} ·{' '}
          <b className="filter-pill-count" data-state={count === 0 ? 'empty' : 'found'}>
            {count}
          </b>
        </span>
      </button>
      <div className="segmented" role="group" aria-label="How the Filter shows matches">
        <button type="button" aria-pressed={mode === 'dim'} onClick={() => setFilterMode('dim')}>
          Highlight
        </button>
        <button
          type="button"
          aria-pressed={mode === 'isolate'}
          onClick={() => setFilterMode('isolate')}
        >
          Isolate
        </button>
      </div>
      <button type="button" aria-label="Turn the Filter off" onClick={() => setFilter(null)}>
        ×
      </button>
      <span className="sr-only" role="status">
        {count} {count === 1 ? 'match' : 'matches'}
      </span>
    </div>
  );
}
