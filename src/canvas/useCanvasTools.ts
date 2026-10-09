import { useEffect, type RefObject } from 'react';
import { executeCommand } from '../editor/commands';
import { appContext } from '../editor/context';
import { isMac } from '../editor/shortcuts';
import { canopyStore } from '../store';
import { releaseHeldKeys, syncModifiers, takePanned, toolStore } from './toolStore';

const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]';
const CONTROLS = 'button, a, [role="button"]';

/**
 * Keeps track of the keys that borrow a tool: Space pans, Cmd (Ctrl) zooms and Alt zooms out.
 * A tap on Space, with no panning in between, still edits the picked topic.
 *
 * Tracking runs in the capture phase on the window, so no field or panel that handles a key itself
 * can hide a press or release from it. The pointer and wheel handlers also read the modifiers from
 * their own events, so a modifier the page missed is picked up the moment it matters.
 */
export function useCanvasTools(host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onMap = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target || target.closest(TEXT_FIELDS) || target.closest(CONTROLS)) return false;
      // With nothing focused the keys still belong to the map, as there is nothing else to use them.
      return target === document.body || host.current?.contains(target) === true;
    };

    const trackDown = (e: KeyboardEvent) => {
      syncModifiers(e);
      // A held Space keeps sending key-downs. If a missed key-up cleared it, the next one brings it back.
      if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey || toolStore.getState().space) return;
      if (!onMap(e)) return;
      if (!e.repeat) takePanned();
      toolStore.setState({ space: true });
    };

    // Plain Space is the pan key, so it must not scroll the page or press a focused control.
    const claimSpace = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      if (toolStore.getState().space && onMap(e)) e.preventDefault();
    };

    const trackUp = (e: KeyboardEvent) => {
      syncModifiers(e);
      if (e.key === ' ') {
        if (!toolStore.getState().space) return;
        toolStore.setState({ space: false });
        const tapped = !takePanned();
        const { picked, editing } = canopyStore.getState();
        if (tapped && picked && editing === null) {
          executeCommand('topic.edit', appContext, { key: ' ' });
        }
        return;
      }
      // The Mac sends no key-up for other keys let go while Cmd is down, so a Space released that
      // way would stay "held". Letting go of Cmd is the first moment we can know.
      if (e.key === 'Meta' && isMac() && toolStore.getState().space) {
        toolStore.setState({ space: false });
        takePanned();
      }
    };

    const reset = () => {
      releaseHeldKeys();
      takePanned();
    };
    const onHidden = () => {
      if (document.hidden) reset();
    };

    window.addEventListener('keydown', trackDown, true);
    window.addEventListener('keydown', claimSpace);
    window.addEventListener('keyup', trackUp, true);
    // Which keys are down is unknown after the page was away, and the next event says.
    window.addEventListener('blur', reset);
    window.addEventListener('focus', reset);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('keydown', trackDown, true);
      window.removeEventListener('keydown', claimSpace);
      window.removeEventListener('keyup', trackUp, true);
      window.removeEventListener('blur', reset);
      window.removeEventListener('focus', reset);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [host]);
}
