import { useEffect, useRef, type PointerEvent } from 'react';
import { useStore } from 'zustand';
import { announce } from '../a11y';
import { appContext } from '../editor';
import { formatShortcut, COMMANDS, type CommandId } from '../editor/shortcuts';
import type { Layout } from '../layout';
import { hasChildren, setTopicReference } from '../model';
import { canopyStore, useCanopy } from '../store';
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
import { LOW_DETAIL_BELOW } from './region';
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

/** Map units of slack around a topic, so a reference line snaps on near its edge. */
const REFERENCE_SLACK = 8;

const LINK_PATH =
  'M6.5 10.5 4.8 12.2a2.3 2.3 0 0 1-3.2-3.2l3-3a2.3 2.3 0 0 1 3.2 0M9.5 5.5l1.7-1.7a2.3 2.3 0 0 1 3.2 3.2l-3 3a2.3 2.3 0 0 1-3.2 0M5.5 8.5h5';

function referenceTitle(): string {
  const first = COMMANDS.find((c) => c.id === 'topic.reference')?.shortcuts[0];
  const base = 'Reference another topic: drag onto it, or click to search';
  return first ? `${base} (${formatShortcut(first)})` : base;
}

function titleFor(kind: GrowthKind, flow: 'right' | 'down') {
  const { command, ...text } = TITLES[kind];
  const first = COMMANDS.find((c) => c.id === command)?.shortcuts[0];
  return first ? `${text[flow]} (${formatShortcut(first)})` : text[flow];
}

interface Props {
  /** The real layout, which decides where a new topic would go. */
  layout: Layout;
  /**
   * The layout as drawn right now. While topics glide to new places the handles follow them, so a
   * handle is never left behind. During a preview or a drag the real layout is used instead, so
   * the handle under the pointer stays still.
   */
  drawn: Layout;
  onCommit: (slot: GrowthSlot) => void;
}

/** Round "+" buttons around a hovered topic. Hovering one previews the result, dragging one places it. */
export function GrowthHandles({ layout, drawn, onCommit }: Props) {
  const doc = useCanopy((s) => s.doc);
  // Nothing is offered on a topic while none is picked.
  const focus = useCanopy((s) => (s.picked ? s.focus : ''));
  const editing = useCanopy((s) => s.editing);
  const hoverId = useGrowth((s) => s.hoverId);
  const dragOrigin = useGrowth((s) => s.dragOrigin);
  const refDrag = useGrowth((s) => s.refDrag);
  const slot = useGrowth((s) => s.slot);
  const vp = useStore(viewportStore, (s) => s.vp);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  // Escape drops a reference line that is still being dragged.
  const referencing = refDrag !== null;
  useEffect(() => {
    if (!referencing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      press.current = null;
      growthStore.getState().endRefDrag();
      announce('Reference cancelled');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [referencing]);

  const movingTopics = useDrag((s) => s.active);
  // Panning and zooming own the pointer, so the add-topic handles step out of the way.
  const tool = useEffectiveTool();
  const visibility = useSettings((s) => s.handles);
  // Browsing stays quiet: handles belong to the selected topic, and only while it is hovered.
  const hovered = hoverId !== null && hoverId === focus ? hoverId : null;
  const subject =
    visibility === 'never'
      ? null
      : (dragOrigin ?? refDrag?.from ?? hovered ?? (visibility === 'always' ? focus : null));
  const settled = slot === null && dragOrigin === null && refDrag === null;
  // The topic is still gliding to a new place, so a handle moving under a still pointer is not a hover.
  const realBox = subject ? layout.boxes.get(subject) : undefined;
  const drawnBox = subject ? drawn.boxes.get(subject) : undefined;
  const gliding =
    realBox !== undefined &&
    drawnBox !== undefined &&
    (realBox.x !== drawnBox.x ||
      realBox.y !== drawnBox.y ||
      realBox.w !== drawnBox.w ||
      realBox.h !== drawnBox.h);
  const anchors = settled ? drawn : layout;
  const box =
    subject && !editing && !movingTopics
      ? (anchors.boxes.get(subject) ?? layout.boxes.get(subject))
      : undefined;
  // Zoomed out to icons, the handles would be bigger than the topics they belong to.
  if (!subject || !box || tool !== 'select' || vp.k < LOW_DETAIL_BELOW) return null;
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

  const referenceTargetAt = (e: PointerEvent<HTMLButtonElement>) => {
    const host = e.currentTarget.parentElement?.getBoundingClientRect();
    const x = e.clientX - (host?.left ?? 0);
    const y = e.clientY - (host?.top ?? 0);
    const { vp: view } = viewportStore.getState();
    const lx = (x - view.x) / view.k;
    const ly = (y - view.y) / view.k;
    const slack = REFERENCE_SLACK / view.k;
    let target: string | null = null;
    // Later boxes are deeper in the tree, so the last hit is the topic drawn on top.
    for (const b of layout.order) {
      if (b.id === subject) continue;
      if (
        lx >= b.x - slack &&
        lx <= b.x + b.w + slack &&
        ly >= b.y - slack &&
        ly <= b.y + b.h + slack
      ) {
        target = b.id;
      }
    }
    return { x, y, target };
  };

  const onReferenceMove = (e: PointerEvent<HTMLButtonElement>) => {
    const start = press.current;
    if (!start) return;
    if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD_PX) {
      start.moved = true;
    }
    if (!start.moved) return;
    growthStore.getState().setRefDrag({ from: subject, ...referenceTargetAt(e) });
  };

  const onReferenceUp = (e: PointerEvent<HTMLButtonElement>) => {
    const start = press.current;
    press.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!start) return;
    const store = growthStore.getState();
    if (!start.moved) {
      appContext.app?.topicSearch(subject);
      return;
    }
    const { target } = referenceTargetAt(e);
    store.endRefDrag();
    if (!target) {
      announce('Reference cancelled');
      return;
    }
    const { doc: current, commit } = canopyStore.getState();
    commit(setTopicReference(current, subject, target));
    const name = (id: string) => current.topics[id]?.title.trim() || 'Empty topic';
    announce(`${name(subject)} now references ${name(target)}`);
  };

  const handleKinds: Array<GrowthKind | 'reference'> = [
    ...(doc.topics[subject]?.parentId ? (['reference'] as const) : []),
    ...GROWTH_KINDS.filter(
      // The upper peer handle is now the reference handle. The top of a single branch has no
      // visible peers or line above it.
      (kind) =>
        kind !== 'before' &&
        canGrow(doc, subject, kind) &&
        (kind === 'child' || box.parentId !== null),
    ),
  ];
  const target = refDrag?.target ? layout.boxes.get(refDrag.target) : undefined;
  const sourceAt = handleCenter(box, vp, flow, 'before', 0, scale);

  return (
    <div className="growth-layer" style={{ ['--hs' as string]: scale }}>
      {refDrag && (
        <svg className="reference-rubber" aria-hidden="true">
          {target && (
            <rect
              className="reference-rubber-target"
              x={target.x * vp.k + vp.x - 4}
              y={target.y * vp.k + vp.y - 4}
              width={target.w * vp.k + 8}
              height={target.h * vp.k + 8}
              rx={12}
            />
          )}
          <line
            className="reference-rubber-line"
            x1={sourceAt.x}
            y1={sourceAt.y}
            x2={refDrag.x}
            y2={refDrag.y}
          />
        </svg>
      )}
      {handleKinds.map((kind) => {
        if (kind === 'reference') {
          return (
            <button
              key="reference"
              type="button"
              className="growth-handle"
              data-kind="reference"
              data-active={refDrag ? '' : undefined}
              tabIndex={-1}
              aria-hidden="true"
              data-tip={referenceTitle()}
              data-tip-side="top"
              style={{ left: sourceAt.x, top: sourceAt.y }}
              onPointerEnter={() => growthStore.getState().keepAlive()}
              onPointerLeave={() => {
                const store = growthStore.getState();
                if (store.refDrag) return;
                store.leave();
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onReferenceMove}
              onPointerUp={onReferenceUp}
              onPointerCancel={() => {
                press.current = null;
                growthStore.getState().endRefDrag();
              }}
            >
              <svg viewBox="0 0 16 16" width="55%" height="55%" aria-hidden="true">
                <path
                  d={LINK_PATH}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        }
        const at = handleCenter(
          box,
          vp,
          flow,
          kind,
          badgeSpace,
          scale,
          anchors.boxes.get(box.parentId ?? '') ?? layout.boxes.get(box.parentId ?? ''),
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
              if (!growthStore.getState().dragOrigin && !gliding) {
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
            onPointerMove={(e) => {
              onPointerMove(e);
              // A pointer that rested on the handle while it glided into place starts the preview once it moves.
              const store = growthStore.getState();
              if (!press.current && !gliding && !store.slot && !store.dragOrigin) {
                store.setSlot(subject, withShift(kind, e.shiftKey));
              }
            }}
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
