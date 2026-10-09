import { useEffect, useId, useRef, type ReactNode } from 'react';
import { closeDialog } from './uiStore';
import './dialog.css';

interface Props {
  title: string;
  children: ReactNode;
  /** `compact` hides the header, for the command palette. */
  variant?: 'standard' | 'compact';
}

/** A modal built on the native dialog element, which handles focus, Esc and the page behind it. */
export function Dialog({ title, children, variant = 'standard' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // A press on the backdrop (outside the panel) closes it.
    const onPress = (e: MouseEvent) => {
      if (e.target === dialog) dialog?.close();
    };
    dialog?.addEventListener('mousedown', onPress);
    dialog?.addEventListener('close', closeDialog);
    return () => {
      // Leaving the DOM is enough to dismiss a modal. Calling close() here would queue a close
      // event that React's re-run of this effect would mistake for the person closing it.
      dialog?.removeEventListener('mousedown', onPress);
      dialog?.removeEventListener('close', closeDialog);
    };
  }, []);

  return (
    <dialog ref={ref} className="dialog" data-variant={variant} aria-labelledby={titleId}>
      <div className="dialog-panel">
        <header className={variant === 'compact' ? 'sr-only' : 'dialog-header'}>
          <h2 id={titleId}>{title}</h2>
          {variant === 'standard' && (
            <button type="button" aria-label="Close" onClick={() => ref.current?.close()}>
              ×
            </button>
          )}
        </header>
        {children}
      </div>
    </dialog>
  );
}
