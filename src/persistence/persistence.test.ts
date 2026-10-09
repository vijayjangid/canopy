import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMap, createSubTopic, parseJson, renameTopic, stringifyFile } from '../model';
import { createCanopyStore } from '../store';
import { attachAutosave } from './autosave';
import { openInitialMap, readMapFile } from './files';
import { createIndexedDbRepository } from './repository';

let dbCounter = 0;
const freshRepo = () => createIndexedDbRepository(`canopy-test-${dbCounter++}`);

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('repository', () => {
  it('stores, lists and removes maps', async () => {
    const repo = freshRepo();
    const doc = createSubTopic(createMap({ coreId: 'core', title: 'Plan' }), 'core', {
      id: 'a',
      title: 'A',
    }).map;
    await repo.put('m_1', doc, '2026-02-01T00:00:00.000Z');
    await repo.put('m_2', createMap({ title: 'Older' }), '2026-01-01T00:00:00.000Z');

    expect((await repo.list()).map((m) => m.id)).toEqual(['m_1', 'm_2']);
    const loaded = await repo.get('m_1');
    expect(loaded?.topics['a']?.title).toBe('A');
    expect(loaded?.meta.modified).toBe('2026-02-01T00:00:00.000Z');

    await repo.remove('m_1');
    expect(await repo.get('m_1')).toBeUndefined();
  });
});

describe('openInitialMap', () => {
  it('opens a fresh map on first run without storing it', async () => {
    const repo = freshRepo();
    const opened = await openInitialMap(repo, memoryStorage());
    expect(await repo.get(opened.mapId)).toBeUndefined();
  });

  it('reopens the remembered map', async () => {
    const repo = freshRepo();
    const storage = memoryStorage();
    const doc = createMap({ coreId: 'core', title: 'Plan' });
    await repo.put('m_kept', doc);
    storage.setItem('canopy.lastMapId', 'm_kept');
    const opened = await openInitialMap(repo, storage);
    expect(opened.mapId).toBe('m_kept');
    expect(opened.doc.meta.title).toBe('Plan');
  });

  it('starts a new map when the remembered one is gone', async () => {
    const repo = freshRepo();
    const storage = memoryStorage();
    storage.setItem('canopy.lastMapId', 'm_missing');
    const opened = await openInitialMap(repo, storage);
    expect(opened.mapId).not.toBe('m_missing');
  });
});

describe('autosave', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
  afterEach(() => vi.useRealTimers());

  it('saves once after edits settle, and restores the exact map', async () => {
    const repo = freshRepo();
    const store = createCanopyStore({ mapId: 'm_auto', doc: createMap({ coreId: 'core' }) });
    const statuses: string[] = [];
    const autosave = attachAutosave(store, repo, {
      delayMs: 500,
      onStatus: (s) => statuses.push(s),
    });

    store.getState().commit(renameTopic(store.getState().doc, 'core', 'One'));
    store
      .getState()
      .commit(createSubTopic(store.getState().doc, 'core', { id: 'a', title: 'A' }).map);
    expect(await repo.get('m_auto')).toBeUndefined();

    await vi.advanceTimersByTimeAsync(600);
    await autosave.flush();
    const saved = await repo.get('m_auto');
    expect(saved?.topics['core']?.title).toBe('One');
    expect(saved?.topics['a']?.title).toBe('A');
    expect(statuses.filter((s) => s === 'saving')).toHaveLength(1);
    expect(statuses.at(-1)).toBe('saved');
    autosave.dispose();
  });

  it('does not store a map that was only opened or started', async () => {
    const repo = freshRepo();
    const store = createCanopyStore({ mapId: 'm_blank', doc: createMap({ coreId: 'core' }) });
    const autosave = attachAutosave(store, repo, { delayMs: 500 });
    store.getState().load('m_other', createMap({ coreId: 'core' }));
    store.getState().newMap();
    await vi.advanceTimersByTimeAsync(600);
    await autosave.flush();
    expect(await repo.list()).toHaveLength(0);
    autosave.dispose();
  });

  it('stores a pending edit under its own map when another map is opened', async () => {
    const repo = freshRepo();
    const store = createCanopyStore({ mapId: 'm_a', doc: createMap({ coreId: 'core' }) });
    const autosave = attachAutosave(store, repo, { delayMs: 10_000 });
    store.getState().commit(renameTopic(store.getState().doc, 'core', 'Edited'));
    store.getState().load('m_b', createMap({ coreId: 'core' }));
    await autosave.flush();
    expect((await repo.get('m_a'))?.topics['core']?.title).toBe('Edited');
    expect(await repo.get('m_b')).toBeUndefined();
    autosave.dispose();
  });

  it('flush writes pending changes immediately', async () => {
    const repo = freshRepo();
    const store = createCanopyStore({ mapId: 'm_flush', doc: createMap({ coreId: 'core' }) });
    const autosave = attachAutosave(store, repo, { delayMs: 10_000 });
    store.getState().commit(renameTopic(store.getState().doc, 'core', 'Now'));
    await autosave.flush();
    expect((await repo.get('m_flush'))?.topics['core']?.title).toBe('Now');
    autosave.dispose();
  });

  it('reports errors from storage', async () => {
    const repo = freshRepo();
    repo.put = () => Promise.reject(new Error('disk full'));
    const store = createCanopyStore({ doc: createMap({ coreId: 'core' }) });
    const statuses: string[] = [];
    const autosave = attachAutosave(store, repo, { onStatus: (s) => statuses.push(s) });
    store.getState().commit(renameTopic(store.getState().doc, 'core', 'x'));
    await autosave.flush();
    expect(statuses.at(-1)).toBe('error');
    autosave.dispose();
  });
});

describe('file import', () => {
  it('reads a map file and reports bad files', async () => {
    const doc = createSubTopic(createMap({ coreId: 'core' }), 'core', { id: 'a', title: 'A' }).map;
    const ok = await readMapFile(new File([stringifyFile(doc)], 'x.canopy.json'));
    expect(ok.ok).toBe(true);
    const bad = await readMapFile(new File(['{"schema":"nope"}'], 'x.json'));
    expect(bad.ok).toBe(false);
    expect(parseJson('{"schema":"nope"}').ok).toBe(false);
  });
});
