import { type KeyboardEvent } from 'react';
import { focusCanvas } from '../canvas/layoutState';
import { ExportBody } from './ExportDialog';
import { Icon, type IconName } from './icons';
import { jumpFilter } from './filterNav';
import { useActiveFilter } from './filter';
import { TagsPanel } from './TagsPanel';
import { AppearanceBody } from './Preferences';
import {
  closeLeft,
  openDialog,
  openLeft,
  setFilter,
  setFilterMode,
  useUi,
  type LeftTab,
} from './uiStore';
import './panels.css';

const TABS: Array<{ id: LeftTab; label: string; icon: IconName }> = [
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'tags', label: 'Tags', icon: 'tag' },
  { id: 'export', label: 'Export', icon: 'export' },
];

/** The map panel on the left: settings, tags and export. */
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
      <button type="button" onClick={() => openDialog('palette')} data-tip="Change the Filter">
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
      <button
        type="button"
        aria-label="Previous match"
        onClick={() => jumpFilter(-1)}
        disabled={count === 0}
      >
        <Icon name="chevron-left" />
      </button>
      <button
        type="button"
        aria-label="Next match"
        onClick={() => jumpFilter(1)}
        disabled={count === 0}
      >
        <Icon name="chevron-right" />
      </button>
      <button type="button" aria-label="Turn the Filter off" onClick={() => setFilter(null)}>
        ×
      </button>
      <span className="sr-only" role="status">
        {count} {count === 1 ? 'match' : 'matches'}
      </span>
    </div>
  );
}
