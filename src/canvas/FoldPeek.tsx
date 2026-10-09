import { useStore } from 'zustand';
import { childrenOf } from '../model';
import { useCanopy } from '../store';
import type { Layout } from '../layout';
import { anchorOf } from './growth';
import { useGrowth } from './growthStore';
import { viewportStore } from './viewportStore';

const MAX_LISTED = 6;

/** A small card beside a hovered Fold Badge that lists what is folded inside. */
export function FoldPeek({ layout }: { layout: Layout }) {
  const peekId = useGrowth((s) => s.peekId);
  const doc = useCanopy((s) => s.doc);
  const vp = useStore(viewportStore, (s) => s.vp);
  const box = peekId ? layout.boxes.get(peekId) : undefined;
  if (!peekId || !box || !doc.topics[peekId]?.folded) return null;

  const kids = childrenOf(doc, peekId);
  const edge = anchorOf(box, doc.prefs.flow, 'child');
  const at = { x: edge.x * vp.k + vp.x, y: edge.y * vp.k + vp.y };
  const down = doc.prefs.flow === 'down';

  return (
    <div
      className="fold-peek"
      aria-hidden="true"
      style={{ left: at.x + (down ? 0 : 36), top: at.y + (down ? 36 : 0) }}
      data-flow={doc.prefs.flow}
    >
      <ul>
        {kids.slice(0, MAX_LISTED).map((kid) => (
          <li key={kid.id}>{kid.title.trim() || 'Empty topic'}</li>
        ))}
      </ul>
      {kids.length > MAX_LISTED && <p>and {kids.length - MAX_LISTED} more</p>}
      <p className="fold-peek-hint">Click to unfold</p>
    </div>
  );
}
