import { useRef, type PointerEvent } from 'react';
import { useStore } from 'zustand';
import { announce } from '../a11y';
import { formatShortcut, COMMANDS, type CommandId } from '../editor/shortcuts';
import type { Layout } from '../layout';
import { hasChildren } from '../model';
import { useCanopy } from '../store';
import {
  GROWTH_KINDS,
  canGrow,
  handleCenter,
  nearestSlot,
  type GrowthKind,
  type GrowthSlot,
} from './growth';
import { growthStore, useGrowth } from './growthStore';
import { useDrag } from './dragStore';
import { useSettings } from '../settings';
import { useEffectiveTool } from './toolStore';
import { viewportStore } from './viewportStore';
import './growth-handles.css';

const DRAG_THRESHOLD_PX = 6;

const TITLES: Record<GrowthKind, { right: string; down: string; command: CommandId }> = {
  child: { right: 'Add sub-topic', down: 'Add sub-topic', command: 'topic.addChild' },
  before: { right: 'Add peer above', down: 'Add peer before', command: 'topic.addPeerBefore' },
  after: { right: 'Add peer below', down: 'Add peer after', command: 'topic.addPeerAfter' },
  between: {
    right: 'Insert a topic between (Shift: above all its peers)',
    down: 'Insert a topic between (Shift: above all its peers)',
    command: 'topic.wrap',
  },
  level: {
    right: 'Insert a topic above all its peers',
    down: 'Insert a topic above all its peers',
    command: 'topic.wrap',
  },
};

/** Shift turns "between" into one level for the whole row of peers. */
const withShift = (kind: GrowthKind, shift: boolean): GrowthKind =>
  kind === 'between' && shift ? 'level' : kind;

function titleFor(kind: GrowthKind, flow: 'right' | 'down') {
  const { command, ...text } = TITLES[kind];
  const first = COMMANDS.find((c) => c.id === command)?.shortcuts[0];
  return first ? `${text[flow]} (${formatShortcut(first)})` : text[flow];
}

interface Props {
  /** The real layout, which handles are anchored to. */
  layout: Layout;
  onCommit: (slot: GrowthSlot) => void;
}

/** Round "+" buttons around a hovered topic. Hovering one previews the result, dragging one places it. */
export function GrowthHandles({ layout, onCommit }: Props) {
  const doc = useCanopy((s) => s.doc);
  // Nothing is offered on a topic while none is picked.
  const focus = useCanopy((s) => (s.picked ? s.focus : ''));
  const editing = useCanopy((s) => s.editing);
  const hoverId = useGrowth((s) => s.hoverId);
  const dragOrigin = useGrowth((s) => s.dragOrigin);
  const slot = useGrowth((s) => s.slot);
  const vp = useStore(viewportStore, (s) => s.vp);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const movingTopics = useDrag((s) => s.active);
  // Panning and zooming own the pointer, so the add-topic handles step out of the way.
  const tool = useEffectiveTool();
  const visibility = useSettings((s) => s.handles);
  // Browsing stays quiet: handles belong to the selected topic, and only while it is hovered.
  const hovered = hoverId !== null && hoverId === focus ? hoverId : null;
  const subject =
    visibility === 'never'
      ? null
      : (dragOrigin ?? hovered ?? (visibility === 'always' ? focus : null));
  const box = subject && !editing && !movingTopics ? layout.boxes.get(subject) : undefined;
  if (!subject || !box || tool !== 'select') return null;
  const flow = doc.prefs.flow;
  // A folded topic wears a Fold Badge, and an open one a fold toggle, where the child handle would be.
  const scale = Math.min(Math.max(vp.k, 0.8), 3);
  const badgeSpace = !hasChildren(doc, subject)
    ? 0
    : (doc.topics[subject]?.folded ? 40 : 18) * vp.k;

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, y: e.clientY, moved: false };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const start = press.current;
    if (!start) return;
    if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD_PX) {
      start.moved = true;
      growthStore.getState().startDrag(subject);
    }
    if (!start.moved) return;
    const host = e.currentTarget.parentElement?.getBoundingClientRect();
    const { vp: view } = viewportStore.getState();
    const point = {
      x: (e.clientX - (host?.left ?? 0) - view.x) / view.k,
      y: (e.clientY - (host?.top ?? 0) - view.y) / view.k,
    };
    const hit = nearestSlot(doc, layout.order, point, view.k);
    if (hit) growthStore.getState().setSlot(hit.subject, withShift(hit.kind, e.shiftKey));
    else growthStore.getState().clearSlot();
  };

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>, kind: GrowthKind) => {
    const start = press.current;
    press.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // A press that began elsewhere (such as on a Fold Badge) must not click this handle.
    if (!start) return;
    const store = growthStore.getState();
    if (start?.moved) {
      const slot = store.slot;
      store.endDrag();
      if (slot) onCommit(slot);
      else store.clearSlot();
      announce(slot ? 'Added topic' : 'Cancelled');
      return;
    }
    store.setSlot(subject, withShift(kind, e.shiftKey));
    const slot = growthStore.getState().slot;
    if (slot) onCommit(slot);
  };

  return (
    <div className="growth-layer" style={{ ['--hs' as string]: scale }}>
      {GROWTH_KINDS.filter(
        // The top of a single branch has no visible peers or line above it.
        (kind) => canGrow(doc, subject, kind) && (kind === 'child' || box.parentId !== null),
      ).map((kind) => {
        const at = handleCenter(
          box,
          vp,
          flow,
          kind,
          badgeSpace,
          scale,
          layout.boxes.get(box.parentId ?? ''),
        );
        return (
          <button
            key={kind}
            type="button"
            className="growth-handle"
            data-kind={kind}
            data-active={
              (slot?.subject === subject &&
                (slot.kind === kind || (kind === 'between' && slot.kind === 'level'))) ||
              undefined
            }
            tabIndex={-1}
            aria-hidden="true"
            data-tip={titleFor(kind, flow)}
            data-tip-side={kind === 'child' ? (flow === 'right' ? 'right' : 'bottom') : 'top'}
            style={{ left: at.x, top: at.y }}
            onPointerEnter={(e) => {
              growthStore.getState().keepAlive();
              if (!growthStore.getState().dragOrigin) {
                growthStore.getState().setSlot(subject, withShift(kind, e.shiftKey));
              }
            }}
            onPointerLeave={() => {
              const store = growthStore.getState();
              if (store.dragOrigin) return;
              store.clearSlot();
              store.leave();
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => onPointerUp(e, kind)}
            onPointerCancel={() => {
              press.current = null;
              growthStore.getState().endDrag();
              growthStore.getState().clearSlot();
            }}
          >
            <svg viewBox="0 0 12 12" width="45%" height="45%" aria-hidden="true">
              <path
                d="M6 1.5v9M1.5 6h9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
