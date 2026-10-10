import { describe, expect, it } from 'vitest';
import { createViewportStore } from '../canvas/viewportStore';
import { computeLayout, type Layout, type Measure } from '../layout';
import {
  addTopicReference,
  childrenOf,
  createMap,
  createSubTopic,
  setFolded,
  type CanopyMap,
  type Flow,
} from '../model';
import { createCanopyStore } from '../store';
import { setReferenceFocus, uiStore } from '../ui/uiStore';
import {
  executeCommand,
  nearestVisible,
  survivorAfterDelete,
  topLevel,
  type CommandContext,
} from './commands';
import { navigate } from './navigation';

const measure: Measure = () => ({ w: 100, h: 40 });

/** Core with A, B, C; A1, A2 under A; B1 under B. */
function sample(flow: Flow = 'right'): CanopyMap {
  let map = createMap({ coreId: 'core' });
  const add = (parentId: string, id: string) => {
    map = createSubTopic(map, parentId, { id, title: id.toUpperCase() }).map;
  };
  add('core', 'a');
  add('core', 'b');
  add('core', 'c');
  add('a', 'a1');
  add('a', 'a2');
  add('b', 'b1');
  return { ...map, prefs: { ...map.prefs, flow } };
}

function setup(flow: Flow = 'right') {
  const store = createCanopyStore({ doc: sample(flow) });
  const messages: string[] = [];
  let released = 0;
  const layoutOf = (): Layout => {
    const doc = store.getState().doc;
    return computeLayout(doc, { flow: doc.prefs.flow, density: 'comfortable', measure });
  };
  const ctx: CommandContext = {
    store,
    viewport: createViewportStore(),
    getLayout: layoutOf,
    announce: (m) => messages.push(m),
    releaseFocus: () => void released++,
  };
  const run = (id: Parameters<typeof executeCommand>[0], key?: string, shiftKey = false) =>
    executeCommand(id, ctx, key ? { key, shiftKey } : undefined);
  const focusOn = (...ids: string[]) => store.getState().select(ids, ids[ids.length - 1]);
  const titles = (parent: string) => childrenOf(store.getState().doc, parent).map((t) => t.title);
  return { store, run, focusOn, titles, messages, ctx, released: () => released };
}

describe('arrow navigation', () => {
  it('moves along the tree in a Right Flow', () => {
    const map = sample();
    const layout = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    expect(navigate(map, layout, 'core', 'right')).toEqual({ type: 'go', id: 'a' });
    expect(navigate(map, layout, 'a', 'left')).toEqual({ type: 'go', id: 'core' });
    expect(navigate(map, layout, 'a', 'down')).toEqual({ type: 'go', id: 'b' });
    expect(navigate(map, layout, 'b', 'up')).toEqual({ type: 'go', id: 'a' });
    expect(navigate(map, layout, 'core', 'left')).toBeNull();
    expect(navigate(map, layout, 'c', 'right')).toBeNull();
  });

  it('visits peers of a level in screen order, including cousins', () => {
    const map = sample();
    const layout = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    expect(navigate(map, layout, 'a2', 'down')).toEqual({ type: 'go', id: 'b1' });
    expect(navigate(map, layout, 'b1', 'up')).toEqual({ type: 'go', id: 'a2' });
  });

  it('swaps the axes in a Down Flow', () => {
    const map = sample('down');
    const layout = computeLayout(map, { flow: 'down', density: 'comfortable', measure });
    expect(navigate(map, layout, 'core', 'down')).toEqual({ type: 'go', id: 'a' });
    expect(navigate(map, layout, 'a', 'up')).toEqual({ type: 'go', id: 'core' });
    expect(navigate(map, layout, 'a', 'right')).toEqual({ type: 'go', id: 'b' });
  });

  it('asks to unfold a folded topic instead of moving', () => {
    const map = setFolded(sample(), 'a', true);
    const layout = computeLayout(map, { flow: 'right', density: 'comfortable', measure });
    expect(navigate(map, layout, 'a', 'right')).toEqual({ type: 'unfold' });
  });
});

describe('creating topics', () => {
  it('Tab adds a sub-topic and starts editing it', () => {
    const { store, run } = setup();
    store.getState().select(['b']);
    run('topic.addChild');
    const s = store.getState();
    expect(s.editing).toBe(s.focus);
    expect(s.doc.topics[s.focus]?.parentId).toBe('b');
    expect(s.selection).toEqual([s.focus]);
  });

  it('adds a peer after or before; the Core gets a sub-topic', () => {
    const { store, run, focusOn, titles } = setup();
    focusOn('b');
    run('topic.addPeerAfter');
    focusOn('b');
    run('topic.addPeerBefore');
    expect(titles('core')).toEqual(['A', '', 'B', '', 'C']);

    focusOn('core');
    run('topic.addPeerAfter');
    const added = store.getState().focus;
    expect(store.getState().doc.topics[added]?.parentId).toBe('core');
  });

  it('wraps the selected siblings in a new topic that takes their place', () => {
    const { store, run, focusOn, titles } = setup();
    focusOn('a', 'b');
    run('topic.wrap');
    const s = store.getState();
    expect(titles('core')).toEqual(['', 'C']);
    expect(titles(s.focus)).toEqual(['A', 'B']);
    expect(s.editing).toBe(s.focus);
    expect(titles('a')).toEqual(['A1', 'A2']);
  });

  it('wraps a single topic, and refuses topics from different parents', () => {
    const { store, run, focusOn, titles, messages } = setup();
    focusOn('b1');
    run('topic.wrap');
    expect(titles('b')).toEqual(['']);

    focusOn('a1', 'c');
    run('topic.wrap');
    expect(messages.at(-1)).toMatch(/share a parent/);
    expect(titles('a')).toEqual(['A1', 'A2']);
    expect(store.getState().doc.topics['c']?.parentId).toBe('core');
  });

  it('inserts a topic below that holds all the sub-topics', () => {
    const { store, run, focusOn, titles } = setup();
    focusOn('a');
    run('topic.insertBelow');
    const added = store.getState().focus;
    expect(titles('a')).toEqual(['']);
    expect(titles(added)).toEqual(['A1', 'A2']);

    focusOn('c');
    run('topic.insertBelow');
    expect(titles('c')).toEqual(['']);
  });

  it('is a single undo step that restores the previous focus', () => {
    const { store, run, focusOn } = setup();
    focusOn('b');
    run('topic.addChild');
    store.getState().undo();
    expect(store.getState().focus).toBe('b');
    expect(childrenOf(store.getState().doc, 'b')).toHaveLength(1);
  });
});

describe('editing a title', () => {
  it('Escape puts the old title back and keeps no history', () => {
    const { store, run, focusOn } = setup();
    focusOn('a');
    run('topic.edit');
    expect(store.getState().editing).toBe('a');
    const pastBefore = store.getState().past.length;
    store.getState().commit(
      {
        ...store.getState().doc,
        topics: {
          ...store.getState().doc.topics,
          a: { ...store.getState().doc.topics['a']!, title: 'Changed' },
        },
      },
      { group: 'rename:a' },
    );
    store.getState().cancelEdit();
    expect(store.getState().doc.topics['a']?.title).toBe('A');
    expect(store.getState().editing).toBeNull();
    expect(store.getState().past).toHaveLength(pastBefore);
  });
});

describe('deleting', () => {
  it('removes selected branches once and moves focus to a survivor', () => {
    const { store, run, focusOn } = setup();
    focusOn('a', 'a1');
    run('topic.delete');
    const s = store.getState();
    expect(s.doc.topics['a']).toBeUndefined();
    expect(s.doc.topics['a1']).toBeUndefined();
    expect(s.focus).toBe('b');
  });

  describe('topics with sub-topics', () => {
    /** A context that records the question asked instead of showing a dialog. */
    function asking() {
      const t = setup();
      let asked = 0;
      t.ctx.app = { confirmDelete: () => void asked++ } as NonNullable<CommandContext['app']>;
      return { ...t, asked: () => asked };
    }

    it('asks before deleting a topic that has sub-topics, and changes nothing yet', () => {
      const t = asking();
      t.focusOn('a');
      t.run('topic.delete');
      expect(t.asked()).toBe(1);
      expect(t.titles('core')).toEqual(['A', 'B', 'C']);
      expect(t.titles('a')).toEqual(['A1', 'A2']);
    });

    it('does not ask for a topic with nothing below it', () => {
      const t = asking();
      t.focusOn('c');
      t.run('topic.delete');
      expect(t.asked()).toBe(0);
      expect(t.titles('core')).toEqual(['A', 'B']);
    });

    it('asks when any of several selected topics has sub-topics', () => {
      const t = asking();
      t.focusOn('c', 'a');
      t.run('topic.delete');
      expect(t.asked()).toBe(1);
      expect(t.titles('core')).toEqual(['A', 'B', 'C']);
    });

    it('deletes the whole branch when told to', () => {
      const t = asking();
      t.focusOn('a');
      t.run('topic.deleteBranch');
      expect(t.titles('core')).toEqual(['B', 'C']);
      expect(t.store.getState().doc.topics['a1']).toBeUndefined();
    });

    it('deletes only the topic and lifts its sub-topics into its place', () => {
      const t = asking();
      t.focusOn('a');
      t.run('topic.deleteKeep');
      expect(t.titles('core')).toEqual(['A1', 'A2', 'B', 'C']);
      expect(t.store.getState().selection).toEqual(['a1', 'a2']);
      t.store.getState().undo();
      expect(t.titles('core')).toEqual(['A', 'B', 'C']);
      expect(t.titles('a')).toEqual(['A1', 'A2']);
    });

    it('lifts several selected topics, even when one sits inside another', () => {
      const t = asking();
      t.focusOn('a', 'a1', 'b');
      t.run('topic.deleteKeep');
      expect(t.titles('core')).toEqual(['A2', 'B1', 'C']);
      expect(t.store.getState().doc.topics['a']).toBeUndefined();
      expect(t.store.getState().doc.topics['a1']).toBeUndefined();
    });

    it('leaves a topic with nothing below it simply deleted', () => {
      const t = asking();
      t.focusOn('c');
      t.run('topic.deleteKeep');
      expect(t.titles('core')).toEqual(['A', 'B']);
    });

    it('never removes the Core this way either', () => {
      const t = asking();
      t.focusOn('core');
      t.run('topic.deleteKeep');
      expect(t.store.getState().doc.topics['a']).toBeDefined();
      expect(t.messages.at(-1)).toMatch(/Core cannot be deleted/);
    });
  });

  it('refuses to delete the Core', () => {
    const { store, run, focusOn, messages } = setup();
    focusOn('core');
    run('topic.delete');
    expect(store.getState().doc.topics['core']).toBeDefined();
    expect(messages.at(-1)).toMatch(/Core/);
  });

  it('picks survivors sensibly', () => {
    const map = sample();
    expect(survivorAfterDelete(map, new Set(['b']), 'b')).toBe('c');
    expect(survivorAfterDelete(map, new Set(['b', 'c']), 'b')).toBe('a');
    expect(survivorAfterDelete(map, new Set(['a', 'b', 'c']), 'a')).toBe('core');
    expect(topLevel(map, ['a', 'a1', 'b'])).toEqual(['a', 'b']);
  });
});

describe('duplicate, fold and reorder', () => {
  it('duplicates and selects the copies', () => {
    const { store, run, focusOn, titles } = setup();
    focusOn('a');
    run('topic.duplicate');
    expect(titles('core')).toEqual(['A', 'A', 'B', 'C']);
    expect(store.getState().selection).toHaveLength(1);
    expect(store.getState().focus).not.toBe('a');
  });

  it('folds and unfolds, and announces hidden topics', () => {
    const { store, run, focusOn, messages } = setup();
    focusOn('a');
    run('topic.toggleFold');
    expect(store.getState().doc.topics['a']?.folded).toBe(true);
    expect(messages.at(-1)).toBe('Folded A, 2 topics hidden');
    run('topic.toggleFold');
    expect(store.getState().doc.topics['a']?.folded).toBe(false);
  });

  it('says so when there is nothing to fold', () => {
    const { run, focusOn, messages } = setup();
    focusOn('c');
    run('topic.toggleFold');
    expect(messages.at(-1)).toBe('C has no sub-topics');
  });

  it('folds to a level and moves hidden selection to the folded ancestor', () => {
    const { store, run, focusOn } = setup();
    focusOn('a1');
    run('view.foldToLevel', '1');
    expect(store.getState().doc.topics['a']?.folded).toBe(true);
    expect(store.getState().selection).toEqual(['a']);
    run('view.unfoldAll', '0');
    expect(store.getState().doc.topics['a']?.folded).toBe(false);
    expect(nearestVisible(store.getState().doc, 'a1')).toBe('a1');
  });

  it('reorders along the Flow only', () => {
    const { run, focusOn, titles, messages } = setup();
    focusOn('b');
    run('topic.reorder', 'ArrowUp');
    expect(titles('core')).toEqual(['B', 'A', 'C']);
    expect(messages.at(-1)).toBe('Moved B to position 1 of 3');
    run('topic.reorder', 'ArrowUp');
    expect(messages.at(-1)).toBe('Already first');
    run('topic.reorder', 'ArrowLeft');
    expect(titles('core')).toEqual(['B', 'A', 'C']);
  });
});

describe('selection and history commands', () => {
  it('moves with arrows and extends with Shift', () => {
    const { store, run, focusOn } = setup();
    focusOn('core');
    run('nav.arrow', 'ArrowRight');
    expect(store.getState().focus).toBe('a');
    run('nav.arrow', 'ArrowDown', true);
    expect(store.getState().selection).toEqual(['a', 'b']);
    expect(store.getState().focus).toBe('b');
  });

  it('unfolds with the right arrow on a folded topic', () => {
    const { store, run, focusOn } = setup();
    focusOn('a');
    run('topic.toggleFold');
    run('nav.arrow', 'ArrowRight');
    expect(store.getState().doc.topics['a']?.folded).toBe(false);
  });

  it('selects a branch with select-all', () => {
    const { store, run, focusOn } = setup();
    focusOn('a');
    run('select.all');
    expect(store.getState().selection.sort()).toEqual(['a', 'a1', 'a2']);
  });

  it('Escape narrows the selection, then releases focus', () => {
    const { store, run, focusOn, released } = setup();
    focusOn('a', 'b');
    run('select.escape');
    expect(store.getState().selection).toEqual(['b']);
    run('select.escape');
    expect(released()).toBe(1);
  });

  it('undoes and redoes with announcements', () => {
    const { store, run, focusOn, messages } = setup();
    run('edit.undo');
    expect(messages.at(-1)).toBe('Nothing to undo');
    focusOn('c');
    run('topic.delete');
    run('edit.undo');
    expect(store.getState().doc.topics['c']).toBeDefined();
    run('edit.redo');
    expect(store.getState().doc.topics['c']).toBeUndefined();
  });
});

describe('reference lines from the keyboard', () => {
  /** B points at A and at C, and C points at B. */
  const withReferences = () => {
    const t = setup();
    let doc = t.store.getState().doc;
    doc = addTopicReference(doc, 'b', 'a');
    doc = addTopicReference(doc, 'b', 'c');
    doc = addTopicReference(doc, 'c', 'b');
    t.store.getState().commit(doc);
    setReferenceFocus(null);
    return t;
  };

  it('Delete removes a picked line and leaves every topic alone', () => {
    const { store, run, focusOn, messages } = withReferences();
    focusOn('b');
    setReferenceFocus({ from: 'b', to: 'a' });
    expect(run('topic.delete')).toBe(true);
    const doc = store.getState().doc;
    // Only that line went. The selected topic and the other lines are still there.
    expect(doc.topics['b']).toBeDefined();
    expect(doc.topics['b']?.references).toEqual(['c']);
    expect(doc.topics['c']?.references).toEqual(['b']);
    expect(uiStore.getState().referenceFocus).toBeNull();
    expect(messages.at(-1)).toMatch(/Removed the reference from B to A/);
    // One undo brings it back.
    store.getState().undo();
    expect(store.getState().doc.topics['b']?.references).toEqual(['a', 'c']);
  });

  it('removes a line that points at the selected topic, from the other end', () => {
    const { store, run, focusOn } = withReferences();
    focusOn('b');
    setReferenceFocus({ from: 'c', to: 'b' });
    run('topic.delete');
    expect(store.getState().doc.topics['c']?.references).toBeUndefined();
    expect(store.getState().doc.topics['b']).toBeDefined();
  });

  it('deletes the topic as before when no line is picked', () => {
    const { store, run, focusOn } = withReferences();
    focusOn('c');
    setReferenceFocus(null);
    run('topic.delete');
    expect(store.getState().doc.topics['c']).toBeUndefined();
  });

  it('ignores a picked line that is already gone, and then deletes the topic as usual', () => {
    const { store, run, focusOn } = withReferences();
    focusOn('c');
    setReferenceFocus({ from: 'b', to: 'nowhere' });
    run('topic.delete');
    expect(uiStore.getState().referenceFocus).toBeNull();
    expect(store.getState().doc.topics['c']).toBeUndefined();
  });

  it('Escape puts a picked line down before it does anything else', () => {
    const { store, run, focusOn, released } = withReferences();
    focusOn('b');
    setReferenceFocus({ from: 'b', to: 'a' });
    run('select.escape');
    expect(uiStore.getState().referenceFocus).toBeNull();
    expect(released()).toBe(0);
    expect(store.getState().selection).toEqual(['b']);
    // A second Escape does what it always did.
    run('select.escape');
    expect(released()).toBe(1);
  });

  it('Shift X steps through the lines of the focused topic, then puts them down', () => {
    const { run, focusOn, messages } = withReferences();
    focusOn('b');
    run('topic.referencePick');
    expect(uiStore.getState().referenceFocus).toEqual({ from: 'b', to: 'a' });
    expect(messages.at(-1)).toMatch(/Reference line 1 of 3, from B to A/);
    run('topic.referencePick');
    expect(uiStore.getState().referenceFocus).toEqual({ from: 'b', to: 'c' });
    // The third is the one that points at B.
    run('topic.referencePick');
    expect(uiStore.getState().referenceFocus).toEqual({ from: 'c', to: 'b' });
    expect(messages.at(-1)).toMatch(/Reference line 3 of 3, from C to B/);
    run('topic.referencePick');
    expect(uiStore.getState().referenceFocus).toBeNull();
    expect(messages.at(-1)).toBe('No reference line picked');
  });

  it('says so when the topic has no lines', () => {
    const { run, focusOn, messages } = withReferences();
    focusOn('a1');
    run('topic.referencePick');
    expect(uiStore.getState().referenceFocus).toBeNull();
    expect(messages.at(-1)).toBe('A1 has no reference lines');
  });
});
