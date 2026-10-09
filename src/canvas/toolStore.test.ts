import { beforeEach, describe, expect, it } from 'vitest';
import { effectiveTool, releaseHeldKeys, syncModifiers, toolStore } from './toolStore';

const keys = (over: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean }> = {}) => ({
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...over,
});

beforeEach(() => {
  toolStore.setState({ tool: 'select', space: false, zoomKey: false, alt: false });
});

describe('syncModifiers', () => {
  it('reads Cmd on a Mac and Ctrl elsewhere', () => {
    syncModifiers(keys({ metaKey: true }), true);
    expect(toolStore.getState().zoomKey).toBe(true);
    syncModifiers(keys({ ctrlKey: true }), true);
    expect(toolStore.getState().zoomKey).toBe(false);
    syncModifiers(keys({ ctrlKey: true }), false);
    expect(toolStore.getState().zoomKey).toBe(true);
    syncModifiers(keys({ metaKey: true }), false);
    expect(toolStore.getState().zoomKey).toBe(false);
  });

  it('corrects a state that missed a key press or a key release', () => {
    syncModifiers(keys({ metaKey: true, altKey: true }), true);
    expect(effectiveTool(toolStore.getState())).toBe('zoom');
    expect(toolStore.getState().alt).toBe(true);
    // The release was never seen, but the next event says nothing is held.
    syncModifiers(keys(), true);
    expect(effectiveTool(toolStore.getState())).toBe('select');
    expect(toolStore.getState().alt).toBe(false);
  });

  it('does not change the store when nothing differs', () => {
    const before = toolStore.getState();
    syncModifiers(keys(), true);
    expect(toolStore.getState()).toBe(before);
  });
});

describe('releaseHeldKeys', () => {
  it('lets go of Space, Cmd and Alt but keeps the chosen tool', () => {
    toolStore.setState({ tool: 'pan', space: true, zoomKey: true, alt: true });
    releaseHeldKeys();
    expect(toolStore.getState()).toMatchObject({
      tool: 'pan',
      space: false,
      zoomKey: false,
      alt: false,
    });
  });
});
