import { useEffect, type RefObject } from 'react';
import { copySelection, pasteClipboard } from './clipboard';
import { appContext } from './context';

const TEXT_FIELDS = 'input, textarea, select, [contenteditable="true"]';

/** Copy, cut and paste on the map. Text fields keep their own behaviour. */
export function useClipboard(host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    // The paste event does not say whether Shift was held, so remember the key press.
    let pasteAsPeer = false;
    const onKey = (e: KeyboardEvent) => {
      pasteAsPeer = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v';
    };

    const applies = (e: ClipboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(TEXT_FIELDS)) return false;
      return (
        target === document.body || (target !== null && host.current?.contains(target) === true)
      );
    };

    const onCopy = (e: ClipboardEvent) => {
      if (!e.clipboardData || !applies(e)) return;
      if (copySelection(appContext, e.clipboardData)) e.preventDefault();
    };
    const onCut = (e: ClipboardEvent) => {
      if (!e.clipboardData || !applies(e)) return;
      if (copySelection(appContext, e.clipboardData, true)) e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData || !applies(e)) return;
      if (pasteClipboard(appContext, e.clipboardData, pasteAsPeer)) e.preventDefault();
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('copy', onCopy);
    window.addEventListener('cut', onCut);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('copy', onCopy);
      window.removeEventListener('cut', onCut);
      window.removeEventListener('paste', onPaste);
    };
  }, [host]);
}
