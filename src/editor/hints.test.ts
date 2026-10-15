import { describe, expect, it } from 'vitest';
import { hintsFor } from './hints';

const base = { editing: false, selectionCount: 1, focusIsCore: false, focusHasChildren: false };
const labels = (hints: { label: string }[]) => hints.map((h) => h.label);

describe('hintsFor', () => {
  it('shows editing shortcuts while a title is typed', () => {
    const hints = hintsFor({ ...base, editing: true }, true);
    expect(labels(hints)).toEqual(['Next node', 'Sub-topic', 'New line', 'Cancel']);
    expect(hints[2]?.keys).toBe('⇧↵');
  });

  it('suggests creating topics for a topic and folding only when it has children', () => {
    expect(labels(hintsFor(base, true))).toEqual([
      'Add child node',
      'Add peer below',
      'Edit title',
      'Delete branch',
      'Properties',
      'Tag',
      'Due date',
      'Sticker',
      'Tasks',
    ]);
    expect(labels(hintsFor({ ...base, focusHasChildren: true }, true))).toContain('Fold');
    expect(
      labels(hintsFor({ ...base, focusHasChildren: true, focusFolded: true }, true)),
    ).toContain('Unfold');
  });

  it('does not offer peers for the Core', () => {
    expect(labels(hintsFor({ ...base, focusIsCore: true }, true))).toEqual([
      'Add child node',
      'Edit title',
      'Tasks',
      'Sticker',
      'Unfold everything',
    ]);
  });

  it('switches to bulk actions for several topics', () => {
    expect(labels(hintsFor({ ...base, selectionCount: 3 }, false))).toEqual([
      'Delete branch',
      'Duplicate branch',
      'Properties',
      'Tag',
      'Due date',
      'Clear selection',
    ]);
  });
});
