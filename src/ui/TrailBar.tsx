import { EXPAND_PREFIX, ancestorsOf, type Topic } from '../model';
import { focusCanvas } from '../canvas/layoutState';
import { useSettings } from '../settings';
import { canopyStore, useCanopy } from '../store';
import { Icon } from './icons';
import { showToast } from './toast';
import { setFocusBranch, useUi } from './uiStore';

/** Past this many levels, the middle of the path folds into an ellipsis. */
const MAX_SHOWN = 6;

const nameOf = (t: Topic) => t.title.trim().replace(/\s+/g, ' ') || 'Empty topic';

/** A status bar along the bottom with the path from the Core down to the focused topic. */
export function TrailBar() {
  const on = useSettings((s) => s.trail);
  const alone = useUi((s) => s.focusBranch !== null);
  const doc = useCanopy((s) => s.doc);
  const focus = useCanopy((s) => (s.picked ? s.focus : s.doc.coreId));
  const topic = doc.topics[focus];
  if (!on || !topic) return null;

  const path = [...ancestorsOf(doc, focus).reverse(), topic];
  const folded = path.length > MAX_SHOWN;
  const hidden = folded ? path.slice(1, path.length - 4) : [];
  const shown = folded ? [path[0], ...path.slice(-4)] : path;

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
      <ol className="trail-path">
        {shown.map((t, i) => {
          if (!t) return null;
          const current = t.id === focus;
          return (
            <li key={t.id}>
              {folded && i === 1 && (
                <>
                  <span
                    className="trail-gap"
                    title={hidden.map(nameOf).join(' › ')}
                    aria-label={`${hidden.length} more levels: ${hidden.map(nameOf).join(', ')}`}
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
