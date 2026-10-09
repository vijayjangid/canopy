import Dexie, { type EntityTable } from 'dexie';
import type { CanopyMap } from '../model';

export interface StoredMap {
  id: string;
  title: string;
  modified: string;
  doc: CanopyMap;
}

export type MapSummary = Pick<StoredMap, 'id' | 'title' | 'modified'>;

/** Where maps live. The IndexedDB version is the real one; tests can swap in another. */
export interface MapRepository {
  list(): Promise<MapSummary[]>;
  get(id: string): Promise<CanopyMap | undefined>;
  put(id: string, doc: CanopyMap, modified?: string): Promise<void>;
  remove(id: string): Promise<void>;
}

class CanopyDb extends Dexie {
  maps!: EntityTable<StoredMap, 'id'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ maps: 'id, modified' });
  }
}

export function createIndexedDbRepository(name = 'canopy'): MapRepository {
  const db = new CanopyDb(name);
  return {
    async list() {
      const rows = await db.maps.orderBy('modified').reverse().toArray();
      return rows.map(({ id, title, modified }) => ({ id, title, modified }));
    },
    async get(id) {
      return (await db.maps.get(id))?.doc;
    },
    async put(id, doc, modified = new Date().toISOString()) {
      const stamped: CanopyMap = { ...doc, meta: { ...doc.meta, modified } };
      await db.maps.put({ id, title: doc.meta.title, modified, doc: stamped });
    },
    async remove(id) {
      await db.maps.delete(id);
    },
  };
}
