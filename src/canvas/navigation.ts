import { ancestorsOf, setFolded, setTopicReference } from '../model';
import { canopyStore } from '../store';
import { announce } from '../a11y';
import { setFocusBranch, setReferenceFocus } from '../ui/uiStore';
import { focusCanvas, layoutState } from './layoutState';
import { viewportStore } from './viewportStore';

/** Takes away the reference that leaves a topic. */
export function removeReference(from: string): void {
  const { doc, commit } = canopyStore.getState();
  if (!doc.topics[from]?.referenceTo) return;
  const target = doc.topics[doc.topics[from].referenceTo];
  commit(setTopicReference(doc, from, null));
  setReferenceFocus(null);
  const name = (title: string | undefined) => title?.trim() || 'Empty topic';
  announce(`Removed reference from ${name(doc.topics[from].title)} to ${name(target?.title)}`);
}

/** Selects a topic, unfolds its path and brings it into view. */
export function navigateToTopic(id: string): void {
  const state = canopyStore.getState();
  let doc = state.doc;
  for (const ancestor of ancestorsOf(doc, id).reverse()) {
    if (doc.topics[ancestor.id]?.folded) doc = setFolded(doc, ancestor.id, false);
  }
  if (doc !== state.doc) state.commit(doc);
  state.select([id], id);
  setFocusBranch(null);
  requestAnimationFrame(() => {
    const box = layoutState.getState().layout?.boxes.get(id);
    if (box) viewportStore.getState().reveal(box, 72);
    focusCanvas();
  });
}
