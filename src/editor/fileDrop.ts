import {
  createSubTopic,
  graftMap,
  parseJson,
  setTopicImage,
  type CanopyMap,
  type TopicId,
  type TopicImage,
} from '../model';
import type { CommandContext } from './commands';
import { ImageTooLargeError, imageFromBlob } from './imageImport';

/** Largest map file taken in as a branch. Pictures inside a map make files big, so this is generous. */
export const MAX_MAP_FILE_BYTES = 40 * 1024 * 1024;

export type DropKind = 'image' | 'map' | 'other';

/** What a dropped file is, from its type and name. */
export function kindOfFile(file: { name: string; type: string }): DropKind {
  if (file.type.startsWith('image/')) return 'image';
  if (/\.json$/i.test(file.name) || file.type === 'application/json') return 'map';
  return 'other';
}

/** What the person is about to drop, said in a few words. Only the types are known mid-drag. */
export function describeDrop(types: readonly string[], target: string | null): string {
  const images = types.filter((t) => t.startsWith('image/')).length;
  const maps = types.length - images;
  const where = target ? `“${target.length > 24 ? `${target.slice(0, 23)}…` : target}”` : null;
  if (images > 0 && maps === 0) {
    return where ? `Add picture to ${where}` : 'Add picture as a new topic';
  }
  if (images === 0) {
    return where ? `Add map as a branch of ${where}` : 'Add map as a branch of the Core';
  }
  return where ? `Add to ${where}` : 'Add to the map';
}

type Loaded =
  | { name: string; kind: 'image'; image: TopicImage }
  | { name: string; kind: 'map'; map: CanopyMap }
  | { name: string; error: string };

async function load(file: File): Promise<Loaded> {
  const name = file.name || 'This file';
  const kind = kindOfFile(file);
  try {
    if (kind === 'image') return { name, kind, image: await imageFromBlob(file) };
    if (kind === 'map') {
      if (file.size > MAX_MAP_FILE_BYTES) return { name, error: 'is too large to add' };
      const result = parseJson(await file.text());
      if (!result.ok)
        return { name, error: `is not a Canopy map (${result.errors[0] ?? 'unreadable'})` };
      return { name, kind, map: result.map };
    }
  } catch (error) {
    return {
      name,
      error:
        error instanceof ImageTooLargeError
          ? 'is too large to keep in the map'
          : 'could not be read',
    };
  }
  return { name, error: 'is not a picture or a Canopy map' };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Adds dropped files to the map in one undo step.
 * - A picture dropped on a topic goes on that topic, and on the Core's new sub-topic when dropped
 *   on empty canvas. More pictures than the topic can hold become sub-topics of their own.
 * - A Canopy map file is added as a new branch under the topic (or the Core), whole.
 */
export async function addDroppedFiles(
  ctx: CommandContext,
  files: readonly File[],
  targetId: TopicId | null,
): Promise<void> {
  const loaded = await Promise.all(files.map(load));
  const problems = loaded.flatMap((l) => ('error' in l ? [`${l.name} ${l.error}`] : []));

  const { doc: start, commit } = ctx.store.getState();
  // The topic may have gone while the files were being read.
  const target = targetId && start.topics[targetId] ? targetId : null;
  const parent = target ?? start.coreId;

  let doc = start;
  let pictureOnTarget = false;
  const added: TopicId[] = [];
  let pictures = 0;
  let maps = 0;
  let topics = 0;
  for (const item of loaded) {
    if ('error' in item) continue;
    if (item.kind === 'image') {
      pictures++;
      if (target && !pictureOnTarget) {
        doc = setTopicImage(doc, target, item.image);
        pictureOnTarget = true;
        continue;
      }
      const made = createSubTopic(doc, parent);
      doc = setTopicImage(made.map, made.id, item.image);
      added.push(made.id);
    } else {
      const grafted = graftMap(doc, parent, item.map);
      doc = grafted.map;
      added.push(grafted.id);
      maps++;
      topics += grafted.count;
    }
  }

  if (doc !== start) {
    const select = added.length > 0 ? added : target ? [target] : [];
    commit(doc, select.length > 0 ? { select, focus: select[select.length - 1] } : {});
    const parts = [
      pictures > 0 ? plural(pictures, 'picture') : '',
      maps > 0 ? `${plural(maps, 'map')} (${plural(topics, 'topic')})` : '',
    ].filter(Boolean);
    const name = target ? start.topics[target]?.title.trim() || 'the topic' : 'the Core';
    ctx.announce(`Added ${parts.join(' and ')} to ${name}`);
  }
  if (problems.length > 0) {
    const first = problems[0] ?? '';
    const more = problems.length > 1 ? ` (and ${problems.length - 1} more)` : '';
    ctx.notify?.(`${first}${more}`);
    ctx.announce(`${first}${more}`);
  }
}
