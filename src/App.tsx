import { useEffect, useLayoutEffect } from 'react';
import { LiveRegion } from './a11y';
import { ContextMenu } from './ui/ContextMenu';
import { TooltipHost } from './ui/Tooltip';
import {
  AppBar,
  Dialogs,
  Inspector,
  LeftPanel,
  FilterPill,
  ToastHost,
  TrailBar,
  TrailPill,
} from './ui';
import { Canvas } from './canvas';
import { generateDemoMap } from './dev/demo';
import { attachAutosave, getRepository, openInitialMap, rememberOpenedMap } from './persistence';
import { canopyStore, useCanopy } from './store';
import { reportSave } from './ui/saveStatus';
import { setZen, uiStore, useUi } from './ui/uiStore';
import { applyAppearance } from './theme';
import './app.css';

/** `?demo=60` loads a generated map without touching saved data (development only). */
function demoFromUrl() {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(window.location.search);
  const count = Number(params.get('demo'));
  if (!Number.isFinite(count) || count <= 0) return null;
  return generateDemoMap(
    count,
    params.get('flow') === 'down' ? 'down' : 'right',
    7,
    params.get('plan') === '1',
  );
}

export function App() {
  const ready = useCanopy((s) => s.ready);
  const look = useCanopy((s) => s.doc.prefs.look);
  const chips = useCanopy((s) => s.doc.prefs.chips);
  const showLevels = useCanopy((s) => s.doc.prefs.showLevels);

  const zen = useUi((s) => s.zen);

  // Escape leaves Zen, ahead of anything else that would use the key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !uiStore.getState().zen) return;
      if (canopyStore.getState().editing !== null || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      e.stopPropagation();
      setZen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // Layout effect, so a map never shows once in the wrong Look.
  useLayoutEffect(() => {
    applyAppearance({ look, chips, showLevels });
  }, [look, chips, showLevels]);

  useEffect(() => {
    const demo = demoFromUrl();
    if (demo) {
      canopyStore.getState().load('m_demo', demo);
      return;
    }

    let disposed = false;
    let stop = () => {};
    const repo = getRepository();
    void openInitialMap(repo).then(({ mapId, doc }) => {
      if (disposed) return;
      canopyStore.getState().load(mapId, doc);
      rememberOpenedMap(mapId);
      stop = attachAutosave(canopyStore, repo, { onStatus: reportSave }).dispose;
    });
    return () => {
      disposed = true;
      stop();
    };
  }, []);

  return (
    <div className="app" data-zen={zen || undefined}>
      <AppBar />
      <main className="app-main">
        {ready ? <Canvas /> : null}
        <div className="panel-layer">
          <LeftPanel />
          <FilterPill />
          <TrailPill />
          <Inspector />
        </div>
        <ContextMenu />
        <TooltipHost />
        {zen && (
          <button type="button" className="zen-exit" onClick={() => setZen(false)}>
            Exit Zen <kbd>Esc</kbd>
          </button>
        )}
      </main>
      <TrailBar />
      <LiveRegion />
      <ToastHost />
      <Dialogs />
    </div>
  );
}
