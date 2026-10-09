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
  type Branch,
} from '../model';
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

/** Pastes inside the focused topic, or next to it with `asPeer`. */
export function pasteClipboard(ctx: CommandContext, data: DataTransfer, asPeer: boolean): boolean {
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
