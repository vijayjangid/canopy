import { useStore } from 'zustand';
import { useCanopy } from '../store';
import type { Layout } from '../layout';
import { viewportStore } from './viewportStore';

/** On a brand-new map, points at the first thing to do. It goes away with the first topic. */
export function FirstRunHint({ layout }: { layout: Layout }) {
  const alone = useCanopy((s) => Object.keys(s.doc.topics).length === 1);
  const editing = useCanopy((s) => s.editing !== null);
  const vp = useStore(viewportStore, (s) => s.vp);
  const core = layout.boxes.get(layout.order[0]?.id ?? '');
  if (!alone || editing || !core) return null;

  return (
    <div
      className="first-run"
      style={{
        left: (core.x + core.w / 2) * vp.k + vp.x,
        top: (core.y + core.h) * vp.k + vp.y + 28,
      }}
    >
      <strong>Start your map</strong>
      <span>
        Select the central topic and press <kbd>Tab</kbd> to add an idea, or double-click it to
        rename it.
      </span>
    </div>
  );
}
