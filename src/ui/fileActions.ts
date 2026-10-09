import { graftMap, newId } from '../model';
import { pickMapFile, rememberOpenedMap, saveMapToFile } from '../persistence';
import type { MapRepository } from '../persistence';
import { announce } from '../a11y';
import { canopyStore } from '../store';
import { showToast } from './toast';

/**
 * Starts an empty map with its Core already open for naming. Autosave stores it once it is
 * edited, and the old map stays in the list.
 */
export function startNewMap(): void {
  const state = canopyStore.getState();
  const mapId = state.newMap();
  rememberOpenedMap(mapId);
  const { setEditing, doc } = canopyStore.getState();
  setEditing(doc.coreId);
  announce('New map. Type a name for the central topic');
}

export async function openMapFromFile(): Promise<void> {
  const result = await pickMapFile();
  if (result.ok === 'cancelled') return;
  if (!result.ok) {
    const message = result.errors[0] ?? 'This file could not be opened';
    showToast(`Could not open the file: ${message}`);
    announce(`Could not open the file. ${message}`);
    return;
  }
  const mapId = newId('m_');
  canopyStore.getState().load(mapId, result.doc);
  rememberOpenedMap(mapId);
  announce(`Opened ${result.doc.meta.title}`);
}

/** Adds a map file, whole, as a new branch under the selected topic. */
export async function importMapAsBranch(): Promise<void> {
  const result = await pickMapFile();
  if (result.ok === 'cancelled') return;
  if (!result.ok) {
    const message = result.errors[0] ?? 'This file could not be read';
    showToast(`Could not add the file: ${message}`);
    announce(`Could not add the file. ${message}`);
    return;
  }
  const { doc, focus, commit } = canopyStore.getState();
  const grafted = graftMap(doc, doc.topics[focus] ? focus : doc.coreId, result.doc);
  commit(grafted.map, { select: [grafted.id], focus: grafted.id });
  announce(`Added ${result.doc.meta.title} with ${grafted.count} topics`);
}

export async function saveMapAsFile(): Promise<void> {
  const outcome = await saveMapToFile(canopyStore.getState().doc);
  if (outcome === 'saved') showToast('Saved a copy as a file');
}

export async function openStoredMap(repo: MapRepository, id: string): Promise<void> {
  const doc = await repo.get(id);
  if (!doc) {
    showToast('That map is no longer stored on this device');
    return;
  }
  canopyStore.getState().load(id, doc);
  rememberOpenedMap(id);
  announce(`Opened ${doc.meta.title}`);
}
