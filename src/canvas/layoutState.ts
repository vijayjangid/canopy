import { createStore } from 'zustand/vanilla';
import type { Layout } from '../layout';

/** The latest layout, published by the canvas so commands can navigate spatially. */
export const layoutState = createStore<{ layout: Layout | null }>(() => ({ layout: null }));

let canvasElement: SVGElement | HTMLElement | null = null;

export function registerCanvasElement(el: SVGElement | HTMLElement | null): void {
  canvasElement = el;
}

export function focusCanvas(): void {
  canvasElement?.focus({ preventScroll: true });
}

export function blurCanvas(): void {
  canvasElement?.blur();
}
