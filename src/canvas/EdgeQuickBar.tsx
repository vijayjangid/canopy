import { useEffect } from 'react';
import { useStore } from 'zustand';
import { edgeMidpoint, type Layout } from '../layout';
import { toggleEdgeSticker, type Topic } from '../model';
import { canopyStore, useCanopy } from '../store';
import { StickerArt } from '../stickers/art';
import { stickerName } from '../stickers/catalog';
import { appContext } from '../editor';
import { Icon } from '../ui/icons';
import { showToast } from '../ui/toast';
import { setEdgeFocus } from '../ui/uiStore';
import { markFresh } from './stampStore';
import { viewportStore } from './viewportStore';

const QUICK = ['star', 'flag', 'alert', 'question', 'done'] as const;

/**
 * A small bar beside a picked line. Each sticker is a switch: it is marked while it is on the line,
 * and a press puts it on or takes it off, as in the details panel. The pencil opens the label field there.
 */
export function EdgeQuickBar({ id, layout }: { id: string; layout: Layout }) {
  const vp = useStore(viewportStore, (s) => s.vp);
  const flow = useCanopy((s) => s.doc.prefs.flow);
  const topic: Topic | undefined = useCanopy((s) => s.doc.topics[id]);
  // The bar can sit over neighbouring topics, so Escape puts it away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setEdgeFocus(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const child = layout.boxes.get(id);
  const parent = child?.parentId ? layout.boxes.get(child.parentId) : undefined;
  if (!topic || !child || !parent) return null;

  const mid = edgeMidpoint(parent, child, flow);
  const placed = topic.edge?.stickers ?? [];
  const on = new Set(placed.map((s) => s.key));
  // The usual few, then anything else on the line, so every sticker on it can be taken off here.
  const keys = [...QUICK, ...placed.map((s) => s.key).filter((k) => !QUICK.some((q) => q === k))];
  const full = placed.length >= 3;

  const toggle = (key: string) => {
    const { doc, commit } = canopyStore.getState();
    const next = toggleEdgeSticker(doc, id, key);
    if (next === doc) {
      showToast('The line holds 3 stickers. Take one off to add another.');
      return;
    }
    markFresh(doc.topics[id]?.edge?.stickers, next.topics[id]?.edge?.stickers);
    commit(next);
  };

  return (
    <div
      className="edge-quickbar"
      role="group"
      aria-label="Stickers for this line"
      style={{ left: mid.x * vp.k + vp.x, top: mid.y * vp.k + vp.y }}
    >
      <button
        type="button"
        className="edge-quickbar-edit"
        aria-label="Edit the line label, in the details panel"
        data-tip="Edit label"
        data-tip-side="bottom"
        onClick={() => appContext.app?.labelEdge(id)}
      >
        <Icon name="edit" />
      </button>
      <span className="edge-quickbar-sep" aria-hidden="true" />
      {keys.map((key) => {
        const applied = on.has(key);
        return (
          <button
            key={key}
            type="button"
            className="edge-quickbar-sticker"
            aria-label={stickerName(key)}
            aria-pressed={applied}
            data-tip={applied ? `${stickerName(key)}. Click to take off` : stickerName(key)}
            data-tip-side="bottom"
            disabled={full && !applied}
            onClick={() => toggle(key)}
          >
            <svg viewBox="-2 -2 36 38" width="22" height="22" aria-hidden="true">
              <StickerArt name={key} />
            </svg>
          </button>
        );
      })}
      <button
        type="button"
        className="edge-quickbar-more"
        aria-label="More stickers, in the details panel"
        data-tip="More stickers"
        data-tip-side="bottom"
        onClick={() => appContext.app?.stickEdge(id)}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
          <circle cx="3.5" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="12.5" cy="8" r="1.4" />
        </svg>
      </button>
    </div>
  );
}
