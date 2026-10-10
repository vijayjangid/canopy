import { produce } from 'immer';
import { newId } from './ids';
import { keyBetween, spreadKeys } from './order';
import { childrenOf, getTopic, siblingsOf, subtreeOf } from './tree';
import { readExtras } from './sanitize';
import { ModelError, type CanopyMap, type Topic, type TopicExtras, type TopicId } from './types';

/** A copy of a branch, without IDs, so it can be pasted anywhere and in any map. */
export interface Branch {
  title: string;
  folded?: boolean;
  /** The note, stickers and properties travel with the topic. */
  extras?: TopicExtras;
  children: Branch[];
}

/** The optional parts of a topic, or undefined when it has none. */
function extrasOf(topic: Topic): TopicExtras | undefined {
  const extras: TopicExtras = {};
  if (topic.note) extras.note = topic.note;
  if (topic.stickers) extras.stickers = topic.stickers;
  if (topic.props) extras.props = topic.props;
  if (topic.edge) extras.edge = topic.edge;
  if (topic.references?.length) extras.references = [...topic.references];
  if (topic.image) extras.image = topic.image;
  return Object.keys(extras).length > 0 ? extras : undefined;
}

export const BRANCHES_MIME = 'application/x-canopy-branches+json';
const BRANCHES_FORMAT = 'canopy/branches/1';
const MAX_TITLE_LENGTH = 500;

const cleanTitle = (text: string) =>
  text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .trim()
    .slice(0, MAX_TITLE_LENGTH);

/** Branches for `ids` in document order. A topic inside another selected branch is not copied twice. */
export function copyBranches(map: CanopyMap, ids: readonly TopicId[]): Branch[] {
  const wanted = new Set(ids.filter((id) => map.topics[id]));
  const order = new Map<TopicId, number>();
  subtreeOf(map, map.coreId).forEach((t, i) => order.set(t.id, i));

  const roots: Topic[] = [];
  const stack: Topic[] = [getTopic(map, map.coreId)];
  // Walk from the Core so that selected branches come out in display order.
  while (stack.length > 0) {
    const topic = stack.pop();
    if (!topic) break;
    if (wanted.has(topic.id)) {
      roots.push(topic);
      continue;
    }
    const kids = childrenOf(map, topic.id);
    for (let i = kids.length - 1; i >= 0; i--) {
      const kid = kids[i];
      if (kid) stack.push(kid);
    }
  }
  roots.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return roots.map((root) => {
    const top: Branch = { title: root.title, children: [] };
    if (root.folded) top.folded = true;
    const rootExtras = extrasOf(root);
    if (rootExtras) top.extras = rootExtras;
    const work: Array<[Topic, Branch]> = [[root, top]];
    while (work.length > 0) {
      const item = work.pop();
      if (!item) break;
      const [topic, branch] = item;
      for (const kid of childrenOf(map, topic.id)) {
        const copy: Branch = { title: kid.title, children: [] };
        if (kid.folded) copy.folded = true;
        const kidExtras = extrasOf(kid);
        if (kidExtras) copy.extras = kidExtras;
        branch.children.push(copy);
        work.push([kid, copy]);
      }
    }
    return top;
  });
}

export function countBranches(branches: readonly Branch[]): number {
  let count = 0;
  const stack = [...branches];
  while (stack.length > 0) {
    const branch = stack.pop();
    if (!branch) break;
    count++;
    stack.push(...branch.children);
  }
  return count;
}

export function branchesToJson(branches: readonly Branch[]): string {
  return JSON.stringify({ format: BRANCHES_FORMAT, branches });
}

/** Reads what `branchesToJson` wrote. Returns null for anything else. */
export function branchesFromJson(text: string): Branch[] | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const { format, branches } = raw as { format?: unknown; branches?: unknown };
  if (format !== BRANCHES_FORMAT || !Array.isArray(branches)) return null;

  const read = (value: unknown): Branch | null => {
    if (typeof value !== 'object' || value === null) return null;
    const { title, folded, children, extras } = value as Record<string, unknown>;
    if (typeof title !== 'string' || !Array.isArray(children)) return null;
    const read =
      typeof extras === 'object' && extras !== null
        ? readExtras(extras as Record<string, unknown>, 'extras', () => {})
        : {};
    return {
      title: cleanTitle(title),
      ...(folded === true ? { folded: true } : {}),
      ...(Object.keys(read).length > 0 ? { extras: read } : {}),
      children: [],
    };
  };

  const roots: Branch[] = [];
  const work: Array<{ raw: unknown; into: Branch[] }> = [{ raw: branches, into: roots }];
  while (work.length > 0) {
    const item = work.pop();
    if (!item) break;
    const list = item.raw as unknown[];
    const made: Array<{ branch: Branch; raw: unknown }> = [];
    for (const entry of list) {
      const branch = read(entry);
      if (!branch) return null;
      item.into.push(branch);
      made.push({ branch, raw: entry });
    }
    for (const { branch, raw: entry } of made) {
      work.push({ raw: (entry as { children: unknown }).children, into: branch.children });
    }
  }
  return roots;
}

/** Indented bullet list, which most note and document apps understand. */
export function branchesToMarkdown(branches: readonly Branch[]): string {
  const lines: string[] = [];
  const stack: Array<{ branch: Branch; depth: number }> = [];
  for (let i = branches.length - 1; i >= 0; i--) {
    const branch = branches[i];
    if (branch) stack.push({ branch, depth: 0 });
  }
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) break;
    lines.push(`${'  '.repeat(item.depth)}- ${item.branch.title.replace(/\s*\n\s*/g, ' ')}`);
    for (let i = item.branch.children.length - 1; i >= 0; i--) {
      const child = item.branch.children[i];
      if (child) stack.push({ branch: child, depth: item.depth + 1 });
    }
  }
  return lines.join('\n');
}

const BULLET = /^(?:[-*+•]|\d+[.)]|#{1,6})\s+/;

/** Reads indented text, with or without bullet markers, into branches. */
export function branchesFromOutline(text: string): Branch[] {
  const roots: Branch[] = [];
  const open: Array<{ indent: number; branch: Branch }> = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const indent = (/^[ \t]*/.exec(line)?.[0] ?? '').replace(/\t/g, '    ').length;
    const title = cleanTitle(line.trim().replace(BULLET, ''));
    if (title === '') continue;
    const branch: Branch = { title, children: [] };
    while (open.length > 0 && (open[open.length - 1]?.indent ?? 0) >= indent) open.pop();
    const parent = open[open.length - 1];
    (parent ? parent.branch.children : roots).push(branch);
    open.push({ indent, branch });
  }
  return roots;
}

export type PasteTarget =
  { kind: 'child'; parentId: TopicId } | { kind: 'before' | 'after'; siblingId: TopicId };

/** Adds copies of `branches` with new IDs. Returns the new top-level topics, in order. */
export function pasteBranches(
  map: CanopyMap,
  branches: readonly Branch[],
  where: PasteTarget,
): { map: CanopyMap; ids: TopicId[] } {
  if (branches.length === 0) return { map, ids: [] };

  let parentId: TopicId;
  let previousKey: string | null;
  let nextKey: string | null;
  if (where.kind === 'child') {
    parentId = getTopic(map, where.parentId).id;
    previousKey = childrenOf(map, parentId).at(-1)?.orderKey ?? null;
    nextKey = null;
  } else {
    const sibling = getTopic(map, where.siblingId);
    if (sibling.parentId === null) throw new ModelError('CORE_IMMUTABLE', 'The Core has no peers');
    parentId = sibling.parentId;
    const peers = siblingsOf(map, sibling.id);
    const at = peers.findIndex((t) => t.id === sibling.id);
    previousKey = where.kind === 'after' ? sibling.orderKey : (peers[at - 1]?.orderKey ?? null);
    nextKey = where.kind === 'after' ? (peers[at + 1]?.orderKey ?? null) : sibling.orderKey;
  }

  const ids: TopicId[] = [];
  const next = produce(map, (draft) => {
    const work: Array<{ branch: Branch; id: TopicId; parentId: TopicId; orderKey: string }> = [];
    for (const branch of branches) {
      const orderKey = keyBetween(previousKey, nextKey);
      previousKey = orderKey;
      const id = newId();
      ids.push(id);
      work.push({ branch, id, parentId, orderKey });
    }
    while (work.length > 0) {
      const item = work.pop();
      if (!item) break;
      const extras = item.branch.extras;
      const transferableExtras = extras ? { ...extras } : undefined;
      if (transferableExtras?.references) {
        // A reference only comes along when its target is in this map.
        const kept = transferableExtras.references.filter((to) => map.topics[to]);
        if (kept.length > 0) transferableExtras.references = kept;
        else delete transferableExtras.references;
      }
      draft.topics[item.id] = {
        id: item.id,
        parentId: item.parentId,
        orderKey: item.orderKey,
        title: cleanTitle(item.branch.title),
        folded: item.branch.folded === true && item.branch.children.length > 0,
        ...transferableExtras,
      };
      const keys = spreadKeys(item.branch.children.length);
      item.branch.children.forEach((child, i) => {
        work.push({ branch: child, id: newId(), parentId: item.id, orderKey: keys[i] ?? 'V' });
      });
    }
    const parent = draft.topics[parentId];
    if (parent && where.kind === 'child') parent.folded = false;
  });
  return { map: next, ids };
}
