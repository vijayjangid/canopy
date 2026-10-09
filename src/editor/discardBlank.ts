import { deleteBranch, hasChildren, type CanopyMap, type TopicId } from '../model';
import { settingsStore } from '../settings';
import { canopyStore } from '../store';
import { survivorAfterDelete } from './commands';

/** Blank topics that were left by pressing Enter or Tab, in the order they were made. */
const left = new Set<TopicId>();

/** Remembers a blank topic that the person moved on from without filling in. */
export const leaveBlank = (id: TopicId): void => void left.add(id);

function isBlank(doc: CanopyMap, id: TopicId): boolean {
  const topic = doc.topics[id];
  return (
    topic !== undefined &&
    topic.parentId !== null &&
    topic.title.trim() === '' &&
    !topic.note &&
    !topic.stickers?.length &&
    !topic.props &&
    !hasChildren(doc, id)
  );
}

/**
 * Removes a topic that was added and then left alone: no title, no details, nothing below it,
 * along with any blank topics passed over on the way to it with Enter or Tab. `pastLength` is the
 * history length when its editing began, so a topic that was only created can be undone away
 * without leaving a pair of steps in the history. It is null for a topic that already had a title,
 * which is never removed here.
 */
export function discardBlank(id: TopicId, pastLength: number | null): void {
  if (!settingsStore.getState().discardBlank) {
    left.clear();
    return;
  }
  const state = canopyStore.getState();
  if (state.editing === id) return;

  const { selection, focus } = state;
  const onlyThis = selection.length === 1 && selection[0] === id;
  if (pastLength === null) {
    // An existing topic keeps its place, even if its title was cleared.
  } else if (isBlank(state.doc, id) && state.past.length === pastLength) {
    // Nothing was done since it was created, so stepping back removes it cleanly.
    state.undo();
    canopyStore.setState({ future: [] });
    if (!onlyThis) canopyStore.getState().select(selection, focus);
    left.delete(id);
  } else if (isBlank(state.doc, id)) {
    left.add(id);
  }

  // Newest first, so a blank parent goes once its blank children have.
  let { doc } = canopyStore.getState();
  const gone = new Set<TopicId>();
  for (let again = true; again;) {
    again = false;
    for (const candidate of [...left].reverse()) {
      if (!doc.topics[candidate]) {
        left.delete(candidate);
      } else if (isBlank(doc, candidate) && canopyStore.getState().editing !== candidate) {
        doc = deleteBranch(doc, candidate);
        gone.add(candidate);
        left.delete(candidate);
        again = true;
      }
    }
  }
  left.clear();
  if (gone.size === 0) return;

  const now = canopyStore.getState();
  const reselect = now.selection.some((s) => gone.has(s));
  const target = reselect ? survivorAfterDelete(now.doc, gone, now.focus) : now.focus;
  now.commit(doc, reselect ? { select: [target], focus: target } : {});
}
