import { useLayoutEffect, useRef } from 'react';
import { panelInsets } from '../canvas/panelInsets';
import { useCanopy } from '../store';
import { useUi } from '../ui/uiStore';
import { hasChildren, isExpansion } from '../model';
import { useGrowth } from '../canvas/growthStore';
import { useSettings } from '../settings';
import { hintsFor } from './hints';
import './hint-strip.css';

/** A short row of shortcuts for the current selection, shown while the map is in use. */
export function HintStrip() {
  const editing = useCanopy((s) => s.editing !== null);
  const selectionCount = useCanopy((s) => s.selection.length);
  const focusIsCore = useCanopy((s) => s.focus === s.doc.coreId);
  const focusHasChildren = useCanopy((s) => hasChildren(s.doc, s.focus));
  const focusFolded = useCanopy((s) => s.doc.topics[s.focus]?.folded === true);
  const canvasFocused = useGrowth((s) => s.canvasFocused);
  const hintsOn = useSettings((s) => s.hints);
  const expansion = useSettings((s) => s.textExpansion);
  const expressing = useCanopy(
    (s) => s.editing !== null && isExpansion(s.doc.topics[s.editing]?.title ?? ''),
  );

  const ref = useRef<HTMLDivElement>(null);
  const leftOpen = useUi((s) => s.leftOpen);
  const inspectorOpen = useUi((s) => s.inspectorOpen);

  // Centre the strip in the room the open panels leave, so they never cover it.
  useLayoutEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const place = () => {
      const { left, right } = panelInsets(host);
      const room = host.clientWidth - left - right;
      el.style.left = `${left + room / 2}px`;
      el.style.maxWidth = `${Math.max(240, room - 32)}px`;
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [leftOpen, inspectorOpen]);

  const visible = hintsOn && (editing || canvasFocused);
  const hints = hintsFor({
    editing,
    selectionCount,
    focusIsCore,
    focusHasChildren,
    focusFolded,
    expansion,
    expressing: expansion && expressing,
  });

  return (
    <div ref={ref} className="hint-strip" data-visible={visible || undefined} aria-hidden="true">
      {hints.map((hint) => (
        <span key={hint.label} className="hint">
          <kbd>{hint.keys}</kbd> {hint.label}
        </span>
      ))}
    </div>
  );
}
