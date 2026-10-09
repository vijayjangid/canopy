import { createMap, newId, parseJson, stringifyFile, type CanopyMap } from '../model';
import type { MapRepository } from './repository';

const LAST_OPENED_KEY = 'canopy.lastMapId';

export interface OpenedMap {
  mapId: string;
  doc: CanopyMap;
}

/** The map that was open last time, or a fresh one that is stored once it is edited. */
export async function openInitialMap(
  repo: MapRepository,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): Promise<OpenedMap> {
  const lastId = storage.getItem(LAST_OPENED_KEY);
  if (lastId) {
    const doc = await repo.get(lastId);
    if (doc) return { mapId: lastId, doc };
  }
  const mapId = newId('m_');
  return { mapId, doc: createMap() };
}

export function rememberOpenedMap(
  mapId: string,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  storage.setItem(LAST_OPENED_KEY, mapId);
}

// File System Access API is not in lib.dom yet.
interface FileHandleLike {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
}
interface PickerWindow {
  showSaveFilePicker?: (opts: unknown) => Promise<FileHandleLike>;
}

const FILE_TYPES = [
  { description: 'Canopy map', accept: { 'application/json': ['.canopy.json', '.json'] } },
];

function fileName(doc: CanopyMap): string {
  const base = doc.meta.title.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'Untitled map';
  return `${base}.canopy.json`;
}

/** Saves to a file chosen by the user, or downloads one when the browser cannot ask. */
export async function saveMapToFile(doc: CanopyMap): Promise<'saved' | 'cancelled'> {
  const blob = new Blob([stringifyFile(doc)], { type: 'application/json' });
  const picker = (window as PickerWindow).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: fileName(doc), types: FILE_TYPES });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName(doc);
  link.click();
  URL.revokeObjectURL(url);
  return 'saved';
}

export type OpenResult =
  { ok: true; doc: CanopyMap } | { ok: false; errors: string[] } | { ok: 'cancelled' };

export async function readMapFile(file: File): Promise<OpenResult> {
  const result = parseJson(await file.text());
  return result.ok ? { ok: true, doc: result.map } : result;
}

/** Asks for a file with a hidden input, which works in every browser. */
export function pickMapFile(): Promise<OpenResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.canopy.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) resolve({ ok: 'cancelled' });
      else void readMapFile(file).then(resolve);
    });
    input.addEventListener('cancel', () => resolve({ ok: 'cancelled' }));
    input.click();
  });
}
