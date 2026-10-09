import { useMemo, useRef } from 'react';
import { focusCanvas } from '../canvas/layoutState';
import { executeCommand, topLevel } from '../editor/commands';
import { appContext } from '../editor/context';
import { childrenOf, subtreeOf } from '../model';
import { canopyStore } from '../store';
import { Dialog } from './Dialog';
import { closeDialog } from './uiStore';
import './dialog.css';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const nameOf = (title: string | undefined) => title?.trim() || 'Empty topic';

/** Asks what to do with the sub-topics of topics that are about to be deleted. */
export function DeleteConfirm() {
  const root = useRef<HTMLDivElement>(null);
  const info = useMemo(() => {
    const { doc, selection } = canopyStore.getState();
    const doomed = topLevel(
      doc,
      selection.filter((s) => s !== doc.coreId),
    );
    const withKids = doomed.filter((id) => childrenOf(doc, id).length > 0);
    const below = doomed.reduce((sum, id) => sum + subtreeOf(doc, id).length - 1, 0);
    const direct = doomed.reduce((sum, id) => sum + childrenOf(doc, id).length, 0);
    const first = doomed[0] ? doc.topics[doomed[0]] : undefined;
    const parent = first?.parentId ? doc.topics[first.parentId] : undefined;
    return {
      count: doomed.length,
      withKids: withKids.length,
      below,
      direct,
      name: nameOf(first?.title),
      parent: nameOf(parent?.title),
    };
  }, []);

  const one = info.count === 1;
  const choose = (id: 'topic.deleteKeep' | 'topic.deleteBranch') => {
    root.current?.closest('dialog')?.close();
    closeDialog();
    executeCommand(id, appContext);
    focusCanvas();
  };

  return (
    <Dialog title={one ? `Delete “${info.name}”?` : `Delete ${info.count} topics?`}>
      <div ref={root} className="dialog-body confirm-delete">
        <p>
          {one
            ? `“${info.name}” has ${plural(info.below, 'topic')} below it.`
            : `${info.withKids} of the ${info.count} selected topics have sub-topics (${plural(info.below, 'topic')} below them in all).`}
        </p>
        <div className="confirm-choices">
          <button
            type="button"
            className="confirm-choice"
            // The native dialog focuses its `autofocus` element when it opens. The safer choice goes first.
            ref={(el) => el?.setAttribute('autofocus', '')}
            onClick={() => choose('topic.deleteKeep')}
          >
            <strong>Delete {one ? 'the topic only' : 'the topics only'}</strong>
            <span>
              {one
                ? `Its ${plural(info.direct, 'sub-topic')} move up to “${info.parent}”.`
                : `Their ${plural(info.direct, 'sub-topic')} move up one level.`}
            </span>
          </button>
          <button
            type="button"
            className="confirm-choice"
            data-danger=""
            onClick={() => choose('topic.deleteBranch')}
          >
            <strong>Delete the whole {one ? 'branch' : 'branches'}</strong>
            <span>
              {one
                ? `Removes “${info.name}” and all ${plural(info.below, 'topic')} below it.`
                : `Removes the ${info.count} topics and everything below them.`}
            </span>
          </button>
        </div>
        <div className="confirm-actions">
          <button type="button" onClick={() => root.current?.closest('dialog')?.close()}>
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  );
}
