import { createStore } from 'zustand/vanilla';
import type { Box, Size } from '../layout';
import { easeOutCubic, prefersReducedMotion } from '../motion';
import { fitBounds, panBy, revealDelta, zoomAt, type Obstacle, type Viewport } from './viewport';

export interface ViewportState {
  vp: Viewport;
  size: Size;
  setSize: (size: Size) => void;
  setViewport: (vp: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  /** Zoom around a screen point, or the centre of the view when none is given. */
  zoom: (factor: number, at?: { x: number; y: number }) => void;
  fit: (bounds: Box) => void;
  /** Fills the view with a layout-space box, as far in as `maxZoom` allows. */
  zoomTo: (bounds: Box, padding?: number, maxZoom?: number) => void;
  /** Pans just enough to bring a layout-space box fully on screen. */
  reveal: (box: Box, padding?: number, obstacles?: readonly Obstacle[]) => void;
}

const PAN_MS = 260;

export function createViewportStore() {
  let frame = 0;
  // Anything the person does with the view themselves stops a pan that is still gliding.
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  return createStore<ViewportState>()((set, get) => ({
    vp: { x: 0, y: 0, k: 1 },
    size: { w: 0, h: 0 },
    setSize: (size) => set({ size }),
    setViewport: (vp) => {
      stop();
      set({ vp });
    },
    panBy: (dx, dy) => {
      stop();
      set({ vp: panBy(get().vp, dx, dy) });
    },
    zoom: (factor, at) => {
      stop();
      const { vp, size } = get();
      set({ vp: zoomAt(vp, factor, at?.x ?? size.w / 2, at?.y ?? size.h / 2) });
    },
    fit: (bounds) => {
      stop();
      set({ vp: fitBounds(bounds, get().size) });
    },
    zoomTo: (bounds, padding = 96, maxZoom = 2.5) => {
      stop();
      set({ vp: fitBounds(bounds, get().size, padding, maxZoom) });
    },
    reveal: (box, padding, obstacles) => {
      const { vp, size } = get();
      if (size.w === 0) return;
      const { dx, dy } = revealDelta(vp, size, box, padding, obstacles);
      if (dx === 0 && dy === 0) return;
      stop();
      if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
        set({ vp: panBy(vp, dx, dy) });
        return;
      }
      // Glide to the new place, so the eye can follow the map moving.
      const from = vp;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / PAN_MS);
        const e = easeOutCubic(t);
        set({ vp: { ...from, x: from.x + dx * e, y: from.y + dy * e } });
        frame = t < 1 ? requestAnimationFrame(step) : 0;
      };
      frame = requestAnimationFrame(step);
    },
  }));
}

export const viewportStore = createViewportStore();
