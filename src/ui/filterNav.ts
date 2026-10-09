import { announce } from '../a11y';
import { ancestorsOf, setFolded } from '../model';
import { canopyStore } from '../store';
import { runFilter } from './filter';
import { showToast } from './toast';
import { uiStore } from './uiStore';

/** Moves the selection to the next or previous topic the Filter picks out, in reading order. */
export function jumpFilter(delta: 1 | -1): void {
  const { filterSel, filterMode } = uiStore.getState();
  const { doc, focus, commit, select } = canopyStore.getState();
  const active = runFilter(doc, filterSel, filterMode);
  if (!active) {
    showToast('Turn on a Filter first (press / to choose one).');
    return;
  }
  const { ordered } = active.result;
  if (ordered.length === 0) {
    announce('No topics match this Filter');
    return;
  }
  // Reading order is document order, so find where the focused topic would sit among the matches.
  const at = ordered.indexOf(focus);
  const next =
    at >= 0
      ? ordered[(at + delta + ordered.length) % ordered.length]
      : (ordered.find((id, i) => i >= 0 && id > focus) ?? ordered[0]);
  const target = delta === 1 ? next : at >= 0 ? next : ordered[ordered.length - 1];
  if (!target) return;

  // A match inside a folded branch is shown by opening the branch.
  let map = doc;
  for (const a of ancestorsOf(doc, target)) if (a.folded) map = setFolded(map, a.id, false);
  if (map !== doc) commit(map, { select: [target], focus: target });
  else select([target], target);
  const position = ordered.indexOf(target) + 1;
  announce(
    `Match ${position} of ${ordered.length}: ${doc.topics[target]?.title.trim() || 'Empty topic'}`,
  );
}
