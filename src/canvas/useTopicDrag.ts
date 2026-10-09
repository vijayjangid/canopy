import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';
import { announce } from '../a11y';
import type { Layout } from '../layout';
import { moveBranches, movableRoots, subtreeOf, type TopicId } from '../model';
import { canopyStore } from '../store';
import { findDrop } from './dropTarget';
import { dragStore, endDrag } from './dragStore';
import { viewportStore } from './viewportStore';

const DRAG_THRESHOLD_PX = 6;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Dragging topics to new places: a press, a move past a small threshold, then a release. */
export function useTopicDrag(host: RefObject<HTMLElement | null>, layout: Layout) {
  const press = useRef<{ id: TopicId; x: number; y: number; collapseTo: TopicId | null } | null>(
    null,
  );

  // Escape cancels a drag before anything else sees it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !dragStore.getState().active) return;
      e.preventDefault();
      e.stopPropagation();
      press.current = null;
      endDrag();
      announce('Move cancelled');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // A release over something else, such as the Inspector opening under the pointer, still ends a press.
  useEffect(() => {
    const clear = () => {
      press.current = null;
    };
    window.addEventListener('pointerup', clear);
    window.addEventListener('pointercancel', clear);
    return () => {
      window.removeEventListener('pointerup', clear);
      window.removeEventListener('pointercancel', clear);
    };
  }, []);

  const hostPoint = (e: { clientX: number; clientY: number }) => {
    const rect = host.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  return {
    /** Call when a topic is pressed. `collapseTo` is the selection to apply if no drag follows. */
    press(e: PointerEvent, id: TopicId, collapseTo: TopicId | null) {
      press.current = { id, x: e.clientX, y: e.clientY, collapseTo };
    },

    /** Returns true while a drag is under way, so the caller can skip hover handling. */
    move(e: PointerEvent<SVGSVGElement>): boolean {
      const start = press.current;
      if (!start) return dragStore.getState().active;

      if (!dragStore.getState().active) {
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < DRAG_THRESHOLD_PX) return false;
        const { doc, selection } = canopyStore.getState();
        const roots = movableRoots(doc, selection.includes(start.id) ? selection : [start.id]);
        if (roots.length === 0) {
          press.current = null;
          return false;
        }
        const faded = new Set<TopicId>();
        for (const root of roots) for (const t of subtreeOf(doc, root)) faded.add(t.id);
        const first = doc.topics[roots[0] ?? '']?.title.trim() || 'Empty topic';
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStore.setState({
          active: true,
          roots,
          faded,
          label: roots.length > 1 ? `${first} and ${roots.length - 1} more` : first,
        });
      }

      const state = dragStore.getState();
      const at = hostPoint(e);
      const { vp } = viewportStore.getState();
      const point = { x: (at.x - vp.x) / vp.k, y: (at.y - vp.y) / vp.k };
      const drop = findDrop(
        canopyStore.getState().doc,
        layout,
        state.roots,
        state.faded,
        point,
        vp.k,
      );
      dragStore.setState({ pointer: at, drop });
      return true;
    },

    /** Returns true if the release finished a drag. */
    release(e: PointerEvent<SVGSVGElement>): boolean {
      const start = press.current;
      press.current = null;
      const state = dragStore.getState();
      if (!state.active) {
        if (start?.collapseTo) canopyStore.getState().select([start.collapseTo], start.collapseTo);
        return false;
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const { drop, roots } = state;
      endDrag();
      if (!drop) {
        announce('Move cancelled');
        return true;
      }
      const { doc, commit } = canopyStore.getState();
      const moved = moveBranches(doc, roots, drop);
      if (moved === doc) return true;
      commit(moved, { select: [...roots], focus: roots[roots.length - 1] });
      const target = doc.topics[drop.subject]?.title.trim() || 'Empty topic';
      announce(
        drop.kind === 'child'
          ? `Moved ${plural(roots.length, 'branch')} under ${target}`
          : `Moved ${plural(roots.length, 'branch')} ${drop.kind === 'before' ? 'before' : 'after'} ${target}`,
      );
      return true;
    },
  };
}
