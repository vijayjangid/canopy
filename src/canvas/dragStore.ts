import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import type { DropTarget, TopicId } from '../model';

export interface DragState {
  active: boolean;
  /** Branches being moved. */
  roots: readonly TopicId[];
  /** Every topic inside them, drawn faded while the drag lasts. */
  faded: ReadonlySet<TopicId>;
  label: string;
  /** Pointer position inside the canvas, in pixels. */
  pointer: { x: number; y: number };
  drop: DropTarget | null;
}

const IDLE: DragState = {
  active: false,
  roots: [],
  faded: new Set(),
  label: '',
  pointer: { x: 0, y: 0 },
  drop: null,
};

export const dragStore = createStore<DragState>(() => IDLE);

export const endDrag = () => dragStore.setState(IDLE);

export function useDrag<T>(selector: (state: DragState) => T): T {
  return useStore(dragStore, selector);
}
