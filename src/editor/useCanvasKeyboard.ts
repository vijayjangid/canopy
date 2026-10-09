import { useEffect, type RefObject } from 'react';
import { executeCommand } from './commands';
import { appContext } from './context';
import { findCommand } from './shortcuts';

const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]';
const CONTROLS = 'button, a, [role="button"]';

/** Runs shortcuts from the registry for key presses on the map. */
export function useCanvasKeyboard(host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const target = e.target instanceof Element ? e.target : null;
      const inTextField = target !== null && target.closest(TEXT_FIELDS) !== null;
      if (inTextField && !(e.metaKey || e.ctrlKey)) return;

      // Plain keys act only while the map itself has focus, so buttons keep Enter and Space.
      // Command shortcuts (Cmd/Ctrl) work anywhere on the page.
      const hasModifier = e.metaKey || e.ctrlKey;
      const onMap = target !== null && host.current?.contains(target) === true;
      if (!hasModifier && (!onMap || target?.closest(CONTROLS))) return;

      const command = findCommand(e);
      if (!command) return;
      if (inTextField && command.id !== 'filter.search') return;
      // A tap on Space edits, but Space is also how the view is panned, so the tool hook decides.
      if (command.id === 'topic.edit' && e.key === ' ') return;
      const handled = executeCommand(command.id, appContext, { key: e.key, shiftKey: e.shiftKey });
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [host]);
}
