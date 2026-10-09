import { useEffect, useRef, useState } from 'react';
import { executeCommand } from '../editor/commands';
import { appContext } from '../editor/context';
import { COMMANDS, formatShortcut, type CommandId } from '../editor/shortcuts';
import { renameMap } from '../model';
import { getRepository, type MapSummary } from '../persistence';
import { canRedo, canUndo, canopyStore, useCanopy } from '../store';
import { Brand } from './Logo';
import { SaveBadge } from './SaveBadge';
import { openMapFromFile, openStoredMap, saveMapAsFile, startNewMap } from './fileActions';
import { Icon } from './icons';
import { openDialog, openLeft } from './uiStore';
import './app-bar.css';

/** New, open, save, export and the list of saved maps, in one menu. */
function FileMenu() {
  const [open, setOpen] = useState(false);
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const mapId = useCanopy((s) => s.mapId);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void getRepository()
      .list()
      .then((list) => alive && setMaps(list));
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e instanceof MouseEvent && root.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      alive = false;
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = (label: string, hint: string, run: () => void) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        run();
      }}
    >
      <span>{label}</span>
      <span className="menu-hint">{hint}</span>
    </button>
  );

  return (
    <div className="menu" ref={root}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="File"
        data-tip="Files and your maps"
        data-tip-side="bottom"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="folder" />
        <Icon name="chevron-down" />
      </button>
      {open && (
        <div className="menu-list" role="menu" aria-label="File">
          {item('New map', '', startNewMap)}
          {item('Open…', '', () => void openMapFromFile())}
          {item('Save a copy…', '', () => void saveMapAsFile())}
          {item('Export…', '⌘E', () => openLeft('export'))}
          {maps.length > 0 && <p className="menu-heading">Your maps</p>}
          {maps.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === mapId}
              onClick={() => {
                setOpen(false);
                void openStoredMap(getRepository(), m.id);
              }}
            >
              <span>{m.title || 'Untitled map'}</span>
              <time dateTime={m.modified}>{new Date(m.modified).toLocaleDateString()}</time>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const shortcutOf = (id: CommandId) => {
  const first = COMMANDS.find((c) => c.id === id)?.shortcuts[0];
  return first ? ` (${formatShortcut(first)})` : '';
};

/** Undo and redo as plain buttons, dimmed when there is nothing to step through. */
function History() {
  const undoable = useCanopy(canUndo);
  const redoable = useCanopy(canRedo);
  const step = (id: CommandId, label: string, icon: 'undo' | 'redo', enabled: boolean) => (
    <button
      type="button"
      className="history-button"
      aria-label={label}
      data-tip={`${label}${shortcutOf(id)}`}
      data-tip-side="bottom"
      disabled={!enabled}
      onClick={() => void executeCommand(id, appContext)}
    >
      <Icon name={icon} />
    </button>
  );
  return (
    <div className="history" role="group" aria-label="History">
      {step('edit.undo', 'Undo', 'undo', undoable)}
      {step('edit.redo', 'Redo', 'redo', redoable)}
    </div>
  );
}

/** A slim bar: the file menu and map title as a breadcrumb, and one way into every command. */
export function AppBar() {
  const title = useCanopy((s) => s.doc.meta.title);
  return (
    <header className="app-bar">
      <Brand />
      <div className="crumbs">
        <FileMenu />
        <span className="crumb-sep" aria-hidden="true">
          /
        </span>
        <h1 className="map-title">
          <input
            aria-label="Map title"
            placeholder="Untitled map"
            value={title}
            spellCheck={false}
            onChange={(e) => {
              const { doc, commit } = canopyStore.getState();
              commit(renameMap(doc, e.target.value), { group: 'map-title' });
            }}
          />
        </h1>
      </div>
      <SaveBadge />
      <div className="app-actions">
        <History />
        <button
          type="button"
          className="app-search"
          aria-label="Command palette"
          data-tip="Search or run any command (⌘K)"
          onClick={() => openDialog('palette')}
        >
          <Icon name="search" />
          <span>Search commands</span>
          <kbd>⌘K</kbd>
        </button>
        <button
          type="button"
          aria-label="Keyboard shortcuts"
          data-tip="Keyboard shortcuts (?)"
          data-tip-side="bottom"
          onClick={() => openDialog('shortcuts')}
        >
          ?
        </button>
      </div>
    </header>
  );
}
