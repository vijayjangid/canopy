import { announce } from '../a11y';
import { setTopicImage } from '../model';
import { canopyStore } from '../store';
import { startImageAltEdit } from '../ui/uiStore';

/** Takes the picture off a topic. Undo puts it back. */
export function removeImage(id: string): void {
  const { doc, commit, select } = canopyStore.getState();
  const topic = doc.topics[id];
  if (!topic?.image) return;
  select([id], id);
  commit(setTopicImage(doc, id, null));
  announce(`Removed the picture from ${topic.title.trim() || 'the topic'}`);
}

/** Opens the box for describing a topic's picture. */
export function editImageAlt(id: string): void {
  if (!canopyStore.getState().doc.topics[id]?.image) return;
  canopyStore.getState().select([id], id);
  // A press on the canvas moves focus to it once the pointer events end, which would close a
  // field opened right now, so open it a moment later.
  setTimeout(() => startImageAltEdit(id), 0);
}
