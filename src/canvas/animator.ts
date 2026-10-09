import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Layout, TopicBox } from '../layout';
import { MOTION, easeLayout } from '../motion';

/** What is on screen right now: a layout, plus opacity for topics that are appearing or leaving. */
export interface AnimatedView {
  layout: Layout;
  fade: ReadonlyMap<string, number>;
}

export interface AnimatorOptions {
  duration?: number;
  now?: () => number;
  requestFrame?: (callback: () => void) => number;
  cancelFrame?: (handle: number) => void;
}

export interface LayoutAnimator {
  store: StoreApi<{ view: AnimatedView }>;
  /** Moves toward `next`. Without `animate`, jumps there. */
  setTarget: (next: Layout, animate: boolean) => void;
  getTarget: () => Layout | null;
  /** Shifts what is on screen, for when the viewport moves by the opposite amount. */
  shiftView: (dx: number, dy: number) => void;
}

const NO_FADE: ReadonlyMap<string, number> = new Map();
const EMPTY: Layout = {
  boxes: new Map(),
  order: [],
  bounds: { x: 0, y: 0, w: 0, h: 0 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sameBox(a: TopicBox, b: TopicBox) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** True when both layouts show the same topics, whatever their positions. */
export function sameTopics(a: Layout, b: Layout): boolean {
  if (a.order.length !== b.order.length) return false;
  for (const box of a.order) if (!b.boxes.has(box.id)) return false;
  return true;
}

function mix(from: TopicBox, to: TopicBox, t: number): TopicBox {
  return {
    ...to,
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    w: lerp(from.w, to.w, t),
    h: lerp(from.h, to.h, t),
  };
}

/** The in-between view at progress `t` (0 to 1, already eased). */
export function blendLayouts(from: AnimatedView, to: Layout, t: number): AnimatedView {
  if (t >= 1) return { layout: to, fade: NO_FADE };
  const fade = new Map<string, number>();
  const boxes = new Map<string, TopicBox>();
  const order: TopicBox[] = [];

  for (const target of to.order) {
    const before = from.layout.boxes.get(target.id);
    let box = target;
    if (before) {
      if (!sameBox(before, target)) box = mix(before, target, t);
      const faded = from.fade.get(target.id);
      if (faded !== undefined) fade.set(target.id, lerp(faded, 1, t));
    } else {
      // New topics grow out of their parent.
      const origin =
        (target.parentId &&
          (from.layout.boxes.get(target.parentId) ?? to.boxes.get(target.parentId))) ||
        target;
      box = { ...target, x: lerp(origin.x, target.x, t), y: lerp(origin.y, target.y, t) };
      fade.set(target.id, t);
    }
    boxes.set(box.id, box);
    order.push(box);
  }

  // Removed topics fold back into their parent while fading out.
  for (const gone of from.layout.order) {
    if (to.boxes.has(gone.id)) continue;
    const parent = gone.parentId ? to.boxes.get(gone.parentId) : undefined;
    const box = parent
      ? { ...gone, x: lerp(gone.x, parent.x, t), y: lerp(gone.y, parent.y, t) }
      : gone;
    boxes.set(box.id, box);
    order.push(box);
    fade.set(gone.id, (from.fade.get(gone.id) ?? 1) * (1 - t));
  }

  return { layout: { boxes, order, bounds: to.bounds }, fade };
}

/** Animates between layouts, outside React so that a frame costs one state update. */
export function createLayoutAnimator(options: AnimatorOptions = {}): LayoutAnimator {
  const duration = options.duration ?? MOTION.standard;
  const now = options.now ?? (() => performance.now());
  const requestFrame = options.requestFrame ?? ((cb) => requestAnimationFrame(cb));
  const cancelFrame = options.cancelFrame ?? ((h) => cancelAnimationFrame(h));

  const store = createStore<{ view: AnimatedView }>(() => ({
    view: { layout: EMPTY, fade: NO_FADE },
  }));
  let target: Layout | null = null;
  let from: AnimatedView = store.getState().view;
  let startedAt = 0;
  let frame: number | null = null;

  const stop = () => {
    if (frame !== null) cancelFrame(frame);
    frame = null;
  };

  const tick = () => {
    frame = null;
    if (!target) return;
    const t = Math.min(1, (now() - startedAt) / duration);
    store.setState({ view: blendLayouts(from, target, easeLayout(t)) });
    if (t < 1) frame = requestFrame(tick);
  };

  return {
    store,
    getTarget: () => target,

    setTarget: (next, animate) => {
      if (next === target) return;
      stop();
      from = store.getState().view;
      target = next;
      if (!animate || from.layout === EMPTY || sameLayouts(from.layout, next)) {
        store.setState({ view: { layout: next, fade: NO_FADE } });
        return;
      }
      startedAt = now();
      tick();
    },

    shiftView: (dx, dy) => {
      const move = (view: AnimatedView): AnimatedView => {
        const boxes = new Map<string, TopicBox>();
        const order = view.layout.order.map((b) => {
          const moved = { ...b, x: b.x + dx, y: b.y + dy };
          boxes.set(moved.id, moved);
          return moved;
        });
        return { layout: { ...view.layout, boxes, order }, fade: view.fade };
      };
      from = move(from);
      store.setState({ view: move(store.getState().view) });
    },
  };
}

function sameLayouts(a: Layout, b: Layout): boolean {
  if (!sameTopics(a, b)) return false;
  return a.order.every((box) => {
    const other = b.boxes.get(box.id);
    return other !== undefined && sameBox(box, other);
  });
}
