import { describe, expect, it } from 'vitest';
import { createMap, createSubTopic, deleteBranch, renameTopic } from '../model';
import { canRedo, canUndo, createCanopyStore } from './store';

function setup() {
  let clock = 0;
  const store = createCanopyStore(
    { mapId: 'm_test', doc: createMap({ coreId: 'core' }) },
    { now: () => clock },
  );
  return { store, tick: (ms: number) => (clock += ms) };
}

describe('store history', () => {
  it('undoes and redoes with the selection that went with each step', () => {
    const { store } = setup();
    const { commit, undo, redo } = store.getState();
    const added = createSubTopic(store.getState().doc, 'core', { id: 'a' });
    commit(added.map, { select: ['a'] });
    expect(store.getState().focus).toBe('a');

    undo();
    expect(store.getState().doc.topics['a']).toBeUndefined();
    expect(store.getState().focus).toBe('core');
    expect(canRedo(store.getState())).toBe(true);

    redo();
    expect(store.getState().doc.topics['a']).toBeDefined();
    expect(store.getState().focus).toBe('a');
    expect(canUndo(store.getState())).toBe(true);
  });

  it('ignores edits that change nothing', () => {
    const { store } = setup();
    store.getState().commit(store.getState().doc);
    expect(store.getState().past).toHaveLength(0);
  });

  it('clears redo after a new edit', () => {
    const { store } = setup();
    const { commit, undo } = store.getState();
    commit(createSubTopic(store.getState().doc, 'core', { id: 'a' }).map);
    undo();
    commit(createSubTopic(store.getState().doc, 'core', { id: 'b' }).map);
    expect(store.getState().future).toHaveLength(0);
  });

  it('groups rapid edits with the same key into one step', () => {
    const { store, tick } = setup();
    const { commit, undo } = store.getState();
    const rename = (title: string) =>
      commit(renameTopic(store.getState().doc, 'core', title), { group: 'rename:core' });
    rename('H');
    tick(100);
    rename('He');
    tick(100);
    rename('Hel');
    expect(store.getState().past).toHaveLength(1);
    undo();
    expect(store.getState().doc.topics['core']?.title).toBe('Central topic');
  });

  it('starts a new step after the group window passes', () => {
    const { store, tick } = setup();
    const { commit } = store.getState();
    commit(renameTopic(store.getState().doc, 'core', 'One'), { group: 'g' });
    tick(5000);
    commit(renameTopic(store.getState().doc, 'core', 'Two'), { group: 'g' });
    expect(store.getState().past).toHaveLength(2);
  });

  it('caps history length', () => {
    const store = createCanopyStore({ doc: createMap({ coreId: 'core' }) }, { historyLimit: 3 });
    for (let i = 0; i < 10; i++) {
      store.getState().commit(renameTopic(store.getState().doc, 'core', `T${i}`));
    }
    expect(store.getState().past).toHaveLength(3);
  });
});

describe('store selection', () => {
  it('falls back when selected topics are deleted', () => {
    const { store } = setup();
    const { commit } = store.getState();
    commit(createSubTopic(store.getState().doc, 'core', { id: 'a' }).map, { select: ['a'] });
    commit(deleteBranch(store.getState().doc, 'a'));
    expect(store.getState().selection).toEqual(['core']);
    expect(store.getState().focus).toBe('core');
  });

  it('starts editing a new topic and drops editing when it disappears', () => {
    const { store } = setup();
    const { commit, undo } = store.getState();
    commit(createSubTopic(store.getState().doc, 'core', { id: 'a' }).map, {
      select: ['a'],
      edit: 'a',
    });
    expect(store.getState().editing).toBe('a');
    undo();
    expect(store.getState().editing).toBeNull();
  });

  it('loads and creates maps with fresh history', () => {
    const { store } = setup();
    store.getState().commit(renameTopic(store.getState().doc, 'core', 'X'));
    const id = store.getState().newMap();
    expect(store.getState().mapId).toBe(id);
    expect(store.getState().past).toHaveLength(0);
    expect(store.getState().selection).toEqual([store.getState().doc.coreId]);
  });
});
