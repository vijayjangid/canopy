import { useEffect, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { announce } from '../a11y';
import {
  EDGE_EDITOR_HEIGHT,
  EDGE_TYPE,
  edgeEditorWidth,
  edgeMidpoint,
  type Layout,
} from '../layout';
import { MAX_EDGE_LABEL, setEdgeLabel } from '../model';
import { canopyStore, useCanopy } from '../store';
import { stopEdgeEdit } from '../ui/uiStore';
import { focusCanvas } from './layoutState';
import { textWidth } from './metrics';
import { viewportStore } from './viewportStore';

/** Types a label on the line above a topic, in place over the middle of the line. */
export function EdgeEditor({ id, layout }: { id: string; layout: Layout }) {
  const vp = useStore(viewportStore, (s) => s.vp);
  const flow = useCanopy((s) => s.doc.prefs.flow);
  const edge = useCanopy((s) => s.doc.topics[id]?.edge);
  const field = useRef<HTMLInputElement>(null);
  const [original] = useState(() => edge?.label ?? '');
  const done = useRef(false);

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  const child = layout.boxes.get(id);
  const parent = child?.parentId ? layout.boxes.get(child.parentId) : undefined;
  if (!child || !parent) return null;

  const mid = edgeMidpoint(parent, child, flow);
  const width = edgeEditorWidth(edge?.label ?? '', textWidth);

  const finish = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    const { doc, commit } = canopyStore.getState();
    const label = keep ? (doc.topics[id]?.edge?.label ?? '').trim() : original;
    commit(setEdgeLabel(doc, id, label), { group: `edge:${id}` });
    stopEdgeEdit();
  };

  return (
    <input
      ref={field}
      className="edge-editor"
      aria-label="Line label"
      placeholder="Label this line"
      maxLength={MAX_EDGE_LABEL}
      value={edge?.label ?? ''}
      spellCheck={false}
      style={{
        left: mid.x * vp.k + vp.x,
        top: mid.y * vp.k + vp.y,
        width,
        height: EDGE_EDITOR_HEIGHT,
        fontSize: EDGE_TYPE.size + 1,
        transform: `translate(-50%, -50%) scale(${vp.k})`,
      }}
      onChange={(e) => {
        const { doc, commit } = canopyStore.getState();
        commit(setEdgeLabel(doc, id, e.target.value), { group: `edge:${id}` });
      }}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
          focusCanvas();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
          focusCanvas();
          announce('Edit cancelled');
        }
        e.stopPropagation();
      }}
      onBlur={() => finish(true)}
    />
  );
}
