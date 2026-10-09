import { useEffect } from 'react';
import { useStore } from 'zustand';
import { edgeMidpoint, type Layout } from '../layout';
import { MAX_EDGE_STICKERS, addEdgeSticker, removeEdgeSticker, type Topic } from '../model';
import { canopyStore, useCanopy } from '../store';
import { StickerArt } from '../stickers/art';
import { stickerName } from '../stickers/catalog';
import { appContext } from '../editor';
import { setEdgeFocus } from '../ui/uiStore';
import { markFresh } from './stampStore';
import { viewportStore } from './viewportStore';

const QUICK = ['star', 'flag', 'alert', 'question', 'done'] as const;

/** A small bar beside a picked line, to stick stickers on it or take them off without leaving the map. */
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
  const full = placed.length >= MAX_EDGE_STICKERS;

  return (
    <div
      className="edge-quickbar"
      role="group"
      aria-label="Stickers for this line"
      style={{ left: mid.x * vp.k + vp.x, top: mid.y * vp.k + vp.y }}
    >
      {QUICK.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={`Add ${stickerName(key)} sticker to the line`}
          data-tip={stickerName(key)}
          data-tip-side="bottom"
          disabled={full}
          onClick={() => {
            const { doc, commit } = canopyStore.getState();
            const next = addEdgeSticker(doc, id, key);
            markFresh(doc.topics[id]?.edge?.stickers, next.topics[id]?.edge?.stickers);
            commit(next);
          }}
        >
          <svg viewBox="-2 -2 36 38" width="22" height="22" aria-hidden="true">
            <StickerArt name={key} />
          </svg>
        </button>
      ))}
      {placed.length > 0 && (
        <>
          <span className="edge-quickbar-sep" aria-hidden="true" />
          {placed.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className="edge-quickbar-placed"
              aria-label={`Remove ${stickerName(sticker.key)} sticker from the line`}
              data-tip="Remove"
              data-tip-side="bottom"
              onClick={() => {
                const { doc, commit } = canopyStore.getState();
                commit(removeEdgeSticker(doc, id, sticker.id));
              }}
            >
              <svg viewBox="-2 -2 36 38" width="22" height="22" aria-hidden="true">
                <StickerArt name={sticker.key} />
              </svg>
              <span className="edge-quickbar-x" aria-hidden="true">
                ×
              </span>
            </button>
          ))}
        </>
      )}
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
