import {
  BRANCHES_MIME,
  branchesFromJson,
  branchesFromOutline,
  branchesToJson,
  branchesToMarkdown,
  copyBranches,
  countBranches,
  getTopic,
  pasteBranches,
  setTopicImage,
  type Branch,
} from '../model';
import { imageFromBlob } from './imageImport';
import { removeSelection, type CommandContext } from './commands';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What was copied last, so the menu can paste without asking the browser for clipboard access. */
let lastCopy: { text: string; json: string } | null = null;

/** Puts the selected branches on the clipboard as Canopy data and as a Markdown list. */
export function copySelection(ctx: CommandContext, data: DataTransfer, cut = false): boolean {
  const { doc, selection } = ctx.store.getState();
  const branches = copyBranches(doc, selection);
  if (branches.length === 0) return false;

  data.setData('text/plain', branchesToMarkdown(branches));
  data.setData(BRANCHES_MIME, branchesToJson(branches));
  lastCopy = { text: data.getData('text/plain'), json: data.getData(BRANCHES_MIME) };

  const count = countBranches(branches);
  if (cut && removeSelection(ctx) > 0) {
    ctx.announce(`Cut ${plural(count, 'topic')}. Paste to place them.`);
  } else {
    ctx.announce(`Copied ${plural(count, 'topic')}`);
  }
  return true;
}

/** What is on the clipboard: Canopy branches if present, otherwise text read as an outline. */
export function readClipboard(data: DataTransfer): Branch[] {
  const own = data.getData(BRANCHES_MIME);
  if (own) {
    const branches = branchesFromJson(own);
    if (branches) return branches;
  }
  return branchesFromOutline(data.getData('text/plain'));
}

/** The first picture on the clipboard, when what was copied is a picture and not text or topics. */
export function pastedImage(data: DataTransfer): Blob | null {
  if (data.getData(BRANCHES_MIME) || data.getData('text/plain').trim() !== '') return null;
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile();
  }
  return Array.from(data.files ?? []).find((f) => f.type.startsWith('image/')) ?? null;
}

/** Puts a picture on the focused topic. The topic grows to fit it, up to a fixed maximum. */
export async function pasteImage(ctx: CommandContext, blob: Blob, topicId?: string): Promise<void> {
  const focus = topicId ?? ctx.store.getState().focus;
  try {
    const image = await imageFromBlob(blob);
    const { doc, commit } = ctx.store.getState();
    // The topic may have been deleted while the picture was being read.
    if (!doc.topics[focus]) return;
    commit(setTopicImage(doc, focus, image));
    ctx.announce(`Added a picture to ${doc.topics[focus]?.title.trim() || 'the topic'}`);
  } catch (error) {
    ctx.notify?.(error instanceof Error ? error.message : 'That picture could not be pasted.');
  }
}

/** Pastes inside the focused topic, or next to it with `asPeer`. A pasted picture goes on the topic. */
export function pasteClipboard(ctx: CommandContext, data: DataTransfer, asPeer: boolean): boolean {
  const picture = pastedImage(data);
  if (picture) {
    void pasteImage(ctx, picture);
    return true;
  }
  const branches = readClipboard(data);
  if (branches.length === 0) return false;

  const { doc, focus, commit } = ctx.store.getState();
  const peers = asPeer && getTopic(doc, focus).parentId !== null;
  const { map, ids } = pasteBranches(
    doc,
    branches,
    peers ? { kind: 'after', siblingId: focus } : { kind: 'child', parentId: focus },
  );
  commit(map, { select: ids, focus: ids[ids.length - 1] });
  ctx.announce(`Pasted ${plural(countBranches(branches), 'topic')}`);
  return true;
}

/** Copy or cut from a menu, where there is no clipboard event to read from. */
export async function copyFromMenu(ctx: CommandContext, cut: boolean): Promise<void> {
  const data = new DataTransfer();
  if (!copySelection(ctx, data, cut)) return;
  try {
    await navigator.clipboard.writeText(data.getData('text/plain'));
  } catch {
    // Without clipboard access the copy still works inside Canopy.
  }
}

/** Paste from a menu. Uses the system clipboard when allowed, and the last copy otherwise. */
export async function pasteFromMenu(ctx: CommandContext, asPeer: boolean): Promise<void> {
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (type && !item.types.includes('text/plain')) {
        await pasteImage(ctx, await item.getType(type));
        return;
      }
    }
  } catch {
    // Reading pictures can be refused or unsupported. Text paste below still works.
  }
  let text = '';
  try {
    text = await navigator.clipboard.readText();
  } catch {
    // Reading can be refused. The last copy made here is used instead.
  }
  const data = new DataTransfer();
  if (lastCopy && (text === '' || text === lastCopy.text)) {
    data.setData('text/plain', lastCopy.text);
    data.setData(BRANCHES_MIME, lastCopy.json);
  } else {
    data.setData('text/plain', text);
  }
  if (!pasteClipboard(ctx, data, asPeer)) ctx.notify?.('There is nothing to paste.');
}
