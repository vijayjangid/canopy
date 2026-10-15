import { useEffect, useRef, useState } from 'react';
import { executeCommand } from '../editor/commands';
import { appContext } from '../editor/context';
import { COMMANDS, formatShortcut, type CommandId } from '../editor/shortcuts';
import { renameMap } from '../model';
import { settingsStore, useSettings, type ModeSetting } from '../settings';
import { getRepository, type MapSummary } from '../persistence';
import { canRedo, canUndo, canopyStore, useCanopy } from '../store';
import { Brand } from './Logo';
import { SaveBadge } from './SaveBadge';
import {
  importMapAsBranch,
  openMapFromFile,
  openSpecKitExample,
  openStoredMap,
  saveMapAsFile,
  startNewMap,
} from './fileActions';
import { Icon } from './icons';
import { DeleteMapConfirm } from './DeleteMapConfirm';
import { openDialog, openLeft } from './uiStore';
import { showToast } from './toast';
import './app-bar.css';

/** The map's name, with a chevron. It opens a menu of New, Open, Save, Export and your saved maps. */
function MapMenu({ onDeleteMap }: { onDeleteMap: (id: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MapSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const mapId = useCanopy((s) => s.mapId);
  const title = useCanopy((s) => s.doc.meta.title);
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const deletingRef = useRef(false);

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

  useEffect(() => {
    if (!renaming) return;
    field.current?.focus();
    field.current?.select();
  }, [renaming]);

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

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await onDeleteMap(target.id);
      setMaps((current) => current.filter((map) => map.id !== target.id));
      setDeleteTarget(null);
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : '';
      showToast(`Could not delete "${target.title || 'Untitled map'}"${detail}`);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  return (
    <div className="menu map-menu" ref={root}>
      <h1 className="map-title">
        {renaming ? (
          <input
            ref={field}
            aria-label="Map title"
            placeholder="Untitled map"
            value={title}
            spellCheck={false}
            onChange={(e) => {
              const { doc, commit } = canopyStore.getState();
              commit(renameMap(doc, e.target.value), { group: 'map-title' });
            }}
            onBlur={() => setRenaming(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.stopPropagation();
                setRenaming(false);
              }
            }}
          />
        ) : (
          <button
            type="button"
            className="map-menu-button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`File menu: ${title.trim() || 'Untitled map'}`}
            data-tip="Files and your maps. Double-click to rename"
            data-tip-side="bottom"
            onClick={() => setOpen((v) => !v)}
            onDoubleClick={() => {
              setOpen(false);
              setRenaming(true);
            }}
          >
            <span className="map-name" data-empty={title.trim() === '' || undefined}>
              {title.trim() || 'Untitled map'}
            </span>
            <Icon name="chevron-down" />
          </button>
        )}
      </h1>
      {open && (
        <div className="menu-list" role="menu" aria-label="File">
          {item('Rename…', '', () => setRenaming(true))}
          {item('New map', '', startNewMap)}
          {item('Open…', '', () => void openMapFromFile())}
          {item('Add a map as a branch…', '', () => void importMapAsBranch())}
          {item('Save a copy…', '', () => void saveMapAsFile())}
          {item('Export…', '⌘E', () => openLeft('export'))}
          <p className="menu-heading">Examples</p>
          {item('SpecKit example', '', openSpecKitExample)}
          {maps.length > 0 && <p className="menu-heading">Your maps</p>}
          {maps.map((m) => (
            <div key={m.id} className="menu-map-row" role="none">
              <button
                type="button"
                role="menuitemradio"
                className="menu-map"
                aria-checked={m.id === mapId}
                onClick={() => {
                  setOpen(false);
                  void openStoredMap(getRepository(), m.id);
                }}
              >
                <span>{m.title || 'Untitled map'}</span>
                <time dateTime={m.modified}>{new Date(m.modified).toLocaleDateString()}</time>
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-map-delete"
                aria-label={`Delete map ${m.title || 'Untitled map'}`}
                data-danger=""
                onClick={() => {
                  setOpen(false);
                  setDeleteTarget(m);
                }}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      )}
      {deleteTarget && (
        <DeleteMapConfirm
          map={deleteTarget}
          isCurrent={deleteTarget.id === mapId}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
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

const COLOUR_MODES: Array<{ value: ModeSetting; label: string; icon: 'auto' | 'sun' | 'moon' }> = [
  { value: 'auto', label: 'Auto', icon: 'auto' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

/** Auto, Light or Dark, kept in the bar so it is one click away. It belongs to this device. */
function ColourMode() {
  const mode = useSettings((s) => s.mode);
  return (
    <div className="segmented" role="group" aria-label="Colour mode">
      {COLOUR_MODES.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={mode === o.value}
          aria-label={o.label}
          data-tip={o.label}
          data-tip-side="bottom"
          data-icon-only
          onClick={() => settingsStore.getState().update({ mode: o.value })}
        >
          <Icon name={o.icon} />
        </button>
      ))}
    </div>
  );
}

/** A slim bar: the file menu and map title as a pair, and one way into every command. */
export function AppBar({ onDeleteMap }: { onDeleteMap: (id: string) => Promise<void> }) {
  return (
    <header className="app-bar">
      <div className="app-bar-start">
        <Brand />
        <MapMenu onDeleteMap={onDeleteMap} />
        <SaveBadge />
      </div>
      <History />
      <div className="app-actions">
        <ColourMode />
        <button
          type="button"
          className="app-search"
          aria-label="Search"
          data-tip="Search nodes, commands and filters (⌘F)"
          onClick={() => openDialog('palette')}
        >
          <Icon name="search" />
          <span>Search</span>
          <kbd>⌘F</kbd>
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
