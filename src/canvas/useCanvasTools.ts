import { useEffect, type RefObject } from 'react';
import { executeCommand } from '../editor/commands';
import { appContext } from '../editor/context';
import { isMac } from '../editor/shortcuts';
import { canopyStore } from '../store';
import { takePanned, toolStore } from './toolStore';

const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]';
const CONTROLS = 'button, a, [role="button"]';

/**
 * Keeps track of the keys that borrow a tool: Space pans, Cmd (Ctrl) zooms and Alt zooms out.
 * A tap on Space, with no panning in between, still edits the picked topic.
 */
export function useCanvasTools(host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const mods = (e: KeyboardEvent) => {
      const zoomKey = isMac() ? e.metaKey : e.ctrlKey;
      const { zoomKey: z, alt: a } = toolStore.getState();
      if (z !== zoomKey || a !== e.altKey) toolStore.setState({ zoomKey, alt: e.altKey });
    };

    const onMap = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || target.closest(TEXT_FIELDS) || target.closest(CONTROLS)) return false;
      // With nothing focused the keys still belong to the map, as there is nothing else to use them.
      return target === document.body || host.current?.contains(target) === true;
    };

    const down = (e: KeyboardEvent) => {
      mods(e);
      if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (!onMap(e)) return;
      e.preventDefault();
      if (!e.repeat && !toolStore.getState().space) {
        takePanned();
        toolStore.setState({ space: true });
      }
    };

    const up = (e: KeyboardEvent) => {
      mods(e);
      if (e.key !== ' ' || !toolStore.getState().space) return;
      toolStore.setState({ space: false });
      const tapped = !takePanned();
      const { picked, editing } = canopyStore.getState();
      if (tapped && picked && editing === null) {
        executeCommand('topic.edit', appContext, { key: ' ' });
      }
    };

    const reset = () => {
      toolStore.setState({ space: false, zoomKey: false, alt: false });
      takePanned();
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', reset);
    };
  }, [host]);
}
