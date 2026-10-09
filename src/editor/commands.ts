import type { StoreApi } from 'zustand/vanilla';
import type { ViewportState } from '../canvas/viewportStore';
import type { Layout } from '../layout';
import {
  ancestorsOf,
  createPeer,
  createSubTopic,
  deleteBranch,
  deleteNode,
  depthOf,
  duplicateBranch,
  foldToLevel,
  getTopic,
  childrenOf,
  hasChildren,
  insertBetween,
  moveSibling,
  movableRoots,
  setFolded,
  setTopicImage,
  setTopicReference,
  siblingsOf,
  subtreeOf,
  unfoldAll,
  type CanopyMap,
  type TopicId,
} from '../model';
import type { CanopyStore } from '../store';
import type { DialogName } from '../ui/uiStore';
import { navigate, type Arrow } from './navigation';
import type { CommandId } from './shortcuts';

export interface CommandContext {
  store: CanopyStore;
  viewport: StoreApi<ViewportState>;
  getLayout: () => Layout | null;
  announce: (message: string) => void;
  /** Lets keyboard users leave the map, since Tab is taken by "add sub-topic". */
  releaseFocus: () => void;
  /** Shows a short message, optionally with a button. */
  notify?: (message: string, action?: { label: string; run: () => void }) => void;
  /** Dialogs and file actions, which live in the UI layer. */
  app?: {
    openDialog: (name: DialogName) => void;
    file: (action: 'new' | 'open' | 'save' | 'import') => void;
    /** Opens or closes the Inspector. With a tab, it opens there and focuses its first field. */
    inspector: (tab?: 'note' | 'stickers' | 'properties') => void;
    /** Asks whether to delete the selected topics with everything below them, or only the topics. */
    confirmDelete: () => void;
    /** Types a description for the picture on a topic. */
    editImageAlt: (id: string) => void;
    /** Types a label on the line from a topic to its parent. */
    editEdge: (id: string) => void;
    /** Opens the details panel on the line above a topic and puts the cursor in its label field. */
    labelEdge: (id: string) => void;
    /** Opens the Stickers tab aimed at the line above a topic. */
    stickEdge: (id: string) => void;
    quickAdd: (preset: 'all' | 'status' | 'due' | 'tag') => void;
    filter: (action: 'next' | 'prev' | 'off') => void;
    /** Opens the search. With a source ID, it picks the target of that topic's reference instead. */
    topicSearch: (sourceId?: string) => void;
    /** Brings back everything above a single-branch view. */
    unfoldParents: () => void;
    /** Shows or hides everything but the map. */
    zen: () => void;
    /** Shows the focused topic's branch alone, or the whole map again. */
    focusBranch: () => void;
    /** Chooses the pointer tool. */
    tool: (tool: 'select' | 'pan' | 'zoom') => void;
    /** Flips the Trail highlight, or turns the Trail on when Settings has it off. */
    trail: () => void;
  };
}

export interface KeyInfo {
  key: string;
  shiftKey?: boolean;
}

const nameOf = (map: CanopyMap, id: TopicId) => map.topics[id]?.title.trim() || 'Empty topic';
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Drops topics whose ancestor is also in the list, so each branch is handled once. */
export function topLevel(map: CanopyMap, ids: readonly TopicId[]): TopicId[] {
  const set = new Set(ids);
  return ids.filter((id) => !ancestorsOf(map, id).some((a) => set.has(a.id)));
}

/** The topic to land on after `doomed` branches are removed, starting from `focus`. */
export function survivorAfterDelete(map: CanopyMap, doomed: ReadonlySet<TopicId>, focus: TopicId) {
  const path = [...ancestorsOf(map, focus).reverse(), getTopic(map, focus)];
  const top = path.find((t) => doomed.has(t.id));
  if (!top) return focus;
  const siblings = siblingsOf(map, top.id);
  const at = siblings.findIndex((t) => t.id === top.id);
  const candidates = [...siblings.slice(at + 1), ...siblings.slice(0, at).reverse()];
  return candidates.find((t) => !doomed.has(t.id))?.id ?? top.parentId ?? map.coreId;
}

/** The topic that stands in for `id` on screen: the outermost folded ancestor, if any. */
export function nearestVisible(map: CanopyMap, id: TopicId): TopicId {
  const path = [...ancestorsOf(map, id).reverse()];
  return path.find((t) => t.folded)?.id ?? id;
}

function visibleSelection(map: CanopyMap, ids: readonly TopicId[]): TopicId[] {
  return [...new Set(ids.map((id) => nearestVisible(map, id)))];
}

/** Removes the selected branches, never the Core. Returns how many branches went. */
export function removeSelection(ctx: CommandContext): number {
  const { doc, focus, selection, commit } = ctx.store.getState();
  const doomed = topLevel(
    doc,
    selection.filter((s) => s !== doc.coreId),
  );
  if (doomed.length === 0) return 0;
  const next = survivorAfterDelete(doc, new Set(doomed), focus);
  commit(doomed.reduce(deleteBranch, doc), { select: [next], focus: next });
  return doomed.length;
}

/**
 * Removes the selected topics but keeps what is below them: their sub-topics move up to the
 * parent, in the same place. Returns how many topics went and how many sub-topics moved up.
 */
export function removeKeepingSubTopics(ctx: CommandContext): { count: number; moved: number } {
  const { doc, focus, selection, commit } = ctx.store.getState();
  const ids = selection.filter((s) => s !== doc.coreId && doc.topics[s] !== undefined);
  if (ids.length === 0) return { count: 0, moved: 0 };
  // Deepest first, so a chain of selected topics lifts cleanly one level at a time.
  const ordered = [...ids].sort((a, b) => depthOf(doc, b) - depthOf(doc, a));
  let map = doc;
  const lifted = new Set<TopicId>();
  for (const id of ordered) {
    for (const kid of childrenOf(map, id)) lifted.add(kid.id);
    map = deleteNode(map, id);
  }
  const stay = [...lifted].filter((id) => map.topics[id] !== undefined);
  const next = stay.length > 0 ? stay : [survivorAfterDelete(doc, new Set(ids), focus)];
  commit(map, { select: next, focus: next[0] });
  return { count: ids.length, moved: stay.length };
}

const ARROWS: Record<string, Arrow> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/** Commands that need a picked topic. */
const actsOnTopic = (id: CommandId): boolean =>
  /^(topic|edge|props)\./.test(id) || id === 'note.open' || id === 'stickers.open';

/** Runs a command. Returns false when it does not apply, so the key can keep its default. */
export function executeCommand(id: CommandId, ctx: CommandContext, key?: KeyInfo): boolean {
  const { store, announce } = ctx;
  const state = store.getState();
  const { doc, focus, selection } = state;

  // After a click on empty canvas nothing is picked: keys that act on a topic do nothing, while
  // menus and the palette pick the remembered topic again.
  if (!state.picked) {
    if (actsOnTopic(id) && key) return false;
    if (actsOnTopic(id) || id === 'nav.arrow') state.select(selection, focus);
  }

  switch (id) {
    case 'topic.addChild': {
      const added = createSubTopic(doc, focus);
      state.commit(added.map, { select: [added.id], focus: added.id, edit: added.id });
      announce(`Added sub-topic to ${nameOf(doc, focus)}`);
      return true;
    }

    case 'topic.addPeerAfter':
    case 'topic.addPeerBefore': {
      if (getTopic(doc, focus).parentId === null) return executeCommand('topic.addChild', ctx);
      const placement = id === 'topic.addPeerAfter' ? 'after' : 'before';
      const added = createPeer(doc, focus, placement);
      state.commit(added.map, { select: [added.id], focus: added.id, edit: added.id });
      announce(`Added peer ${placement === 'after' ? 'below' : 'above'} ${nameOf(doc, focus)}`);
      return true;
    }

    case 'topic.wrap': {
      // The selected topics, or the focus alone, go down under a new topic that takes their place.
      const roots = movableRoots(doc, selection.length > 0 ? selection : [focus]);
      const parents = new Set(roots.map((id) => getTopic(doc, id).parentId));
      const parentId = [...parents][0];
      if (roots.length === 0 || parents.size !== 1 || !parentId) {
        announce(
          roots.length === 0
            ? 'The Core has no parent to insert a topic under'
            : 'Select topics that share a parent to insert a topic above them',
        );
        return true;
      }
      const added = insertBetween(doc, parentId, roots);
      state.commit(added.map, { select: [added.id], focus: added.id, edit: added.id });
      announce(`Added a topic above ${plural(roots.length, 'topic')}`);
      return true;
    }

    case 'topic.insertBelow': {
      const kids = childrenOf(doc, focus).map((t) => t.id);
      if (kids.length === 0) return executeCommand('topic.addChild', ctx);
      const added = insertBetween(doc, focus, kids);
      state.commit(added.map, { select: [added.id], focus: added.id, edit: added.id });
      announce(
        `Added a topic below ${nameOf(doc, focus)}, holding ${plural(kids.length, 'sub-topic')}`,
      );
      return true;
    }

    case 'topic.edit': {
      state.select([focus]);
      state.setEditing(focus);
      return true;
    }

    case 'topic.reference':
      ctx.app?.topicSearch(focus);
      return true;

    case 'topic.imageAlt':
      if (!doc.topics[focus]?.image) {
        announce('This topic has no picture');
        return true;
      }
      ctx.app?.editImageAlt(focus);
      return true;

    case 'topic.imageRemove':
      if (!doc.topics[focus]?.image) {
        announce('This topic has no picture');
        return true;
      }
      state.commit(setTopicImage(doc, focus, null));
      announce(`Removed the picture from ${nameOf(doc, focus)}`);
      return true;

    case 'topic.referenceRemove':
      state.commit(setTopicReference(doc, focus, null));
      announce(`Removed reference from ${nameOf(doc, focus)}`);
      return true;

    case 'topic.delete': {
      const doomed = topLevel(
        doc,
        selection.filter((s) => s !== doc.coreId),
      );
      if (doomed.length === 0) {
        announce('The Core cannot be deleted');
        return true;
      }
      // Topics with sub-topics need a choice: the whole branch, or only the topic.
      if (ctx.app && doomed.some((id) => hasChildren(doc, id))) {
        ctx.app.confirmDelete();
        return true;
      }
      return executeCommand('topic.deleteBranch', ctx);
    }

    case 'topic.deleteKeep': {
      const { count, moved } = removeKeepingSubTopics(ctx);
      if (count === 0) {
        announce('The Core cannot be deleted');
        return true;
      }
      const message =
        `Deleted ${plural(count, 'topic')}` +
        (moved > 0 ? `, and moved ${plural(moved, 'sub-topic')} up` : '');
      announce(`${message}. Press undo to restore.`);
      ctx.notify?.(message, { label: 'Undo', run: () => store.getState().undo() });
      return true;
    }

    case 'topic.deleteBranch': {
      const count = removeSelection(ctx);
      if (count === 0) {
        announce('The Core cannot be deleted');
        return true;
      }
      const message = `Deleted ${plural(count, 'branch')}`;
      announce(`${message}. Press undo to restore.`);
      ctx.notify?.(message, { label: 'Undo', run: () => store.getState().undo() });
      return true;
    }

    case 'topic.duplicate': {
      const sources = topLevel(
        doc,
        selection.filter((s) => s !== doc.coreId),
      );
      if (sources.length === 0) return true;
      let map = doc;
      const copies: TopicId[] = [];
      for (const source of sources) {
        const copy = duplicateBranch(map, source);
        map = copy.map;
        copies.push(copy.id);
      }
      state.commit(map, { select: copies, focus: copies[copies.length - 1] });
      announce(`Duplicated ${plural(copies.length, 'branch')}`);
      return true;
    }

    case 'topic.toggleFold': {
      const targets = topLevel(doc, selection).filter((t) => hasChildren(doc, t));
      if (targets.length === 0) {
        announce(`${nameOf(doc, focus)} has no sub-topics`);
        return true;
      }
      const pivot = targets.includes(focus) ? focus : (targets[0] ?? focus);
      const fold = !getTopic(doc, pivot).folded;
      const map = targets.reduce((m, t) => setFolded(m, t, fold), doc);
      state.commit(map, { select: visibleSelection(map, selection) });
      const hidden = subtreeOf(doc, pivot).length - 1;
      announce(
        fold
          ? `Folded ${nameOf(doc, pivot)}, ${plural(hidden, 'topic')} hidden`
          : `Unfolded ${nameOf(doc, pivot)}`,
      );
      return true;
    }

    case 'topic.reorder': {
      const flow = doc.prefs.flow;
      const back = flow === 'right' ? 'ArrowUp' : 'ArrowLeft';
      const forward = flow === 'right' ? 'ArrowDown' : 'ArrowRight';
      const delta = key?.key === back ? -1 : key?.key === forward ? 1 : 0;
      if (delta === 0) return true;
      const map = moveSibling(doc, focus, delta);
      if (map === doc) {
        announce(delta < 0 ? 'Already first' : 'Already last');
        return true;
      }
      state.commit(map);
      const peers = siblingsOf(map, focus);
      const position = peers.findIndex((t) => t.id === focus) + 1;
      announce(`Moved ${nameOf(map, focus)} to position ${position} of ${peers.length}`);
      return true;
    }

    case 'nav.arrow': {
      const arrow = key ? ARROWS[key.key] : undefined;
      const layout = ctx.getLayout();
      if (!arrow || !layout) return false;
      const move = navigate(doc, layout, focus, arrow);
      if (!move) return true;
      if (move.type === 'unfold') {
        state.commit(setFolded(doc, focus, false));
        announce(`Unfolded ${nameOf(doc, focus)}`);
      } else if (key?.shiftKey) {
        state.select([...selection.filter((s) => s !== move.id), move.id], move.id);
      } else {
        state.select([move.id], move.id);
      }
      return true;
    }

    case 'select.all': {
      const layout = ctx.getLayout();
      const ids = subtreeOf(doc, focus)
        .map((t) => t.id)
        .filter((t) => !layout || layout.boxes.has(t));
      state.select(ids, focus);
      announce(`${plural(ids.length, 'topic')} selected`);
      return true;
    }

    case 'select.escape': {
      if (state.editing) state.cancelEdit();
      else if (selection.length > 1) state.select([focus]);
      else {
        ctx.releaseFocus();
        announce('Left the map. Tab moves to the next control.');
      }
      return true;
    }

    case 'edit.undo': {
      if (state.past.length === 0) announce('Nothing to undo');
      else {
        state.undo();
        announce('Undid last change');
      }
      return true;
    }

    case 'edit.redo': {
      if (state.future.length === 0) announce('Nothing to redo');
      else {
        state.redo();
        announce('Redid change');
      }
      return true;
    }

    case 'view.foldToLevel': {
      const level = Number(key?.key);
      if (!Number.isInteger(level) || level < 1) return false;
      const map = foldToLevel(doc, level);
      state.commit(map, { select: visibleSelection(map, selection) });
      announce(`Showing ${plural(level, 'level')}`);
      return true;
    }

    case 'view.unfoldAll': {
      state.commit(unfoldAll(doc));
      ctx.app?.unfoldParents();
      // Once the map has laid itself out again, bring all of it into view.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const layout = ctx.getLayout();
          if (layout) ctx.viewport.getState().fit(layout.bounds);
        }),
      );
      announce('Everything unfolded');
      return true;
    }

    case 'view.zoomIn':
      ctx.viewport.getState().zoom(1.2);
      return true;

    case 'view.zoomOut':
      ctx.viewport.getState().zoom(1 / 1.2);
      return true;

    case 'view.focusBranch':
      ctx.app?.focusBranch();
      return true;

    case 'view.toolSelect':
      ctx.app?.tool('select');
      return true;

    case 'view.toolPan':
      ctx.app?.tool('pan');
      return true;

    case 'view.toolZoom':
      ctx.app?.tool('zoom');
      return true;

    case 'view.trail':
      ctx.app?.trail();
      return true;

    case 'view.zen':
      ctx.app?.zen();
      return true;

    case 'help.shortcuts':
      ctx.app?.openDialog('shortcuts');
      return true;

    case 'palette.open':
      ctx.app?.openDialog('palette');
      return true;

    case 'prefs.open':
      ctx.app?.openDialog('preferences');
      return true;

    case 'inspector.toggle':
      ctx.app?.inspector();
      return true;

    case 'note.open':
      ctx.app?.inspector('note');
      return true;

    case 'stickers.open':
      ctx.app?.inspector('stickers');
      return true;

    case 'edge.label': {
      const focus = ctx.store.getState().focus;
      if (getTopic(ctx.store.getState().doc, focus).parentId === null) {
        ctx.announce('The core has no line to label');
        return true;
      }
      ctx.app?.editEdge(focus);
      return true;
    }

    case 'edge.sticker': {
      const focus = ctx.store.getState().focus;
      if (getTopic(ctx.store.getState().doc, focus).parentId === null) {
        ctx.announce('The core has no line to decorate');
        return true;
      }
      ctx.app?.stickEdge(focus);
      return true;
    }

    case 'props.open':
      ctx.app?.inspector('properties');
      return true;

    case 'props.quickAdd':
      ctx.app?.quickAdd('all');
      return true;

    case 'props.status':
      ctx.app?.quickAdd('status');
      return true;

    case 'props.due':
      ctx.app?.quickAdd('due');
      return true;

    case 'props.tag':
      ctx.app?.quickAdd('tag');
      return true;

    case 'filter.open':
      ctx.app?.topicSearch();
      return true;

    case 'filter.search':
      ctx.app?.topicSearch();
      return true;

    case 'filter.next':
      ctx.app?.filter('next');
      return true;

    case 'filter.prev':
      ctx.app?.filter('prev');
      return true;

    case 'filter.off':
      ctx.app?.filter('off');
      return true;

    case 'export.open':
      ctx.app?.openDialog('export');
      return true;

    case 'file.new':
      ctx.app?.file('new');
      return true;

    case 'file.open':
      ctx.app?.file('open');
      return true;

    case 'file.importBranch':
      ctx.app?.file('import');
      return true;

    case 'file.save':
      ctx.app?.file('save');
      return true;
  }
}
