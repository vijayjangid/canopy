import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { isMac } from '../editor/shortcuts';

/** How the pointer behaves on the canvas: pick topics, pan the view, or zoom it. */
export type CanvasTool = 'select' | 'pan' | 'zoom';

interface ToolState {
  /** The tool chosen in the toolbar or with its key. */
  tool: CanvasTool;
  /** Space is held, which pans for as long as it stays down. */
  space: boolean;
  /** Cmd (Ctrl off the Mac) is held, which zooms for as long as it stays down. */
  zoomKey: boolean;
  /** Option or Alt is held, which zooms out. */
  alt: boolean;
}

export const toolStore = createStore<ToolState>(() => ({
  tool: 'select',
  space: false,
  zoomKey: false,
  alt: false,
}));

/** The tool in use right now: a held key borrows a tool until it is let go. */
export const effectiveTool = (s: ToolState): CanvasTool =>
  s.space ? 'pan' : s.zoomKey ? 'zoom' : s.tool;

/**
 * Takes the held modifiers from any event that carries them: keys, pointer and wheel events all
 * do. Key events alone are not enough, because a modifier pressed while the page was not focused,
 * or a key-up the browser never sent, would leave the tool wrong until the next key press.
 */
export function syncModifiers(
  e: { metaKey: boolean; ctrlKey: boolean; altKey: boolean },
  mac = isMac(),
): void {
  const zoomKey = mac ? e.metaKey : e.ctrlKey;
  const now = toolStore.getState();
  if (now.zoomKey !== zoomKey || now.alt !== e.altKey)
    toolStore.setState({ zoomKey, alt: e.altKey });
}

/** Forgets every held key, for when the page cannot tell what is down any more. */
export function releaseHeldKeys(): void {
  const now = toolStore.getState();
  if (now.space || now.zoomKey || now.alt)
    toolStore.setState({ space: false, zoomKey: false, alt: false });
}

export const setTool = (tool: CanvasTool) => toolStore.setState({ tool });

export function useEffectiveTool(): CanvasTool {
  return useStore(toolStore, effectiveTool);
}

export function useZoomsOut(): boolean {
  return useStore(toolStore, (s) => s.alt);
}

/** Set when the view was panned while Space was down, so letting go does not count as a tap. */
let panned = false;
export const notePanned = () => {
  panned = true;
};
export const takePanned = () => {
  const was = panned;
  panned = false;
  return was;
};
