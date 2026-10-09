import { describe, expect, it } from 'vitest';
import { COMMANDS, findCommand, formatShortcut, matchShortcut } from './shortcuts';

const key = (init: KeyboardEventInit & { key: string }) => new KeyboardEvent('keydown', init);

describe('shortcut matching', () => {
  it('matches exact modifiers', () => {
    expect(findCommand(key({ key: 'z', metaKey: true }))?.id).toBe('edit.undo');
    expect(findCommand(key({ key: 'z', ctrlKey: true }))?.id).toBe('edit.undo');
    expect(findCommand(key({ key: 'Z', metaKey: true, shiftKey: true }))?.id).toBe('edit.redo');
    // Plain Z is Zen mode; undo needs Cmd or Ctrl.
    expect(findCommand(key({ key: 'z' }))?.id).toBe('view.zen');
    expect(findCommand(key({ key: 'z', altKey: true }))).toBeUndefined();
  });

  it('separates plain keys from Cmd and Alt variants', () => {
    expect(findCommand(key({ key: '0' }))?.id).toBe('view.unfoldAll');
    expect(findCommand(key({ key: '0', metaKey: true }))).toBeUndefined();
    expect(findCommand(key({ key: 'ArrowUp' }))?.id).toBe('nav.arrow');
    expect(findCommand(key({ key: 'ArrowUp', shiftKey: true }))?.id).toBe('nav.arrow');
    expect(findCommand(key({ key: 'ArrowUp', altKey: true }))?.id).toBe('topic.reorder');
  });

  it('keeps Shift+Enter free for a new line and accepts both zoom keys', () => {
    expect(findCommand(key({ key: 'Enter' }))?.id).toBe('topic.addPeerAfter');
    expect(findCommand(key({ key: 'Enter', shiftKey: true }))?.id).toBeUndefined();
    expect(findCommand(key({ key: '+', metaKey: true, shiftKey: true }))?.id).toBe('view.zoomIn');
    expect(findCommand(key({ key: '=', metaKey: true }))?.id).toBe('view.zoomIn');
  });

  it('gives no two commands the same shortcut', () => {
    const seen = new Map<string, string>();
    for (const command of COMMANDS) {
      for (const s of command.shortcuts) {
        const id = formatShortcut(s, true) + (s.shift === 'any' ? '*' : '');
        expect(seen.get(id), `${command.id} clashes with ${seen.get(id)}`).toBeUndefined();
        seen.set(id, command.id);
      }
    }
  });

  it('matches single shortcuts', () => {
    expect(matchShortcut(key({ key: 'Tab' }), { key: 'Tab' })).toBe(true);
    expect(matchShortcut(key({ key: 'Tab', shiftKey: true }), { key: 'Tab' })).toBe(false);
  });
});

describe('formatShortcut', () => {
  it('uses symbols on Mac and words elsewhere', () => {
    expect(formatShortcut({ key: 'z', mod: true, shift: true }, true)).toBe('⌘⇧Z');
    expect(formatShortcut({ key: 'z', mod: true, shift: true }, false)).toBe('Ctrl+Shift+Z');
    expect(formatShortcut({ key: 'Enter' }, true)).toBe('↵');
    expect(formatShortcut({ key: 'ArrowUp', alt: true }, true)).toBe('⌥↑');
    expect(formatShortcut({ key: ' ' }, false)).toBe('Space');
  });
});
