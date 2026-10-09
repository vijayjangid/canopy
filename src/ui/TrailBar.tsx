import { useLayoutEffect, useRef, useState } from 'react';
import { EXPAND_PREFIX, ancestorsOf, type Topic } from '../model';
import { focusCanvas } from '../canvas/layoutState';
import { useSettings } from '../settings';
import { canopyStore, useCanopy } from '../store';
import { Icon } from './icons';
import { showToast } from './toast';
import { setFocusBranch, useUi } from './uiStore';

const nameOf = (t: Topic) => t.title.trim().replace(/\s+/g, ' ') || 'Empty topic';

/**
 * How many levels, counted from the end, to show beside the first. `null` shows the whole path.
 * Levels are only folded into an ellipsis when the whole path does not fit in `room`, and then as
 * few as possible. `widths` are the natural widths of each level, and `gap` is the ellipsis's.
 */
export function levelsToShow(widths: readonly number[], gap: number, room: number): number | null {
  const total = widths.reduce((sum, w) => sum + w, 0);
  if (widths.length <= 2 || total <= room) return null;
  const first = widths[0] ?? 0;
  let tail = 0;
  let keep = 0;
  // Grow the tail from the current topic backwards for as long as it fits beside the first level.
  for (let i = widths.length - 1; i >= 1; i--) {
    tail += widths[i] ?? 0;
    if (first + gap + tail > room) break;
    keep = widths.length - i;
  }
  // Even the first level, the ellipsis and the current topic may not fit. Names shorten then.
  return Math.max(1, Math.min(keep, widths.length - 2));
}

/** A status bar along the bottom with the path from the Core down to the focused topic. */
export function TrailBar() {
  const on = useSettings((s) => s.trail);
  const alone = useUi((s) => s.focusBranch !== null);
  const doc = useCanopy((s) => s.doc);
  const focus = useCanopy((s) => (s.picked ? s.focus : s.doc.coreId));
  const topic = doc.topics[focus];
  const path = topic ? [...ancestorsOf(doc, focus).reverse(), topic] : [];

  const list = useRef<HTMLOListElement>(null);
  const ghost = useRef<HTMLOListElement>(null);
  const [keep, setKeep] = useState<number | null>(null);
  const signature = path.map((t) => `${t.id}:${nameOf(t)}`).join('|');

  // Measures every level at its natural width, off screen, and folds the middle only if they do not fit.
  useLayoutEffect(() => {
    const ol = list.current;
    const hidden = ghost.current;
    if (!ol || !hidden) return;
    const bar = ol.parentElement;
    if (!bar) return;
    const fit = () => {
      const items = Array.from(hidden.children) as HTMLElement[];
      const widths = items.slice(0, -1).map((li) => li.offsetWidth);
      const gap = items[items.length - 1]?.offsetWidth ?? 0;
      // What the path may use: the bar, less its padding and everything beside the path.
      const style = getComputedStyle(bar);
      const beside = Array.from(bar.children).filter((el) => el !== ol && el !== hidden);
      const used = beside.reduce((sum, el) => sum + (el as HTMLElement).offsetWidth, 0);
      const room =
        bar.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight) -
        used -
        (parseFloat(style.columnGap) || 0) * beside.length;
      setKeep(levelsToShow(widths, gap, room));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(bar);
    return () => observer.disconnect();
    // The path itself is what the measurement depends on.
  }, [signature, on, alone]);

  if (!on || !topic) return null;

  const folded = keep !== null && path.length > 2;
  const tail = folded ? path.slice(path.length - (keep ?? 1)) : [];
  const hiddenLevels = folded ? path.slice(1, path.length - (keep ?? 1)) : [];
  const shown = folded ? [path[0], ...tail] : path;

  // Pasted into a new topic, `!!a>b>c` makes the same chain. Separators inside a name would split it.
  const copyPath = () => {
    const names = path.map((t) =>
      t.title
        .replace(/[,>\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    const text = EXPAND_PREFIX + names.filter(Boolean).join('>');
    void navigator.clipboard
      .writeText(text)
      .then(() => showToast('Path copied. Paste it into a new topic to make the chain'))
      .catch(() => showToast('Could not copy the path'));
  };

  const go = (id: string) => {
    canopyStore.getState().select([id], id);
    focusCanvas();
  };

  return (
    <nav className="status-bar" aria-label="Path to the Core">
      <span className="status-bar-label">
        <Icon name="trail" />
        Trail
      </span>
      <ol className="trail-path" ref={list}>
        {shown.map((t, i) => {
          if (!t) return null;
          const current = t.id === focus;
          return (
            <li key={t.id}>
              {folded && i === 1 && (
                <>
                  <span
                    className="trail-gap"
                    title={hiddenLevels.map(nameOf).join(' › ')}
                    aria-label={`${hiddenLevels.length} more levels: ${hiddenLevels.map(nameOf).join(', ')}`}
                  >
                    …
                  </span>
                  <Icon name="chevron-right" />
                </>
              )}
              {current ? (
                <span className="trail-current" aria-current="location" title={nameOf(t)}>
                  {nameOf(t)}
                </span>
              ) : (
                <button type="button" onClick={() => go(t.id)} title={nameOf(t)}>
                  {nameOf(t)}
                </button>
              )}
              {i < shown.length - 1 && <Icon name="chevron-right" />}
            </li>
          );
        })}
      </ol>
      <ol className="trail-path trail-ghost" aria-hidden="true" ref={ghost}>
        {path.map((t, i) => (
          <li key={t.id}>
            <span className="trail-name" data-current={t.id === focus || undefined}>
              {nameOf(t)}
            </span>
            {i < path.length - 1 && <Icon name="chevron-right" />}
          </li>
        ))}
        <li>
          <span className="trail-name">…</span>
          <Icon name="chevron-right" />
        </li>
      </ol>
      {alone && (
        <button
          type="button"
          className="status-bar-copy"
          aria-label="Unfold everything"
          data-tip="Unfold everything ([)"
          data-tip-side="top"
          onClick={() => setFocusBranch(null)}
        >
          <Icon name="braces" />
          <span>Unfold everything</span>
        </button>
      )}
      <button
        type="button"
        className="status-bar-copy"
        aria-label="Copy path"
        data-tip="Copy as !!a>b>c, to paste into a new topic"
        data-tip-side="top"
        onClick={copyPath}
      >
        <Icon name="copy" />
        <span>Copy path</span>
      </button>
    </nav>
  );
}
